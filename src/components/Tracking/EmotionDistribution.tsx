// EmotionDistribution — 情绪分布横向条形图
// 按 4 维度分组（高涨-愉悦 / 高涨-不悦 / 低落-愉悦 / 低落-不悦）
// 每条 color = emotion.color，宽度 = 次数占比（组内归一化）。纯 CSS，无第三方图表库。

import { motion } from "framer-motion";
import { Caption } from "@/components/ui";
import { EMOTIONS } from "@/lib/emotions";
import type { Dream, EmotionDimension } from "@/lib/types";

export interface EmotionDistributionProps {
  dreams: Dream[];
}

const GROUPS: { dimension: EmotionDimension; label: string }[] = [
  { dimension: "high-pleasant", label: "高涨 · 愉悦" },
  { dimension: "high-unpleasant", label: "高涨 · 不悦" },
  { dimension: "low-pleasant", label: "低落 · 愉悦" },
  { dimension: "low-unpleasant", label: "低落 · 不悦" },
];

interface BarItem {
  word: string;
  color: string;
  count: number;
  ratio: number;
}

export function EmotionDistribution({ dreams }: EmotionDistributionProps) {
  const counter = new Map<string, number>();
  for (const d of dreams) {
    const w = d.emotion.word;
    counter.set(w, (counter.get(w) ?? 0) + 1);
  }

  const groups = GROUPS.map((g) => {
    const items = EMOTIONS.filter((e) => e.dimension === g.dimension);
    const bars: BarItem[] = items
      .map((e) => ({
        word: e.word,
        color: e.color,
        count: counter.get(e.word) ?? 0,
        ratio: 0,
      }))
      .filter((b) => b.count > 0);
    const max = Math.max(1, ...bars.map((b) => b.count));
    bars.forEach((b) => {
      b.ratio = b.count / max;
    });
    return {
      ...g,
      bars,
      total: bars.reduce((s, b) => s + b.count, 0),
    };
  });

  const hasAny = groups.some((g) => g.bars.length > 0);

  return (
    <section className="rounded-2xl border border-white/5 bg-dreamgate-elevated/60 p-6 backdrop-blur-xl sm:p-8">
      <header className="mb-4">
        <h3 className="font-display text-xl text-dreamgate-text-primary sm:text-2xl">
          情绪分布
        </h3>
        <Caption as="span" className="text-[11px] uppercase tracking-widest">
          24 情绪词 · 按维度分组
        </Caption>
      </header>
      {!hasAny && (
        <Caption as="p" className="text-sm text-dreamgate-text-muted">
          尚无情绪数据
        </Caption>
      )}
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.dimension}>
            <div className="mb-2 flex items-center justify-between">
              <Caption
                as="span"
                className="text-[11px] uppercase tracking-widest"
              >
                {g.label}
              </Caption>
              <Caption as="span" className="text-[11px]">
                {g.total} 场
              </Caption>
            </div>
            {g.bars.length === 0 ? (
              <Caption as="p" className="text-xs text-dreamgate-text-muted">
                ——
              </Caption>
            ) : (
              <div className="flex flex-col gap-1.5">
                {g.bars.map((b) => (
                  <div
                    key={b.word}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-10 shrink-0 text-dreamgate-text-secondary">
                      {b.word}
                    </span>
                    <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${b.ratio * 100}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-[11px] text-dreamgate-text-secondary">
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
