/**
 * 种子库逻辑（离线保底占位图）
 * 4 预设 × 5 情绪键 = 20 张占位图。
 *
 * 种子图实际文件存 public/seeds/{presetSlug}-{emotionKey}.svg
 * Task 10 已补 SVG 占位图。
 *
 * 5 个情绪键：
 *   - excited   高涨愉悦
 *   - anxious   高涨不悦
 *   - tender    低落愉悦
 *   - sad       低落不悦
 *   - ethereal  中性出神
 */
import type { AestheticPresetName } from './types';
import { getEmotionByWord } from './emotions';

export type EmotionKey = 'excited' | 'anxious' | 'tender' | 'sad' | 'ethereal';

/** 预设 slug（用于文件名） */
export const PRESET_SLUGS: Record<AestheticPresetName, string> = {
  Ethereal: 'ethereal',
  'Dark Fantasy': 'dark-fantasy',
  Mystical: 'mystical',
  Psychedelic: 'psychedelic',
};

/** 情绪词 → 情绪键 的显式映射（覆盖维度默认映射） */
const EMOTION_KEY_OVERRIDE: Record<string, EmotionKey> = {
  // 出神归入 ethereal（中性出神桶），即使它在 low-pleasant 维度
  出神: 'ethereal',
  // 宁静 / 释然 偏向 ethereal 的空灵感
  宁静: 'ethereal',
  释然: 'ethereal',
};

/**
 * 将情绪词映射到 5 个情绪键之一。
 * 规则：先查 override，否则按维度默认映射。
 *   - high-pleasant   → excited
 *   - high-unpleasant → anxious
 *   - low-pleasant    → tender
 *   - low-unpleasant  → sad
 * 未知词兜底 ethereal。
 */
export function mapEmotionToKey(word: string): EmotionKey {
  if (EMOTION_KEY_OVERRIDE[word]) return EMOTION_KEY_OVERRIDE[word];
  const entry = getEmotionByWord(word);
  if (!entry) return 'ethereal';
  switch (entry.dimension) {
    case 'high-pleasant':
      return 'excited';
    case 'high-unpleasant':
      return 'anxious';
    case 'low-pleasant':
      return 'tender';
    case 'low-unpleasant':
      return 'sad';
    default:
      return 'ethereal';
  }
}

/** 4 预设 × 5 情绪键 = 20 张种子图路径 */
export const SEED_LIBRARY: Record<AestheticPresetName, Record<EmotionKey, string>> = {
  Ethereal: {
    excited: '/seeds/ethereal-excited.svg',
    anxious: '/seeds/ethereal-anxious.svg',
    tender: '/seeds/ethereal-tender.svg',
    sad: '/seeds/ethereal-sad.svg',
    ethereal: '/seeds/ethereal-ethereal.svg',
  },
  'Dark Fantasy': {
    excited: '/seeds/dark-fantasy-excited.svg',
    anxious: '/seeds/dark-fantasy-anxious.svg',
    tender: '/seeds/dark-fantasy-tender.svg',
    sad: '/seeds/dark-fantasy-sad.svg',
    ethereal: '/seeds/dark-fantasy-ethereal.svg',
  },
  Mystical: {
    excited: '/seeds/mystical-excited.svg',
    anxious: '/seeds/mystical-anxious.svg',
    tender: '/seeds/mystical-tender.svg',
    sad: '/seeds/mystical-sad.svg',
    ethereal: '/seeds/mystical-ethereal.svg',
  },
  Psychedelic: {
    excited: '/seeds/psychedelic-excited.svg',
    anxious: '/seeds/psychedelic-anxious.svg',
    tender: '/seeds/psychedelic-tender.svg',
    sad: '/seeds/psychedelic-sad.svg',
    ethereal: '/seeds/psychedelic-ethereal.svg',
  },
};

/**
 * 根据 emotionWord 映射到 5 个情绪键之一，返回对应种子图路径。
 * 图像生成失败时由 ai.ts 调用此函数兜底。
 */
export function getSeedImage(
  preset: AestheticPresetName,
  emotionWord: string,
): string {
  const key = mapEmotionToKey(emotionWord);
  return SEED_LIBRARY[preset][key];
}
