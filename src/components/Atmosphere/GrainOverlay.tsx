// GrainOverlay — 全屏噪点叠层（电影胶片质感）
// 使用内联 SVG fractalNoise，opacity 极低 + mix-blend-mode overlay

import { cn } from "@/lib/utils";

export interface GrainOverlayProps {
  /** 不透明度 0.04 - 0.08，默认 0.06 */
  opacity?: number;
  /** 混合模式，默认 overlay */
  blendMode?: "overlay" | "soft-light" | "screen";
  className?: string;
}

export function GrainOverlay({
  opacity = 0.06,
  blendMode = "overlay",
  className,
}: GrainOverlayProps) {
  return (
    <div
      aria-hidden
      // .grain 类提供 position:fixed / inset:0 / z-index:60 / SVG 背景 / grain-shift 动画
      className={cn("grain", className)}
      style={{
        opacity,
        mixBlendMode: blendMode,
      }}
    />
  );
}
