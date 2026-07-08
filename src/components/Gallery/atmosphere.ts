// 走廊氛围参数（非组件导出单独成文件，保 react-refresh 纯组件文件约束）
import * as THREE from "three";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";

/** 走廊基调色：从近黑提到深紫灰（有色温的暗才有留白感，漆黑只有虚无感） */
export const FOG_BASE = "#0b0a15";

/** hex 基底 + accent 按比例混合，返回 three.Color */
export function mixColor(base: string, accent: string, ratio: number): THREE.Color {
  return new THREE.Color(base).lerp(new THREE.Color(accent), ratio);
}

/** 走廊场景的氛围参数（随最新梦境的情绪色微调；单世界 World 统一管理雾/背景时取用） */
export function corridorAtmosphere(dreams: Dream[]): { color: string; density: number } {
  const recent = dreams.slice(-20).reverse();
  const accent = getEmotionByWord(recent[0]?.emotion.word ?? "")?.color ?? "#c9b8e8";
  return { color: `#${mixColor(FOG_BASE, accent, 0.06).getHexString()}`, density: 0.038 };
}
