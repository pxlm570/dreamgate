// EmotionPicker — 24 情绪词选择器（附录 B）
// 按 4 维度分组（高涨-愉悦 / 高涨-不悦 / 低落-愉悦 / 低落-不悦）
// chip 选中时用 emotion.color 做边框/背景；含"让 AI 帮我解析"选项（清空选择）

import { EMOTIONS } from "@/lib/emotions";
import type { EmotionDimension } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmotionPickerProps {
  value?: string;
  onChange?: (word: string | undefined) => void;
}

const GROUPS: { dimension: EmotionDimension; label: string }[] = [
  { dimension: "high-pleasant", label: "高涨 · 愉悦" },
  { dimension: "high-unpleasant", label: "高涨 · 不悦" },
  { dimension: "low-pleasant", label: "低落 · 愉悦" },
  { dimension: "low-unpleasant", label: "低落 · 不悦" },
];

export function EmotionPicker({ value, onChange }: EmotionPickerProps) {
  const aiMode = value === undefined;
  return (
    <div className="flex flex-col gap-4">
      {GROUPS.map((g) => {
        const items = EMOTIONS.filter((e) => e.dimension === g.dimension);
        return (
          <div key={g.dimension}>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-dreamgate-text-muted">
              {g.label}
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((e) => {
                const selected = value === e.word;
                return (
                  <button
                    key={e.word}
                    type="button"
                    onClick={() => onChange?.(selected ? undefined : e.word)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-all duration-200",
                      selected
                        ? "text-white"
                        : "border-white/10 text-dreamgate-text-secondary hover:text-dreamgate-text-primary",
                    )}
                    style={
                      selected
                        ? {
                            backgroundColor: `${e.color}33`,
                            borderColor: e.color,
                            color: e.color,
                          }
                        : undefined
                    }
                  >
                    {e.word}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange?.(undefined)}
        className={cn(
          "inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-sm transition-all",
          aiMode
            ? "border-dreamgate-ethereal/60 bg-dreamgate-ethereal/10 text-dreamgate-ethereal"
            : "border-white/10 text-dreamgate-text-muted hover:text-dreamgate-text-secondary",
        )}
      >
        <Sparkles size={12} /> 让 AI 帮我解析
      </button>
    </div>
  );
}
