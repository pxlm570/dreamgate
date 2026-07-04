/**
 * 「银盐梦境」滤镜开关（全局、可逆、localStorage 记忆）
 * 学 kimi careers 的「统一风格化滤镜」手法做的试验——默认开启；
 * 关闭即回到干净版（两版共存，导航栏一键切换）。
 */
import { useSyncExternalStore } from 'react';

const KEY = 'dg-silver-filter';

function readInitial(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'; // 默认开
  } catch {
    return true;
  }
}

let state = readInitial();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function setSilverFilter(on: boolean): void {
  state = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  emit();
}

export function useSilverFilter(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => true,
  );
}
