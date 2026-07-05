// DreamImmersive — 「画即世界」全幅沉浸藏品页
// 梦境图全屏铺满作为舞台，情绪/原文/符号/解析作为编辑式排版直接叠在画面上，
// 滚动逐幕揭示；滚动越深图像越缓慢推近、暗场越沉——像在画的内部越走越深。
// （gpt-image 从画框里解放出来：页面不是「展示图片的页面」，页面就是这幅画的内部）

import { useState, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Caption, Mono, Body } from "@/components/ui";
import { presetToKey } from "@/components/Atmosphere";
import { getEmotionByWord } from "@/lib/emotions";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { Dream } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
/** 幕2 原文超过此字数则收进可展开引文（保住大字排版的呼吸感） */
const LONG_TEXT_LIMIT = 120;

/** 滚动揭示：进入视口时上浮显现（once，画册翻页感） */
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-16% 0px" }}
      transition={{ duration: 0.95, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** 章节小标：编号 + 标题（美术馆图录语言，与画廊 N° 编号一脉） */
function SectionMark({ no, title, align = "left", color }: { no: string; title: string; align?: "left" | "right"; color: string }) {
  return (
    <div className={cn("flex items-center gap-3", align === "right" && "flex-row-reverse")}>
      <Mono className="text-[11px] tracking-[0.3em]" style={{ color }}>{no}</Mono>
      <span className="h-px w-10" style={{ background: `${color}66` }} />
      <Caption as="span" className="text-[11px] uppercase tracking-[0.42em]">{title}</Caption>
    </div>
  );
}

export interface DreamImmersiveProps {
  dream: Dream;
  onImageError?: () => void;
}

export function DreamImmersive({ dream, onImageError }: DreamImmersiveProps) {
  const { artifact, emotion, aestheticPreset, rawText, createdAt } = dream;
  const reduceMotion = usePrefersReducedMotion();
  const filterClass = `preset-${presetToKey[aestheticPreset]}`;
  const emotionColor = getEmotionByWord(emotion.word)?.color ?? "#c9b8e8";
  const intensityPct = Math.round(emotion.intensity * 100);
  const dateStr = new Date(createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  const isLongText = rawText.length > LONG_TEXT_LIMIT;
  const [textExpanded, setTextExpanded] = useState(false);

  // 滚动进度：驱动背景图缓慢推近 + 暗场加深（越读越沉入画中）
  const { scrollYProgress } = useScroll();
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.2]);
  const scrimOpacity = useTransform(scrollYProgress, [0.03, 0.28], [0, 0.62]);

  return (
    <div className="relative">
      {/* ===== 舞台：全屏梦境图（fixed，滚动时缓慢推近） ===== */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-dreamgate-deep">
        {artifact.imageUrl ? (
          <motion.div style={reduceMotion ? undefined : { scale: imgScale }} className="h-full w-full">
            <img
              src={artifact.imageUrl}
              alt="梦境画作"
              onError={onImageError}
              className={cn("h-full w-full object-cover", filterClass)}
            />
          </motion.div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dreamgate-text-muted">
            <ImageIcon size={40} />
          </div>
        )}
        {/* 底部常驻渐隐（首屏文字可读性） */}
        <div className="absolute inset-x-0 bottom-0 h-[46vh] bg-gradient-to-t from-black/78 via-black/24 to-transparent" />
        {/* 顶部极轻渐隐（浮动操作栏可读性） */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        {/* 滚动暗场：随阅读深入而沉暗，文字浮于画上仍可读 */}
        <motion.div
          style={reduceMotion ? { opacity: 0.5 } : { opacity: scrimOpacity }}
          className="absolute inset-0 bg-[#050509]"
        />
      </div>

      {/* ===== 幕1 · 落地首屏：画占满视野，只留下角编辑式署名 ===== */}
      <section className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-16 sm:px-12 md:px-20">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
          className="max-w-3xl"
        >
          <Caption as="div" className="font-mono text-[10px] tracking-[0.42em]">
            梦境藏品 · {dateStr} · {aestheticPreset}
          </Caption>
          <h1
            className="mt-4 font-display leading-none tracking-[0.06em] text-dreamgate-text-primary"
            style={{ fontSize: "clamp(3.2rem, 9vw, 6.5rem)", textShadow: "0 4px 42px rgba(0,0,0,0.9)" }}
          >
            {emotion.word}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: emotionColor, boxShadow: `0 0 12px ${emotionColor}` }} />
            <Caption as="span" className="text-[11px]">基调 · {emotion.tone}</Caption>
            {artifact.imageSource === "seed" && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-200/80">
                <ImageIcon size={10} /> 种子图
              </span>
            )}
            {artifact.analysisSource === "rule" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] text-sky-200/80">
                <Sparkles size={10} /> 规则解析
              </span>
            )}
          </div>
        </motion.div>
        {/* 滚动提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-1.5"
        >
          <Caption as="span" className="text-[10px] uppercase tracking-[0.5em]">向下 · 步入画中</Caption>
          <ChevronDown size={14} className="animate-gate-arrow text-dreamgate-ethereal/80" />
        </motion.div>
      </section>

      {/* ===== 幕2 · 梦境原文：大字宋体独占一幕（文字即画面）
              长梦收进可展开引文：先给克制的节选保住排版，一键展开读全文 ===== */}
      <section className="relative z-10 flex min-h-[92vh] items-center px-6 sm:px-12 md:px-20">
        <Reveal className="max-w-3xl">
          <SectionMark no="01" title="梦境原文" color={emotionColor} />
          <p
            className={cn(
              "mt-8 font-display leading-[1.65] text-dreamgate-text-primary",
              isLongText ? "text-[1.35rem] md:text-[1.8rem]" : "text-[1.7rem] md:text-[2.4rem]",
            )}
            style={{ textShadow: "0 2px 30px rgba(0,0,0,0.9)" }}
          >
            {isLongText && !textExpanded ? rawText.slice(0, LONG_TEXT_LIMIT) + "……" : rawText}
          </p>
          {isLongText && (
            <button
              type="button"
              onClick={() => setTextExpanded((v) => !v)}
              className="mt-7 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.32em] transition-opacity hover:opacity-75"
              style={{ color: emotionColor }}
            >
              {textExpanded ? "收起引文" : "展开全文"}
              <ChevronDown size={12} className={cn("transition-transform duration-300", textExpanded && "rotate-180")} />
            </button>
          )}
        </Reveal>
      </section>

      {/* ===== 幕3 · 主导情绪：右侧编辑式排版（与幕2 左对齐交替） ===== */}
      <section className="relative z-10 flex min-h-[86vh] items-center justify-end px-6 sm:px-12 md:px-20">
        <Reveal className="flex max-w-md flex-col items-end text-right">
          <SectionMark no="02" title="主导情绪" align="right" color={emotionColor} />
          <div className="mt-8 font-display text-5xl tracking-wide md:text-6xl" style={{ color: emotionColor, textShadow: `0 0 46px ${emotionColor}55` }}>
            {emotion.word}
          </div>
          <Caption as="div" className="mt-3 text-[11px]">基调 · {emotion.tone}</Caption>
          <div className="mt-8 w-64 max-w-full">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-dreamgate-text-muted">
              <Mono>强度</Mono>
              <Mono>{intensityPct}%</Mono>
            </div>
            <div className="h-px w-full bg-white/15">
              <motion.div
                className="h-px"
                style={{ background: emotionColor, boxShadow: `0 0 8px ${emotionColor}` }}
                initial={{ width: 0 }}
                whileInView={{ width: `${intensityPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== 幕4 · 符号地图（有符号才出现） ===== */}
      {artifact.symbols.length > 0 && (
        <section className="relative z-10 flex min-h-[86vh] items-center px-6 sm:px-12 md:px-20">
          <Reveal className="w-full max-w-xl">
            <SectionMark no="03" title="符号地图" color={emotionColor} />
            <div className="mt-10 flex flex-col gap-9">
              {artifact.symbols.map((s, i) => (
                <motion.div
                  key={`${s.name}-${i}`}
                  initial={{ opacity: 0, x: -22 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.12 * i }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-display text-2xl text-dreamgate-text-primary md:text-3xl" style={{ textShadow: "0 2px 22px rgba(0,0,0,0.85)" }}>
                      {s.name}
                    </span>
                    <Mono className="text-[11px] text-dreamgate-text-muted">{Math.round(s.probability * 100)}%</Mono>
                  </div>
                  <div className="mt-2.5 h-px w-full bg-white/15">
                    <motion.div
                      className="h-px"
                      style={{ background: emotionColor, boxShadow: `0 0 8px ${emotionColor}` }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.round(s.probability * 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: EASE, delay: 0.12 * i + 0.25 }}
                    />
                  </div>
                  <Body as="p" className="mt-2.5 max-w-lg text-sm leading-relaxed text-dreamgate-text-secondary">
                    {s.note}
                  </Body>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ===== 幕5 · 梦境解析：收束幕 ===== */}
      <section className="relative z-10 flex min-h-[92vh] flex-col items-center justify-center px-6 pb-36 sm:px-12">
        <Reveal className="flex w-full max-w-2xl flex-col items-center text-center">
          <SectionMark no="04" title="梦境解析" color={emotionColor} />
          <Body as="p" className="mt-10 whitespace-pre-line font-body text-lg leading-loose text-dreamgate-text-primary md:text-xl" >
            {artifact.emotionAnalysis || "（暂无解析文本）"}
          </Body>
          <div className="mt-14 h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${emotionColor}88, transparent)` }} />
          <div className="mt-8 flex items-start gap-2 text-left">
            <AlertCircle size={12} className="mt-0.5 shrink-0 text-dreamgate-text-muted" />
            <Caption as="p" className="max-w-md text-[11px] leading-relaxed">
              梦境解析仅供自省与娱乐，非心理诊断。若情绪困扰持续，请寻求专业帮助。
            </Caption>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
