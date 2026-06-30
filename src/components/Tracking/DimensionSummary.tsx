// DimensionSummary — 4 维度汇总卡片
// 高涨-愉悦 / 高涨-不悦 / 低落-愉悦 / 低落-不悦
// 每张小卡：代表色 + 维度名 + 梦境数 + 占比

import { Caption } from "@/components/ui";
import { getEmotionByWord } from "@/lib/emotions";
import type { Dream, EmotionDimension } from "@/lib/types";

export interface DimensionSummaryProps {
  dreams: Dream[];
}

const GROUPS: {
  dimension: EmotionDimension;
  label: string;
  short: string;
  color: string;
}[] = [
  {
    dimension: "high-pleasant",
    label: "高涨-愉悦",
    short: "兴奋 / 欢欣",
    color: "#FFD166",
  },
  {
    dimension: "high-unpleasant",
    label: "高涨-不悦",
    short: "焦虑 / 愤怒",
    color: "#EF476F",
  },
  {
    dimension: "low-pleasant",
    label: "低落-愉悦",
    short: "温柔 / 怀念",
    color: "#FFAFCC",
  },
  {
    dimension: "low-unpleasant",
    label: "低落-不悦",
    short: "悲伤 / 孤独",
    color: "#457B9D",
  },
];

export function DimensionSummary({ dreams }: DimensionSummaryProps) {
  const counts: Record<EmotionDimension, number> = {
    "high-pleasant": 0,
    "high-unpleasant": 0,
    "low-pleasant": 0,
    "low-unpleasant": 0,
  };
  for (const d of dreams) {
    const entry = getEmotionByWord(d.emotion.word);
    const dim = entry?.dimension ?? "low-unpleasant";
    counts[dim] = (counts[dim] ?? 0) + 1;
  }
  const total = dreams.length || 1;

  return (
    <section className="rounded-2xl border border-white/5 bg-dreamgate-elevated/60 p-6 backdrop-blur-xl sm:p-8">
      <header className="mb-4">
        <h3 className="font-display text-xl text-dreamgate-text-primary sm:text-2xl">
          四维分布
        </h3>
        <Caption as="span" className="text-[11px] uppercase tracking-widest">
          高低 × 愉悦度
        </Caption>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GROUPS.map((g) => {
          const c = counts[g.dimension] ?? 0;
          const pct = Math.round((c / total) * 100);
          return (
            <div
              key={g.dimension}
              className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ backgroundColor: g.color }}
              />
              <div
                className="mb-2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <div className="font-display text-3xl text-dreamgate-text-primary">
                {c}
              </div>
              <Caption
                as="div"
                className="mt-1 text-[11px] uppercase tracking-wider"
              >
                {g.label}
              </Caption>
              <Caption as="div" className="mt-0.5 text-[10px]">
                {g.short} · {pct}%
              </Caption>
            </div>
          );
        })}
      </div>
    </section>
  );
}
