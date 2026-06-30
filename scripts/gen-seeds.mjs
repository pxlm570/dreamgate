/**
 * DreamGate 种子占位图生成器（Task 10 v3 / Workstream A）
 *
 * 参数化生成 4 预设 × 5 情绪键 = 20 张 SVG 占位图到 public/seeds/。
 * 每张 SVG 为 1024×1024，包含：深色底 + 预设主色径向辉光 +
 * 2 辅色 + 1 情绪色模糊 orb + feTurbulence 颗粒层 + 径向暗角。
 * orb 位置由 (presetIdx, emotionIdx) 确定性公式决定，每张独特但风格一致、可复现。
 *
 * 用法：node scripts/gen-seeds.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// v3 #4：首行即确保输出目录存在
mkdirSync('public/seeds', { recursive: true });

/** 4 个预设：底色 / 辅色列表 / 主色 */
const PRESETS = [
  { slug: 'ethereal', base: '#0a0a14', aux: ['#C9B8E8', '#E8E0F5'], main: '#C9B8E8' },
  { slug: 'dark-fantasy', base: '#0d0608', aux: ['#EF476F', '#6A0572'], main: '#EF476F' },
  { slug: 'mystical', base: '#0a0814', aux: ['#5A189A', '#9D4EDD'], main: '#5A189A' },
  { slug: 'psychedelic', base: '#0a0a0f', aux: ['#FFD166', '#06D6A0'], main: '#FFD166' },
];

/** 5 个情绪键 + orb 色 */
const EMOTIONS = [
  { key: 'excited', color: '#FFD166' },
  { key: 'anxious', color: '#EF476F' },
  { key: 'tender', color: '#FFAFCC' },
  { key: 'sad', color: '#4A90E2' },
  { key: 'ethereal', color: '#C9B8E8' },
];

const DIM = 1024;

/**
 * 确定性坐标：把 (presetIdx, emotionIdx, salt) 映射到 [min, max] 区间。
 * 用质数乘子避免线性相关，保证每张独特但可复现。
 */
function detCoord(p, e, salt, min, max) {
  const raw = (p * 137 + e * 89 + salt * 211) % 1000;
  return min + Math.floor((raw / 1000) * (max - min));
}

/** 确定性半径 */
function detRadius(p, e, salt, base, range) {
  const raw = (p * 53 + e * 71 + salt * 97) % range;
  return base + raw;
}

/** 生成单张 SVG 字符串 */
function generateSVG(presetIdx, emotionIdx) {
  const preset = PRESETS[presetIdx];
  const emotion = EMOTIONS[emotionIdx];
  const p = presetIdx;
  const e = emotionIdx;

  // 主色径向辉光中心（在画布中心附近小幅偏移）
  const mainCx = detCoord(p, e, 0, 360, 664);
  const mainCy = detCoord(p, e, 1, 360, 664);

  // 3 个 orb：2 辅色 + 1 情绪色（salt = 2,3,4）
  const orbs = [
    {
      cx: detCoord(p, e, 2, 180, 844),
      cy: detCoord(p, e, 3, 180, 844),
      r: detRadius(p, e, 2, 260, 140),
      color: preset.aux[0],
    },
    {
      cx: detCoord(p, e, 4, 180, 844),
      cy: detCoord(p, e, 5, 180, 844),
      r: detRadius(p, e, 4, 240, 150),
      color: preset.aux[1],
    },
    {
      cx: detCoord(p, e, 6, 180, 844),
      cy: detCoord(p, e, 7, 180, 844),
      r: detRadius(p, e, 6, 220, 160),
      color: emotion.color,
    },
  ];

  // 用 SVG 百分比表达主色辉光中心（相对 1024 画布）
  const mainCxPct = ((mainCx / DIM) * 100).toFixed(2);
  const mainCyPct = ((mainCy / DIM) * 100).toFixed(2);

  const orbsXml = orbs
    .map(
      (o) =>
        `    <circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${o.color}" filter="url(#orbBlur)" opacity="0.55"/>`,
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="mainGlow" cx="${mainCxPct}%" cy="${mainCyPct}%" r="70%">
      <stop offset="0%" stop-color="${preset.main}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${preset.main}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${preset.main}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.85"/>
    </radialGradient>
    <filter id="orbBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="80"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
    </filter>
  </defs>
  <!-- 1. 深色底 -->
  <rect width="1024" height="1024" fill="${preset.base}"/>
  <!-- 2. 预设主色大径向辉光铺底 -->
  <rect width="1024" height="1024" fill="url(#mainGlow)"/>
  <!-- 3. 2 辅色 + 1 情绪色 模糊 orb -->
${orbsXml}
  <!-- 4. feTurbulence 颗粒层（~8% 不透明度） -->
  <rect width="1024" height="1024" filter="url(#grain)" opacity="0.08"/>
  <!-- 5. 径向暗角 vignette -->
  <rect width="1024" height="1024" fill="url(#vignette)"/>
</svg>
`;
}

// 生成 4 × 5 = 20 张
const generated = [];
for (let p = 0; p < PRESETS.length; p++) {
  for (let e = 0; e < EMOTIONS.length; e++) {
    const slug = PRESETS[p].slug;
    const key = EMOTIONS[e].key;
    const filename = `${slug}-${key}.svg`;
    const svg = generateSVG(p, e);
    const outPath = join('public', 'seeds', filename);
    writeFileSync(outPath, svg, 'utf8');
    generated.push(filename);
  }
}

// 末尾打印生成清单以供验证
console.log(`已生成 ${generated.length} 张 SVG 种子占位图到 public/seeds/：`);
for (const name of generated) {
  console.log(`  - ${name}`);
}
