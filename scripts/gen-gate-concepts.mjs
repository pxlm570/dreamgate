/**
 * 首页镜之门 · 美术定稿概念图（美术定稿工作流第一步）
 *
 * 一次生成 3 个方向的「完成态定稿」，用户拍板后照稿还原——
 * 反馈循环从「感觉不对再调」变成「和定稿比差在哪」。
 * 输出到 docs/concepts/（文档资产，不进 public 运行时包）。
 *
 * 用法：node scripts/gen-gate-concepts.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadDotEnv() {
  try {
    const txt = readFileSync(".env", "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* noop */
  }
}
loadDotEnv();

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
if (!KEY) {
  console.error("缺少 OPENAI_API_KEY");
  process.exit(1);
}

mkdirSync("docs/concepts", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SHARED =
  "a tall vertical ornate mirror-portal glowing with a dreamlike violet nebula landscape inside, " +
  "Belle Epoque dark fantasy oil painting style, painterly, dramatic chiaroscuro, cinematic wide composition, " +
  "extremely dark moody atmosphere with luminous accents, no text, no UI, no watermark";

const CONCEPTS = [
  {
    name: "gate-concept-a-water",
    prompt:
      `Concept A "镜湖": ${SHARED}. The mirror stands alone on a vast still black water surface that perfectly ` +
      "reflects it and a sky of faint stars, thin mist drifting over the water, a single small human silhouette " +
      "standing before the mirror showing its colossal scale, deep violet night",
  },
  {
    name: "gate-concept-b-hall",
    prompt:
      `Concept B "画framed大厅": ${SHARED}. The mirror hangs at the end of a grand dark Belle Epoque gallery hall, ` +
      "tall dark wood panelled walls and coffered ceiling receding in perspective, pale moonlight shafts falling " +
      "from high windows onto a polished dark parquet floor, the glowing mirror is the only bright thing",
  },
  {
    name: "gate-concept-c-clouds",
    prompt:
      `Concept C "云上之门": ${SHARED}. The mirror stands upon an endless sea of dark night clouds, ` +
      "aurora-like violet and teal nebula ribbons across the sky above, moonlit cloud tops rolling like waves, " +
      "utterly open and vast, romantic and sublime",
  },
];

async function gen(c) {
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: c.prompt, size: "1536x1024", n: 1 }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => "")).slice(0, 100)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  if (b64) return Buffer.from(b64, "base64");
  if (url) return Buffer.from(await (await fetch(url)).arrayBuffer());
  throw new Error("上游未返回图像");
}

console.log(`用 ${MODEL} 生成 ${CONCEPTS.length} 张首页定稿概念图 → docs/concepts/`);
for (const c of CONCEPTS) {
  const out = join("docs", "concepts", `${c.name}.png`);
  if (existsSync(out)) {
    console.log(`  · ${c.name} 已存在，跳过`);
    continue;
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      writeFileSync(out, await gen(c));
      console.log(`  ✓ ${c.name}`);
      break;
    } catch (e) {
      console.error(`  ✗ ${c.name} ${attempt}/4: ${String(e.message || e).slice(0, 90)}`);
      if (attempt < 4) await sleep(10000);
    }
  }
  await sleep(5000);
}
console.log("完成。");
