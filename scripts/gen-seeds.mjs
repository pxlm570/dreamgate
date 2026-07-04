/**
 * DreamGate 种子占位图生成器（v2 · 更通透有层次的梦境氛围图）
 *
 * 参数化生成 4 预设 × 5 情绪键 = 20 张 SVG 占位图到 public/seeds/。
 * 每张 1024×1024，分层：深色底 + 顶部主色渐晕（光从上方）+ 主色/情绪色双径向辉光 +
 * 4 个柔和 orb（预设辅色/情绪色/主色）+ 5 颗微光星点 + 顶部柔光 + feTurbulence 细颗粒 + 柔和暗角。
 * 所有位置由 (presetIdx, emotionIdx, salt) 质数公式确定 —— 每张独特、风格一致、可复现。
 * 门面板以 emissiveMap 自发光渲染，故图越通透有光，门越美。
 *
 * 用法：node scripts/gen-seeds.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync('public/seeds', { recursive: true });

/** 4 个预设：底色 / 辅色列表 / 主色 */
const PRESETS = [
  { slug: 'ethereal', base: '#0a0a16', aux: ['#C9B8E8', '#E8E0F5'], main: '#C9B8E8' },
  { slug: 'dark-fantasy', base: '#0d0609', aux: ['#EF476F', '#6A0572'], main: '#EF476F' },
  { slug: 'mystical', base: '#0a0816', aux: ['#7B2FBE', '#9D4EDD'], main: '#7B2FBE' },
  { slug: 'psychedelic', base: '#0b0a10', aux: ['#FFD166', '#06D6A0'], main: '#FF6B9D' },
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

/** 确定性整数 0..mod-1 */
function det(p, e, salt, mod) {
  return (p * 137 + e * 89 + salt * 211) % mod;
}
/** 确定性坐标映射到 [min, max] */
function detCoord(p, e, salt, min, max) {
  return min + Math.floor((det(p, e, salt, 1000) / 1000) * (max - min));
}
/** 确定性半径 */
function detRadius(p, e, salt, base, range) {
  return base + ((p * 53 + e * 71 + salt * 97) % range);
}
const pct = (v) => ((v / DIM) * 100).toFixed(2);

/** 生成单张 SVG 字符串 */
function generateSVG(presetIdx, emotionIdx) {
  const preset = PRESETS[presetIdx];
  const emotion = EMOTIONS[emotionIdx];
  const p = presetIdx;
  const e = emotionIdx;

  // 主色辉光（偏上，像光源）+ 情绪色辉光（偏下另一侧）
  const mainCx = detCoord(p, e, 0, 340, 684);
  const mainCy = detCoord(p, e, 1, 300, 540);
  const emoCx = detCoord(p, e, 8, 220, 804);
  const emoCy = detCoord(p, e, 9, 520, 840);

  // 4 个柔和 orb：辅色 ×2 + 情绪色 + 主色（最后一个较小较亮）
  const orbs = [
    { cx: detCoord(p, e, 2, 120, 904), cy: detCoord(p, e, 3, 120, 720), r: detRadius(p, e, 2, 300, 180), color: preset.aux[0], op: 0.5, blur: 'orbBlur' },
    { cx: detCoord(p, e, 4, 120, 904), cy: detCoord(p, e, 5, 220, 904), r: detRadius(p, e, 4, 260, 200), color: preset.aux[1], op: 0.42, blur: 'orbBlur' },
    { cx: detCoord(p, e, 6, 150, 874), cy: detCoord(p, e, 7, 150, 874), r: detRadius(p, e, 6, 220, 180), color: emotion.color, op: 0.5, blur: 'orbBlur' },
    { cx: detCoord(p, e, 10, 220, 804), cy: detCoord(p, e, 11, 160, 680), r: detRadius(p, e, 10, 150, 120), color: preset.main, op: 0.5, blur: 'softBlur' },
  ];

  // 5 颗微光星点（细小、柔化、明灭感）
  const stars = Array.from({ length: 5 }, (_, s) => ({
    cx: detCoord(p, e, 20 + s * 3, 90, 934),
    cy: detCoord(p, e, 21 + s * 3, 90, 934),
    r: 2 + det(p, e, 22 + s * 3, 6),
    color: s % 2 === 0 ? '#FFFFFF' : emotion.color,
    op: (0.35 + det(p, e, 40 + s, 45) / 100).toFixed(2),
  }));

  const orbsXml = orbs
    .map((o) => `    <circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${o.color}" filter="url(#${o.blur})" opacity="${o.op}"/>`)
    .join('\n');
  const starsXml = stars
    .map((s) => `    <circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.color}" filter="url(#starBlur)" opacity="${s.op}"/>`)
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="topWash" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0%" stop-color="${preset.main}" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="${preset.base}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="mainGlow" cx="${pct(mainCx)}%" cy="${pct(mainCy)}%" r="62%">
      <stop offset="0%" stop-color="${preset.main}" stop-opacity="0.6"/>
      <stop offset="45%" stop-color="${preset.main}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${preset.main}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="emoGlow" cx="${pct(emoCx)}%" cy="${pct(emoCy)}%" r="50%">
      <stop offset="0%" stop-color="${emotion.color}" stop-opacity="0.42"/>
      <stop offset="55%" stop-color="${emotion.color}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${emotion.color}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="topLight" cx="50%" cy="4%" r="55%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="46%" r="72%">
      <stop offset="58%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
    </radialGradient>
    <filter id="orbBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="90"/></filter>
    <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="42"/></filter>
    <filter id="starBlur" x="-400%" y="-400%" width="900%" height="900%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/></filter>
  </defs>
  <!-- 1. 深色底 -->
  <rect width="1024" height="1024" fill="${preset.base}"/>
  <!-- 2. 主色/情绪色双径向辉光 -->
  <rect width="1024" height="1024" fill="url(#mainGlow)"/>
  <rect width="1024" height="1024" fill="url(#emoGlow)"/>
  <!-- 3. 4 个柔和 orb -->
${orbsXml}
  <!-- 4. 5 颗微光星点 -->
${starsXml}
  <!-- 5. 顶部渐晕（光从上）+ 顶部柔光 -->
  <rect width="1024" height="1024" fill="url(#topWash)"/>
  <rect width="1024" height="1024" fill="url(#topLight)"/>
  <!-- 6. 细颗粒 -->
  <rect width="1024" height="1024" filter="url(#grain)" opacity="0.05"/>
  <!-- 7. 柔和暗角 -->
  <rect width="1024" height="1024" fill="url(#vignette)"/>
</svg>
`;
}

const generated = [];
for (let p = 0; p < PRESETS.length; p++) {
  for (let e = 0; e < EMOTIONS.length; e++) {
    const filename = `${PRESETS[p].slug}-${EMOTIONS[e].key}.svg`;
    writeFileSync(join('public', 'seeds', filename), generateSVG(p, e), 'utf8');
    generated.push(filename);
  }
}

console.log(`已生成 ${generated.length} 张 SVG 种子占位图到 public/seeds/：`);
for (const name of generated) console.log(`  - ${name}`);
