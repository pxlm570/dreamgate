// EmotionCalendar — 近 30 天情绪热力图
// 6 列 × 5 行 = 30 格；有梦用最强情绪 emotion.color，无梦暗灰
// 点击有梦格子跳转 /dream/:id；多梦同天显示数量徽章 + hover tooltip

import { Link } from "react-router-dom";
import { Caption } from "@/components/ui";
import { getEmotionByWord } from "@/lib/emotions";
import type { Dream } from "@/lib/types";

export interface EmotionCalendarProps {
  dreams: Dream[];
}

const DAY_MS = 86_400_000;
const TOTAL_DAYS = 30;

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function buildLast30Days(): string[] {
  const now = new Date();
  const todayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const days: string[] = [];
  for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
    days.push(new Date(todayMs - i * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}

interface DayCell {
  date: string;
  day: number;
  dreams: Dream[];
  mainColor?: string;
  mainWord?: string;
}

export function EmotionCalendar({ dreams }: EmotionCalendarProps) {
  const days = buildLast30Days();
  const byDate = new Map<string, Dream[]>();
  for (const d of dreams) {
    const key = dateKey(d.createdAt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(d);
  }

  const cells: DayCell[] = days.map((date) => {
    const list = byDate.get(date) ?? [];
    let mainColor: string | undefined;
    let mainWord: string | undefined;
    if (list.length > 0) {
      const top = [...list].sort(
        (a, b) => b.emotion.intensity - a.emotion.intensity,
      )[0];
      const entry = getEmotionByWord(top.emotion.word);
      mainColor = entry?.color ?? top.color ?? "#c9b8e8";
      mainWord = top.emotion.word;
    }
    return {
      date,
      day: Number(date.slice(8, 10)),
      dreams: list,
      mainColor,
      mainWord,
    };
  });

  return (
    <section className="rounded-2xl border border-white/5 bg-dreamgate-elevated/60 p-6 backdrop-blur-xl sm:p-8">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-xl text-dreamgate-text-primary sm:text-2xl">
          情绪热力图
        </h3>
        <Caption as="span" className="text-[11px] uppercase tracking-widest">
          近 30 天
        </Caption>
      </header>
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1.5 sm:gap-2">
        {cells.map((cell) => {
          const hasDream = cell.dreams.length > 0;
          const target = cell.dreams[0]?.id;
          const baseClass =
            "group relative aspect-square rounded-md transition-all duration-200";
          const inner = (
            <>
              <span className="pointer-events-none absolute left-1 top-0.5 text-[10px] text-white/70">
                {cell.day}
              </span>
              {cell.dreams.length > 1 && (
                <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black/55 px-1 text-[9px] text-white/95">
                  {cell.dreams.length}
                </span>
              )}
              {hasDream && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-full z-10 mb-1 rounded-md border border-white/10 bg-dreamgate-elevated/95 px-2 py-1 text-center text-[11px] text-dreamgate-text-primary opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
                >
                  {cell.mainWord}
                  {cell.dreams.length > 1 && ` · ${cell.dreams.length} 场`}
                </span>
              )}
            </>
          );
          if (hasDream && target) {
            return (
              <Link
                key={cell.date}
                to={`/dream/${target}`}
                className={`${baseClass} ring-1 ring-inset ring-white/10 hover:scale-105 hover:ring-2 hover:ring-white/40`}
                style={{ backgroundColor: cell.mainColor }}
              >
                {inner}
              </Link>
            );
          }
          return (
            <div
              key={cell.date}
              className={`${baseClass} bg-zinc-800/30 ring-1 ring-inset ring-white/5`}
            >
              {inner}
            </div>
          );
        })}
      </div>
      <Caption as="p" className="mt-4 text-center text-[11px]">
        色块对应当日最强情绪 · 点击进入梦境房间
      </Caption>
    </section>
  );
}
