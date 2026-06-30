// AtmosphereLayer — 组合氛围层（Fog + Particles + GrainOverlay + vignette）
// 作为页面背景氛围的统一入口；按美学预设调雾色 / 粒子色 / 氛围光

import { cn } from "@/lib/utils";
import { Fog } from "./Fog";
import { Particles } from "./Particles";
import { GrainOverlay } from "./GrainOverlay";
import { PRESET_COLORS, hexToRgb, type AestheticPreset } from "./presets";

export interface AtmosphereLayerProps {
  /** 美学预设名（或 default） */
  preset?: AestheticPreset | "default";
  /** 整体浓度 0-1 */
  intensity?: number;
  withGrain?: boolean;
  withParticles?: boolean;
  withVignette?: boolean;
  /** 粒子数 */
  particleCount?: number;
  className?: string;
}

export function AtmosphereLayer({
  preset = "default",
  intensity = 0.6,
  withGrain = true,
  withParticles = true,
  withVignette = true,
  particleCount = 30,
  className,
}: AtmosphereLayerProps) {
  const palette = PRESET_COLORS[preset] ?? PRESET_COLORS.default;
  const clamped = Math.max(0, Math.min(1, intensity));
  const rgb = hexToRgb(palette.accent);
  const accentStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      {/* 底层：顶部微亮的深色径向，给雾一个依托 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(100% 80% at 50% 0%, rgba(20,20,31,0.6) 0%, transparent 60%)",
        }}
      />
      {/* 预设色调氛围光（顶部柔光，缓慢呼吸） */}
      <div
        className="absolute inset-0 animate-pulse-glow will-change-transform"
        style={{
          background: `radial-gradient(70% 50% at 50% 15%, rgba(${accentStr}, ${
            0.08 * clamped
          }) 0%, transparent 60%)`,
          animationDuration: "12s",
        }}
      />
      <Fog intensity={clamped} color={palette.fog} />
      {withParticles && (
        <Particles
          count={particleCount}
          color={palette.particle}
          speed={0.3}
        />
      )}
      {withVignette && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 40%, transparent 0%, transparent 50%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      )}
      {withGrain && <GrainOverlay />}
    </div>
  );
}
