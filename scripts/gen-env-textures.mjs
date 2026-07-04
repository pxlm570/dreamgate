/**
 * 环境实体纹理生成脚本（画廊/门厅实体化 · 简化版烘焙光思路）
 *
 * 用 gpt-image 生成「可平铺的实体材质」：深色美术馆墙面、深色木地板。
 * 光影/质感直接画进贴图 = 零运行时光照成本的「实体感」。
 * 生成到 public/textures/，three.js 里用 MirroredRepeatWrapping 平铺（镜像平铺可掩盖接缝）。
 *
 * 用法：node scripts/gen-env-textures.mjs   （自动读取 .env 的 OPENAI_* 配置）
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 手动解析 .env（node 不自动加载）
function loadDotEnv() {
  try {
    const txt = readFileSync(".env", "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 无 .env 则仅用进程环境 */
  }
}
loadDotEnv();

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
if (!KEY) {
  console.error("缺少 OPENAI_API_KEY（.env 或环境变量）");
  process.exit(1);
}

mkdirSync("public/textures", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEXTURES = [
  {
    name: "wall",
    prompt:
      "seamless tileable texture, dark charcoal museum gallery wall, fine plaster surface with subtle mottling, very dark moody near-black with a faint deep-violet undertone, soft even ambient lighting baked in, no objects, no fixtures, no seams, flat frontal view, texture only",
  },
  {
    name: "floor",
    prompt:
      "seamless tileable texture, dark walnut wood floor planks viewed from directly above, very dark moody brown-black wood grain with subtle satin sheen, soft ambient lighting baked in, no objects, no seams, top-down flat view, texture only",
  },
];

async function tryGen(t) {
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: t.prompt, size: "1024x1024", n: 1 }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => "")).slice(0, 100)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  if (b64) return Buffer.from(b64, "base64");
  if (url) return Buffer.from(await (await fetch(url)).arrayBuffer());
  throw new Error("上游未返回图像");
}

console.log(`用 ${MODEL} @ ${BASE} 生成 ${TEXTURES.length} 张实体纹理 → public/textures/`);
for (const t of TEXTURES) {
  const out = join("public", "textures", `${t.name}.png`);
  if (existsSync(out)) {
    console.log(`  · ${t.name} 已存在，跳过`);
    continue;
  }
  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    try {
      writeFileSync(out, await tryGen(t));
      console.log(`  ✓ ${t.name} → ${out}`);
      ok = true;
    } catch (e) {
      console.error(`  ✗ ${t.name} 第 ${attempt}/4 次失败: ${String(e.message || e).slice(0, 90)}`);
      if (attempt < 4) await sleep(10000);
    }
  }
  await sleep(5000);
}
console.log("完成。");
