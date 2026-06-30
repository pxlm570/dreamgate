// Backdrop — 深色渐变背景容器 + 可选氛围层
// 作为页面 / 区段的统一背景入口

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AtmosphereLayer } from "@/components/Atmosphere/AtmosphereLayer";
import type { AestheticPreset } from "@/components/Atmosphere/presets";

export interface BackdropProps {
  preset?: AestheticPreset | "default";
  withAtmosphere?: boolean;
  /** 氛围浓度 0-1 */
  intensity?: number;
  className?: string;
  children?: ReactNode;
}

export function Backdrop({
  preset = "default",
  withAtmosphere = true,
  intensity = 0.6,
  className,
  children,
}: BackdropProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden bg-dg-deep text-dreamgate-text-primary",
        className,
      )}
    >
      {withAtmosphere && (
        <AtmosphereLayer preset={preset} intensity={intensity} />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
