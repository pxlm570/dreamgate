/**
 * 种子梦境图预生成脚本（可选 · 用 OpenAI 兼容图像 API 生成 5 张高清种子图）
 *
 * 目的：让演示画廊的门上是「真正精美的梦境画」而非 SVG 占位图，且零运行时成本
 * （只在本地用 Key 跑一次，把结果打包进 public/）。含重试 / 跳过已存在 / 请求节流，
 * 以应对中转站的 524 超时。
 *
 * 用法：
 *   OPENAI_API_KEY=sk-... OPENAI_BASE_URL=https://www.bytecatcode.org \
 *   OPENAI_IMAGE_MODEL=gpt-image-2 node scripts/gen-seed-images.mjs
 *
 * 生成到 public/seeds-gen/seed-N.png，并打印需写回 src/data/seedDreams.ts 的 imageUrl 映射。
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
if (!KEY) {
  console.error("缺少 OPENAI_API_KEY。用法：OPENAI_API_KEY=sk-... node scripts/gen-seed-images.mjs");
  process.exit(1);
}

mkdirSync("public/seeds-gen", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 画风对标《光与影：33号远征队》(Clair Obscur: Expedition 33)：
// 故事发生在「画中世界」，与本项目"画即世界"同构——Belle Époque 暗黑幻想油画质感
const PAINT_STYLE =
  "in the style of a Belle Époque dark-fantasy oil painting, painterly impasto brushstrokes, " +
  "visible canvas texture, dramatic chiaroscuro lighting, romantic and melancholic, " +
  "rich muted palette with luminous accents, fine art masterpiece";

const STYLE = {
  Ethereal: "ethereal dreamscape, soft lavender and pale-violet palette, luminous drifting mist, delicate, otherworldly",
  "Dark Fantasy": "dark fantasy dreamscape, deep crimson and violet shadows, moody, cinematic, mysterious",
  Mystical: "mystical dreamscape, deep purple and teal glow, arcane, ethereal fog",
  Psychedelic: "psychedelic dreamscape, vivid flowing gradients, surreal",
};

const DREAMS = [
  { id: "seed-1", preset: "Dark Fantasy", scene: "a vast dark ocean at night, ink-blue water slowly rising, sand washing away underfoot, a distant lighthouse flickering, a lone figure unable to move" },
  { id: "seed-2", preset: "Ethereal", scene: "heavy rain on an unfamiliar street at night, a figure running for shelter, all doors closed, one open door leading into an endless corridor" },
  { id: "seed-3", preset: "Mystical", scene: "water seeping through the cracks of a dim room's floor, slowly flooding, quiet helplessness, faint reflections on the rising water" },
  { id: "seed-4", preset: "Ethereal", scene: "a person floating and flying freely above a glittering night city, wind and weightless lightness, a feeling of liberation" },
  { id: "seed-5", preset: "Dark Fantasy", scene: "falling from a tall tower as the staircase vanishes, rushing wind, grasping at nothing, vertigo, the moment before impact" },
];

async function tryGen(d) {
  const prompt = `${d.scene}. ${STYLE[d.preset]}. ${PAINT_STYLE}. surreal dream, atmospheric, no text, no words.`;
  const res = await fetch(`${BASE}/v1/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt, size: "1024x1024", n: 1 }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => "")).slice(0, 100)}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  if (b64) return Buffer.from(b64, "base64");
  if (url) return Buffer.from(await (await fetch(url)).arrayBuffer());
  throw new Error("上游未返回图像");
}

async function genOne(d) {
  const out = join("public", "seeds-gen", `${d.id}.png`);
  if (existsSync(out)) {
    console.log(`  · ${d.id} 已存在，跳过`);
    return `/seeds-gen/${d.id}.png`;
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      writeFileSync(out, await tryGen(d));
      console.log(`  ✓ ${d.id} → public/seeds-gen/${d.id}.png`);
      return `/seeds-gen/${d.id}.png`;
    } catch (e) {
      console.error(`  ✗ ${d.id} 第 ${attempt}/4 次失败: ${String(e.message || e).slice(0, 100)}`);
      if (attempt < 4) await sleep(10000);
    }
  }
  return null;
}

console.log(`用 ${MODEL} @ ${BASE} 生成 ${DREAMS.length} 张种子梦境图 → public/seeds-gen/`);
const map = {};
for (const d of DREAMS) {
  const p = await genOne(d);
  if (p) map[d.id] = p;
  await sleep(5000); // 节流，避开中转站 524
}
console.log("\n完成。把 src/data/seedDreams.ts 中对应 dream 的 artifact.imageUrl 改为：");
for (const [id, p] of Object.entries(map)) console.log(`  ${id}: '${p}'`);
console.log("\n（未生成成功的条目保留原 SVG 种子图兜底，不影响演示。）");
