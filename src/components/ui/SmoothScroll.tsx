// SmoothScroll — 页面级顺滑惯性滚动（Lenis）
// 挂在需要长滚动叙事的页面里（如报告页），营造 noomo 式的黄油顺滑感。
// 尊重 prefers-reduced-motion：减弱动效时不启用（退回原生滚动）。
// 不用于画廊页——画廊在 3D 模式自管 Lenis + ScrollTrigger，避免双实例冲突。

import { useEffect } from "react";
import Lenis from "lenis";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function SmoothScroll() {
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reduce]);

  return null;
}
