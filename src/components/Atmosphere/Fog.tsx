// Fog — 柔和雾气层（CSS radial-gradient + 多层漂移，不依赖 WebGL）
// WebGL 雾效着色器在 Task 5 Three.js 场景单独实现

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { hexToRgb } from "./presets";

export interface FogProps {
  /** 浓度 0-1，控制整体不透明度 */
  intensity?: number;
  /** 雾色 hex，默认紫灰 #b4aad2 */
  color?: string;
  className?: string;
}

export function Fog({ intensity = 0.5, color = "#b4aad2", className }: FogProps) {
  const clamped = Math.max(0, Math.min(1, intensity));
  const rgb = useMemo(() => hexToRgb(color), [color]);
  const base = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

  // 多层渐变 alpha 随浓度缩放
  const a = (alpha: number) => `rgba(${base}, ${alpha * clamped})`;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* 层 1：上方大范围柔雾，缓慢漂移 */}
      <div
        className="absolute inset-0 animate-drift will-change-transform"
        style={{
          background: `radial-gradient(60% 50% at 30% 20%, ${a(0.12)} 0%, ${a(0.05)} 40%, transparent 70%)`,
          animationDuration: "28s",
        }}
      />
      {/* 层 2：下方深雾，反向漂移，营造下沉感 */}
      <div
        className="absolute inset-0 animate-drift will-change-transform"
        style={{
          background: `radial-gradient(80% 60% at 70% 90%, ${a(0.14)} 0%, ${a(0.06)} 45%, transparent 75%)`,
          animationDuration: "36s",
          animationDirection: "reverse",
        }}
      />
      {/* 层 3：中部薄雾弥漫 */}
      <div
        className="absolute inset-0 animate-drift will-change-transform"
        style={{
          background: `radial-gradient(50% 40% at 50% 50%, ${a(0.08)} 0%, transparent 70%)`,
          animationDuration: "44s",
          animationDelay: "-8s",
        }}
      />
      {/* 层 4：底部接地雾，强化纵深 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 animate-drift will-change-transform"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${a(0.1)} 100%)`,
          animationDuration: "52s",
        }}
      />
    </div>
  );
}
