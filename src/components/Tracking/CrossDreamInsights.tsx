// CrossDreamInsights — 跨梦模式识别（潜意识报告的核心叙事区）
// 从 analyzePatterns 现算「重复意象 + 关联情绪 + 对比张力 + 基调趋势」，
// 以 noomo 式滚动揭示 + 数字计数呈现，回答单次 AI 对话给不出的纵向洞察。
// 全程尊重 prefers-reduced-motion：减弱动效时静态直出。

import { useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Sparkles, GitCompareArrows } from "lucide-react";
import { Caption, Body, Display, ScrollRevealText } from "@/components/ui";
import { analyzePatterns } from "@/lib/patterns";
import type { Dream } from "@/lib/types";

export interface CrossDreamInsightsProps {
  dreams: Dream[];
}

/** hex → rgba（给情绪色加透明度做光晕） */
function hexA(hex: string, a: number): string {
  const h = (hex || "#c9b8e8").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** 进入视口时从 0 计数到目标值（reduce-motion 时直接显示终值） */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (reduce) {
      setVal(to);
      return;
    }
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: EASE,
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref}>
      {Math.round(val)}
      {suffix}
    </span>
  );
}

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export function CrossDreamInsights({ dreams }: CrossDreamInsightsProps) {
  const reduce = useReducedMotion();
  const report = useMemo(() => analyzePatterns(dreams), [dreams]);

  // reduce-motion 时不挂载入场动效（静态直出）
  const revealProps = reduce
    ? {}
    : {
        variants: cardReveal,
        initial: "hidden" as const,
        whileInView: "show" as const,
        viewport: { once: true, margin: "-10% 0px" },
      };

  const eyebrow = (
    <div className="flex items-center gap-2 text-dreamgate-ethereal">
      <Sparkles size={14} strokeWidth={1.6} />
      <Caption
        as="span"
        className="text-[11px] uppercase tracking-[0.3em] text-dreamgate-ethereal/90"
      >
        纵向洞察 · Cross-Dream
      </Caption>
    </div>
  );

  // —— 数据不足：温柔引导，而非空白 ——
  if (!report.hasInsight) {
    return (
      <section className="py-6">
        {eyebrow}
        <Display className="mt-4 text-3xl text-dreamgate-text-primary sm:text-4xl">
          模式，正在浮现
        </Display>
        <Body className="mt-4 max-w-xl text-[15px] leading-relaxed">
          目前还没有足够的梦境形成跨梦模式。当同一意象在多场梦中反复出现，这里会揭示它与情绪的关联——
          这是任何单次 AI 解析都给不出的、属于你自己的纵向洞察。
        </Body>
        <Caption as="p" className="mt-3 text-xs text-dreamgate-text-muted">
          继续记录，让潜意识的纹理慢慢显形。
        </Caption>
      </section>
    );
  }

  const negativePct = Math.round(report.negativeRatio * 100);
  const topPatterns = report.symbolPatterns.slice(0, 3);

  return (
    <section className="space-y-10 py-6">
      {/* —— 章首：电影感标题 —— */}
      <header>
        {eyebrow}
        {reduce ? (
          <Display className="mt-4 font-light leading-[1.1] tracking-tight text-[clamp(1.9rem,4.5vw,3.4rem)] text-dreamgate-text-primary">
            你的潜意识，正在重复地诉说
          </Display>
        ) : (
          <ScrollRevealText
            as="h2"
            splitByWords
            className="mt-4 font-display font-light leading-[1.1] tracking-tight text-glow text-dreamgate-text-primary text-[clamp(1.9rem,4.5vw,3.4rem)]"
          >
            你的潜意识，正在重复地诉说
          </ScrollRevealText>
        )}
        <Body className="mt-4 max-w-2xl text-[15px] leading-relaxed">
          以下不是对某一场梦的解读，而是对你
          <span className="text-dreamgate-text-primary">全部梦境</span>
          的纵向回望——重复的意象、相伴的情绪、潜藏的张力。
        </Body>
      </header>

      {/* —— 统计带：大数字计数 —— */}
      <motion.div
        {...revealProps}
        className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5"
      >
        {[
          { v: report.totalDreams, s: "", label: "场梦境" },
          { v: report.spanDays, s: "", label: "天记录跨度" },
          { v: negativePct, s: "%", label: "负面基调占比" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-dreamgate-elevated/60 px-3 py-6 text-center backdrop-blur-xl sm:py-8"
          >
            <div className="font-display font-light leading-none text-dreamgate-text-primary text-[clamp(2.25rem,4vw,3.25rem)]">
              <Counter to={stat.v} suffix={stat.s} />
            </div>
            <Caption
              as="div"
              className="mt-2 text-[10px] uppercase tracking-widest sm:text-[11px]"
            >
              {stat.label}
            </Caption>
          </div>
        ))}
      </motion.div>

      {/* —— 重复意象卡片 —— */}
      <div className="space-y-5">
        {topPatterns.map((p) => (
          <motion.article
            key={p.symbol}
            {...revealProps}
            className="relative overflow-hidden rounded-2xl border border-white/5 bg-dreamgate-elevated/60 p-6 backdrop-blur-xl sm:p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background: `radial-gradient(70% 60% at 12% 18%, ${hexA(p.accent, 0.2)} 0%, transparent 68%)`,
              }}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <Caption
                  as="div"
                  className="text-[11px] uppercase tracking-widest"
                >
                  重复意象
                </Caption>
                <div className="mt-1 font-display text-5xl font-medium leading-none text-dreamgate-text-primary sm:text-6xl">
                  {p.symbol}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="font-display text-6xl font-medium leading-none sm:text-7xl"
                  style={{ color: p.accent }}
                >
                  <Counter to={p.count} />
                </div>
                <Caption
                  as="div"
                  className="mt-1 text-[10px] uppercase tracking-widest sm:text-[11px]"
                >
                  场梦 · {p.spanDays} 天内
                </Caption>
              </div>
            </div>

            {/* 关联情绪 chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {p.emotions.slice(0, 5).map((e) => (
                <span
                  key={e.word}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-dreamgate-text-secondary"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: e.color }}
                  />
                  {e.word}
                  {e.count > 1 ? ` ·${e.count}` : ""}
                </span>
              ))}
            </div>

            <Body className="mt-5 text-[15px] leading-relaxed">{p.insight}</Body>

            {/* 强度条 */}
            <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: p.accent }}
                initial={reduce ? false : { width: 0 }}
                whileInView={
                  reduce
                    ? undefined
                    : {
                        width: `${Math.min(100, (p.count / report.totalDreams) * 100)}%`,
                      }
                }
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: EASE }}
              />
            </div>
          </motion.article>
        ))}
      </div>

      {/* —— 对比张力 —— */}
      {report.contrasts.length > 0 && (
        <motion.div
          {...revealProps}
          className="overflow-hidden rounded-2xl border border-white/5 bg-dreamgate-elevated/50 p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-center gap-2 text-dreamgate-text-muted">
            <GitCompareArrows size={14} strokeWidth={1.6} />
            <Caption as="span" className="text-[11px] uppercase tracking-widest">
              对比张力
            </Caption>
          </div>
          <div className="mt-5 space-y-6">
            {report.contrasts.map((c) => (
              <div key={`${c.a}-${c.b}`}>
                <div className="flex items-center gap-4 font-display text-3xl font-medium sm:text-4xl">
                  <span style={{ color: c.aColor }}>{c.a}</span>
                  <span className="text-base text-dreamgate-text-muted">↔</span>
                  <span style={{ color: c.bColor }}>{c.b}</span>
                </div>
                <Body className="mt-2 text-[15px] leading-relaxed">{c.note}</Body>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* —— 反思引导 + 免责 —— */}
      <motion.div {...revealProps} className="border-t border-white/5 pt-6">
        <Caption as="p" className="text-[13px] leading-relaxed text-dreamgate-text-secondary">
          反思一下：这些反复出现的意象，是否对应着你近期生活里某个尚未安放的部分？
        </Caption>
        <Caption as="p" className="mt-2 text-xs text-dreamgate-text-muted">
          以上为基于你梦境记录的概率地图，仅供娱乐与自省，非医疗诊断。
        </Caption>
      </motion.div>
    </section>
  );
}
