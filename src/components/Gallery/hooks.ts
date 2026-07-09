// Gallery 页面级 hooks（融合单世界 Step1 从原 GalleryPage 拆出的代码健康重构）
// ① useSeedBootstrap：空画廊首次自动播种 + 老用户种子藏品图升级迁移 + 种子扩容追加迁移
// ② useStopNavigation：kimi 式逐画驻足（一格滚轮 = 运镜到下一幅画前站定）

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useDreamStore } from "@/store/useDreamStore";
import { loadSeeds, SEED_DREAMS } from "@/data/seedDreams";

const SEEDS_AUTO_LOADED_KEY = "dreamgate-seeds-auto-loaded";

/**
 * 种子数据引导：
 * - 首次进入空画廊且已完成引导时，自动加载示例梦境（仅一次，用户清空后不再自动加载）
 * - 老用户 IndexedDB 里的种子梦还是旧 SVG 占位图（种子只自动加载一次、已存在的不覆盖），
 *   检测到即升级为新版 gpt-image 真图——老浏览器打开也能看到精美画作
 */
export function useSeedBootstrap(): void {
  const dreams = useDreamStore((s) => s.dreams);
  const loaded = useDreamStore((s) => s.loaded);
  const meta = useDreamStore((s) => s.meta);
  const updateDream = useDreamStore((s) => s.updateDream);
  // 迁移去重锁：addDream 只是无脑 concat 内存数组，不按 id 去重；loadSeeds 内部
  // 的 `existing` 集合只在调用起始快照一次。若不加锁，effect 会在每次 addDream
  // 触发的 dreams 引用变化时重新触发，多个并发 loadSeeds() 各自基于过期快照
  // 添加同一批缺失种子，导致数组里出现重复 id（React key 冲突）。
  const migratingRef = useRef(false);

  useEffect(() => {
    if (!loaded || !meta.onboarded) return;
    const alreadyAuto = localStorage.getItem(SEEDS_AUTO_LOADED_KEY) === "true";
    if (dreams.length === 0) {
      // 首次进入空画廊自动播种（仅一次，用户清空后不再自动加载）
      if (alreadyAuto || migratingRef.current) return;
      migratingRef.current = true;
      let cancelled = false;
      (async () => {
        await loadSeeds();
        if (cancelled) return;
        try {
          localStorage.setItem(SEEDS_AUTO_LOADED_KEY, "true");
        } catch {
          /* ignore quota errors */
        }
      })().finally(() => {
        migratingRef.current = false;
      });
      return () => {
        cancelled = true;
      };
    }
    // 扩容追加迁移（07-09 种子 5→9 条）：曾自动播种、且用户仍保留着种子
    // （删过种子的用户不打扰）→ 补齐缺失的新种子；loadSeeds 按 id 去重
    if (
      alreadyAuto &&
      !migratingRef.current &&
      dreams.some((d) => d.id.startsWith("seed-")) &&
      SEED_DREAMS.some((s) => !dreams.some((d) => d.id === s.id))
    ) {
      migratingRef.current = true;
      loadSeeds()
        .catch((err) => console.error("[DreamGate] 种子扩容追加失败:", err))
        .finally(() => {
          migratingRef.current = false;
        });
    }
  }, [loaded, dreams, meta.onboarded]);

  useEffect(() => {
    if (!loaded) return;
    for (const d of dreams) {
      const seed = SEED_DREAMS.find((s) => s.id === d.id);
      if (
        seed &&
        d.artifact.imageUrl.startsWith("/seeds/") &&
        d.artifact.imageUrl !== seed.artifact.imageUrl
      ) {
        updateDream({ ...d, artifact: { ...seed.artifact } }).catch((err) =>
          console.error("[DreamGate] 种子藏品迁移失败:", err),
        );
      }
    }
  }, [loaded, dreams, updateDream]);
}

export interface StopNavigationOptions {
  /** 3D 模式且有门时才启用 */
  enabled: boolean;
  /** 走廊内的门数（最近 20 条） */
  recentCount: number;
  /** 驻足/入画中不走位 */
  paused: boolean;
  /** 相机进度 0-1 输出（CorridorScene 读取） */
  scrollRef: MutableRefObject<number>;
}

/**
 * kimi 式逐画驻足（3D 模式无滚动条）：一格滚轮/一次滑动/方向键 = 运镜到下一幅画前站定。
 * 连续滚动的「路过感」变成策展人带你逐幅看展的「驻足节奏」。
 * 返回当前档位 stop（0 起；=recentCount 时为走廊尽头「仍未发现的梦境」）。
 */
export function useStopNavigation({
  enabled,
  recentCount,
  paused,
  scrollRef,
}: StopNavigationOptions): number {
  const [stop, setStop] = useState(0);
  const stopLockRef = useRef(0);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!enabled || recentCount === 0) return;
    const maxStop = recentCount; // 末档 = 走廊尽头
    const advance = (dir: number) => {
      if (pausedRef.current) return;
      const now = performance.now();
      if (now - stopLockRef.current < 900) return; // 一格=一次完整运镜
      stopLockRef.current = now;
      setStop((s) => Math.max(0, Math.min(maxStop, s + dir)));
    };
    const onWheel = (e: WheelEvent) => advance(e.deltaY > 0 ? 1 : -1);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") advance(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") advance(-1);
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (Math.abs(dy) > 40) advance(dy > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, recentCount]);

  // 驻足档位 → 相机进度：门 i 的停点在画前 4.2 处；末档走到尽头
  // （2.4 时门在视野边缘被裁切——4.2 恰好整幅画入镜，也与入场初始视角一致）
  useEffect(() => {
    if (!enabled || recentCount === 0) return;
    const startZ = 4;
    const endZ = -(recentCount - 1) * 4 - 4;
    const zi = stop >= recentCount ? endZ : -stop * 4 + 4.2;
    scrollRef.current = (zi - startZ) / (endZ - startZ);
  }, [stop, enabled, recentCount, scrollRef]);

  return stop;
}
