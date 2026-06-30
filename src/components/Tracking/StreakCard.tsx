// StreakCard — 连续记梦 streak 展示卡片
// 从 meta.streak 读 count + lastDate，大数字 + Flame + 鼓励文案
// 断签不惩罚：lastDate 早于昨天 → count 显示为 1，CTA 引导续写

import { Link } from "react-router-dom";
import { Flame, ArrowRight } from "lucide-react";
import { Caption, Button } from "@/components/ui";
import type { Streak } from "@/lib/types";

export interface StreakCardProps {
  streak: Streak;
}

const DAY_MS = 86_400_000;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr(): string {
  return new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
}
function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / DAY_MS));
}

export function StreakCard({ streak }: StreakCardProps) {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const { count: rawCount, lastDate } = streak;

  let displayCount = rawCount;
  let title: string;
  let subtitle: string;
  let showCta = false;

  if (!rawCount || !lastDate) {
    displayCount = 0;
    title = "尚未启程";
    subtitle = "记录第一场梦，开启你的潜意识档案";
    showCta = true;
  } else if (lastDate === today) {
    title = "今日已记梦";
    subtitle = "断签不惩罚，继续即可。每一场梦都被珍藏";
  } else if (lastDate === yesterday) {
    title = "昨日已记，今日待续";
    subtitle = "今天还没记梦，继续昨夜的旅程？";
    showCta = true;
  } else {
    const days = daysBetween(lastDate, today);
    displayCount = 1;
    title = "重新开始";
    subtitle = `上次记录是 ${days} 天前，断签不惩罚，从此刻续写`;
    showCta = true;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-dreamgate-elevated/60 p-6 backdrop-blur-xl sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(255,159,28,0.18) 0%, transparent 70%)",
        }}
      />
      <div className="flex flex-col items-center text-center">
        <Flame
          size={32}
          strokeWidth={1.5}
          className="animate-pulse-glow text-amber-400"
        />
        <div
          className="mt-3 font-display text-6xl font-medium leading-none tracking-wide sm:text-7xl"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #FFD166 0%, #FF6B9D 60%, #EF476F 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {displayCount}
        </div>
        <Caption
          as="div"
          className="mt-2 text-[11px] uppercase tracking-widest"
        >
          连续记梦 · 天
        </Caption>
        <div className="mt-4 font-display text-xl text-dreamgate-text-primary sm:text-2xl">
          {title}
        </div>
        <Caption
          as="p"
          className="mt-2 max-w-xs text-sm text-dreamgate-text-secondary"
        >
          {subtitle}
        </Caption>
        {showCta && (
          <Link to="/record" className="mt-5">
            <Button variant="ethereal" size="sm">
              记录今日梦境
              <ArrowRight size={14} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
