// AestheticPicker — 4 美学预设选择器
// 每个预设显示名称 + cssFilter 预览方块（用 .preset-X 类）+ 适配情绪提示

import { AESTHETIC_PRESETS } from "@/lib/aestheticPresets";
import { presetToKey } from "@/components/Atmosphere";
import type { AestheticPresetName } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface AestheticPickerProps {
  value: AestheticPresetName;
  onChange?: (name: AestheticPresetName) => void;
}

export function AestheticPicker({ value, onChange }: AestheticPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {AESTHETIC_PRESETS.map((p) => {
        const selected = value === p.name;
        const filterClass = `preset-${presetToKey[p.name]}`;
        return (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange?.(p.name)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-300",
              selected
                ? "border-dreamgate-ethereal/60 bg-dreamgate-ethereal/10 shadow-[0_0_18px_rgba(201,184,232,0.25)]"
                : "border-white/8 bg-dreamgate-elevated/40 hover:border-white/20",
            )}
          >
            <div
              className={cn(
                "mb-2 h-12 w-full rounded-md",
                filterClass,
              )}
              style={{
                background:
                  "linear-gradient(135deg, rgba(201,184,232,0.45), rgba(78,201,176,0.22), rgba(255,107,157,0.28))",
              }}
            />
            <div className="font-display text-sm tracking-wide text-dreamgate-text-primary">
              {p.name}
            </div>
            <div className="mt-0.5 text-[11px] text-dreamgate-text-muted">
              {p.emotionFit.join(" · ")}
            </div>
            {selected && (
              <span className="absolute right-2 top-2 text-dreamgate-ethereal">
                <Check size={14} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
