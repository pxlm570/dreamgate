/**
 * 场景氛围图生成脚本（画即世界 · 背景也交给 gpt-image）
 *
 * 程序化 canvas 渐变画不出「空气感」——大平面渐变必然读成塑料布。
 * 用 gpt-image 生成两张氛围图：
 *   gate-backdrop  首页镜之门身后的梦境天幕（matte painting 风格）
 *   corridor-mist  画廊走廊尽头的发光迷雾（光之隧道最远层）
 * 生成到 public/textures/，前端 useOptionalTexture 加载、缺图回退程序化贴图。
 *
 * 用法：node scripts/gen-scene-textures.mjs   （自动读取 .env 的 OPENAI_* 配置）
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
    name: "mirror-frame",
    size: "1024x1536",
    prompt:
      "elegant antique standing mirror frame, weathered dark bronze with delicate refined engraved detailing along the moulding, moderately ornamented — graceful, not baroque, gentle pediment top, soft moonlit violet rim light catching the frame edges as if lit by a night sky, matte painterly finish consistent with a dark violet cloudscape matte painting, complete frame shown in full, rectangular opening, portrait orientation, photographed perfectly straight-on and centered, the opening inside the frame is pure solid black, the background outside the frame is pure solid black, no glass, no text",
  },
  {
    name: "mirror-dream",
    size: "1024x1536",
    prompt:
      "a dreamlike violet nebula dreamworld seen through a doorway: a luminous winding starlight path flowing through misty amethyst valleys toward a radiant spiral of light, floating spire islands in the distance, Belle Epoque dark fantasy oil painting style, painterly, full-bleed composition reaching every edge of the image, no frame, no arch, no border, no pillars, no vignette edges, no text",
  },
  {
    name: "cloud-bank",
    size: "1536x1024",
    prompt:
      "massive dark violet storm cloud bank emerging from a pure black background, painterly matte painting, moonlit silver-violet edges on the cloud tops, deep shadow cores, dramatic and quiet, the clouds occupy the lower two thirds, pure black elsewhere, no objects, no text",
  },
  {
    name: "frame-simple",
    size: "1024x1536",
    prompt:
      "minimalist dark walnut wood gallery picture frame, slim straight profile, one thin subtle antique gold inner lip line, elegant and understated museum framing, complete rectangular frame shown in full, frame border occupies about 8 percent of the image width on each side, portrait orientation, photographed perfectly straight-on and centered, the opening inside the frame is pure solid black, the background outside the frame is pure solid black, no carving, no ornament, no reflection, no text",
  },
  {
    name: "ceiling-coffer",
    size: "1024x1024",
    prompt:
      "seamless tileable texture of a dark Belle Epoque coffered ceiling viewed from directly below, deep charcoal-violet wooden coffers in a regular grid, faint aged gold trim lines catching dim light, painterly oil texture, baked soft ambient lighting, near-black overall, muted, elegant, no chandelier, no objects, no text, flat view, texture only",
  },
  {
    name: "floor-parquet",
    size: "1024x1024",
    prompt:
      "seamless tileable texture of dark herringbone parquet wood floor viewed from directly above, very dark espresso brown-black oak with subtle grain, painterly oil texture with faint visible brushwork, soft satin sheen baked in, Belle Epoque interior floor, muted, elegant, near-black, no objects, no text, flat top-down view, texture only",
  },
  {
    name: "wall-panel",
    size: "1536x1024",
    prompt:
      "seamless tileable texture of a dark Belle Epoque art gallery wall with classical recessed panel moulding, two tall elegant rectangular panels side by side, very dark charcoal-violet painted wood panelling, painterly oil texture with subtle visible brushwork, soft baked ambient lighting from above, faint warm highlights catching the moulding edges, near-black overall, muted, quiet, refined, no objects, no frames, no text, flat frontal view, texture only",
  },
  {
    name: "gate-backdrop",
    size: "1536x1024",
    prompt:
      "vast dark dreamscape matte painting backdrop, deep violet indigo night filled with soft painterly mist, faint nebula clouds barely emerging from darkness, a subtle cool teal-violet glow low near the horizon, edges and corners fade to near-black, extremely dark moody cinematic atmosphere, soft diffused volumetric light, no objects, no figures, no ground details, no text, subtle film grain, ethereal and quiet",
  },
  {
    name: "corridor-mist",
    size: "1024x1024",
    prompt:
      "soft luminous mist glowing gently in the center of darkness, deep violet and lavender light diffusing outward and dissolving into near-black, dreamy ethereal fog like a distant threshold of light, painterly matte painting style, extremely dark edges fading fully to black, no objects, no figures, no text, subtle film grain",
  },
];

async function tryGen(t) {
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: t.prompt, size: t.size, n: 1 }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => "")).slice(0, 100)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  if (b64) return Buffer.from(b64, "base64");
  if (url) return Buffer.from(await (await fetch(url)).arrayBuffer());
  throw new Error("上游未返回图像");
}

console.log(`用 ${MODEL} @ ${BASE} 生成 ${TEXTURES.length} 张氛围图 → public/textures/`);
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
