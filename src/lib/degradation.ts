/**
 * 降级开关配置（spec：第 12 天自检）
 * 从 import.meta.env 读取降级标志，默认全 false（全量 3D 体验）。
 * 第 12 天自检若 P0 核心闭环不稳，运行时触发降级保交付。
 */
import { useSyncExternalStore } from 'react';

/** 降级标志键 */
export type DegradationKey =
  | 'mobile2_5D' // 移动端 2.5D 视差画廊（牺牲全量 3D）
  | 'shareCard3D' // 3D 分享卡 → 静态模板
  | 'fogShader' // 雾效着色器 → CSS 渐变雾
  | 'desktop3D'; // 桌面端全量 3D → 2.5D

/** 降级状态 */
export interface DegradationState {
  mobile2_5D: boolean;
  shareCard3D: boolean;
  fogShader: boolean;
  desktop3D: boolean;
}

/** 从 import.meta.env 读取初始降级标志（默认全 false） */
function readEnvFlags(): DegradationState {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const bool = (v: string | boolean | undefined): boolean => {
    if (v === undefined) return false;
    if (typeof v === 'boolean') return v;
    return v === 'true' || v === '1';
  };
  return {
    mobile2_5D: bool(env.VITE_DEGRADE_MOBILE_2_5D),
    shareCard3D: bool(env.VITE_DEGRADE_SHARE_CARD_3D),
    fogShader: bool(env.VITE_DEGRADE_FOG_SHADER),
    desktop3D: bool(env.VITE_DEGRADE_DESKTOP_3D),
  };
}

/** 编译期降级标志（来自 env，构建时确定） */
export const DEGRADATION_FLAGS: DegradationState = readEnvFlags();

// ────────── 运行时降级状态（可被 triggerDegradation 修改） ──────────

let runtimeState: DegradationState = { ...DEGRADATION_FLAGS };
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const l of listeners) l();
}

/** 订阅降级状态变化（useSyncExternalStore 标准接口，导出供测试与自定义订阅） */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 读取当前降级状态快照（useSyncExternalStore 标准接口，导出供测试与自定义订阅） */
export function getSnapshot(): DegradationState {
  return runtimeState;
}

/**
 * 运行时触发降级（第 12 天自检用）。
 * 传入键名打开对应降级；不可逆（保交付优先）。
 */
export function triggerDegradation(key: DegradationKey): void {
  if (runtimeState[key]) return;
  runtimeState = { ...runtimeState, [key]: true };
  emitChange();
}

/** 读取当前降级状态（响应式） */
export function useDegradation(): DegradationState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
