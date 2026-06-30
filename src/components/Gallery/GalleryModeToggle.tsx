// GalleryModeToggle — 3D / 2.5D 视图切换按钮（右上角小开关，第 12 天自检用）
// 受控组件：mode 由父组件持久化到 localStorage

import { Box, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryMode = "3d" | "2.5d";

export interface GalleryModeToggleProps {
  mode: GalleryMode;
  onChange: (mode: GalleryMode) => void;
}

export function GalleryModeToggle({ mode, onChange }: GalleryModeToggleProps) {
  const baseBtn =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all";
  const activeBtn =
    "bg-dreamgate-ethereal/20 text-white shadow-[0_0_14px_rgba(201,184,232,0.3)]";
  const idleBtn =
    "text-dreamgate-text-muted hover:text-dreamgate-text-secondary";

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-dreamgate-elevated/40 p-1 backdrop-blur-md">
      <button
        type="button"
        aria-label="3D 走廊视图"
        onClick={() => onChange("3d")}
        className={cn(baseBtn, mode === "3d" ? activeBtn : idleBtn)}
      >
        <Box size={12} />
        3D
      </button>
      <button
        type="button"
        aria-label="2.5D 视差视图"
        onClick={() => onChange("2.5d")}
        className={cn(baseBtn, mode === "2.5d" ? activeBtn : idleBtn)}
      >
        <Layers size={12} />
        2.5D
      </button>
    </div>
  );
}
