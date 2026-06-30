// ColorPicker — 简易颜色选择
// 预设色板（取自 emotions 24 色去重 + 白/灰）+ 原生 input[type=color]
// 不选时 value=undefined（跟随情绪或 AI 后填）

import { useMemo } from "react";
import { X } from "lucide-react";
import { EMOTIONS } from "@/lib/emotions";
import { cn } from "@/lib/utils";

export interface ColorPickerProps {
  value?: string;
  onChange?: (color: string | undefined) => void;
}

const EXTRA = ["#ffffff", "#9a96b0"];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const swatches = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of EMOTIONS) {
      const c = e.color.toLowerCase();
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return [...out, ...EXTRA];
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {swatches.map((c) => {
        const selected = value?.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            aria-label={`选择颜色 ${c}`}
            onClick={() => onChange?.(selected ? undefined : c)}
            className={cn(
              "h-7 w-7 rounded-full border transition-all duration-200",
              selected
                ? "scale-110 border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                : "border-white/15 hover:border-white/40",
            )}
            style={{ backgroundColor: c }}
          />
        );
      })}
      <label
        className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-white/15 transition-all hover:border-white/40"
        title="自定义颜色"
        style={{ backgroundColor: value ?? "#1a1a26" }}
      >
        <input
          type="color"
          value={value ?? "#1a1a26"}
          onChange={(e) => onChange?.(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="自定义颜色"
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange?.(undefined)}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 px-2 text-xs text-dreamgate-text-muted hover:text-dreamgate-text-secondary"
        >
          <X size={12} /> 清除
        </button>
      )}
    </div>
  );
}
