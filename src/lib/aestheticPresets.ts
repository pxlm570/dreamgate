/**
 * 美学预设规范（spec 附录 D）
 * 4 个预设：prompt 关键词 + CSS 色调滤镜 + 情绪适配。
 * prompt 固化 + CSS filter 保证画廊一致性。
 */
import type { AestheticPresetEntry } from './types';

export const AESTHETIC_PRESETS: AestheticPresetEntry[] = [
  {
    name: 'Ethereal',
    promptKeywords: ['ethereal', 'soft glow', 'pastel', 'floating light', 'dreamlike'],
    cssFilter: 'hue-rotate(-10deg) saturate(0.8) brightness(1.1)',
    emotionFit: ['温柔', '怀念', '宁静'],
  },
  {
    name: 'Dark Fantasy',
    promptKeywords: ['dark fantasy', 'moody', 'dramatic shadows', 'mystical fog'],
    cssFilter: 'saturate(1.2) contrast(1.15) brightness(0.85)',
    emotionFit: ['恐惧', '沉重', '迷失'],
  },
  {
    name: 'Mystical',
    promptKeywords: ['mystical', 'sacred geometry', 'aurora', 'cosmic', 'ethereal mist'],
    cssFilter: 'hue-rotate(15deg) saturate(1.1) brightness(1.05)',
    emotionFit: ['出神', '沉醉', '惊喜'],
  },
  {
    name: 'Psychedelic',
    promptKeywords: ['psychedelic', 'vibrant', 'surreal', 'fractal', 'kaleidoscopic'],
    cssFilter: 'saturate(1.4) hue-rotate(20deg) contrast(1.1)',
    emotionFit: ['兴奋', '焦躁', '崩溃'],
  },
];

/** 按名查找预设 */
export function getPresetByName(name: string): AestheticPresetEntry | undefined {
  return AESTHETIC_PRESETS.find((p) => p.name === name);
}
