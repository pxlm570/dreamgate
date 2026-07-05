// GenerationProgress — 「显影」舞台（Task 4.6 渐进式呈现 · 画即世界版）
// 把最长的等待（gpt-image ~40s）变成最有仪式感的一幕：
// 暗房静置 → 影像自深度模糊/低饱和中缓缓「显影」成型 → 扫光走过 → 落款。
// 不用机械进度条思维：显影动画本身就是进度的叙事。

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Sparkles, CloudOff } from "lucide-react";
import { Caption, Mono } from "@/components/ui";
import { presetToKey } from "@/components/Atmosphere";
import { cn } from "@/lib/utils";
import type { AestheticPresetName } from "@/lib/types";

export interface GenerationProgressProps {
  phase: "idle" | "image" | "analysis" | "done";
  previewUrl?: string;
  preset: AestheticPresetName;
  imageFallback?: boolean;
  analysisFallback?: boolean;
  offline?: boolean;
  onImageError?: () => void;
}

const STAGES = [
  { key: "image", label: "显影" },
  { key: "analysis", label: "辨纹" },
  { key: "done", label: "落款" },
] as const;

const PHASE_COPY: Record<string, { main: string; sub: string }> = {
  idle: { main: "暗房准备中……", sub: "为这场梦腾出一方安静" },
  image: { main: "梦境正在显影……", sub: "影像自模糊深处缓缓浮现，请稍候" },
  analysis: { main: "正在辨认梦的纹理与符号……", sub: "情绪的走向、意象的重量，逐一落笔" },
  done: { main: "藏品落款完成", sub: "这场梦已被永久收藏" },
};

const BADGE_CLS: Record<string, string> = {
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200/80",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-200/80",
  zinc: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200/80",
};

function Badge({ children, color, icon }: { children: ReactNode; color: "amber" | "sky" | "zinc"; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono", BADGE_CLS[color])}>
      {icon}{children}
    </span>
  );
}

export function GenerationProgress({
  phase, previewUrl, preset, imageFallback, analysisFallback, offline, onImageError,
}: GenerationProgressProps) {
  const filterClass = `preset-${presetToKey[preset]}`;
  const activeIdx = Math.max(STAGES.findIndex((s) => s.key === phase), 0);
  // 显影：图片加载完成前保持深度模糊态；URL 变化（fallback 换图）时重新显影
  const [developed, setDeveloped] = useState(false);
  useEffect(() => {
    setDeveloped(false);
  }, [previewUrl]);
  const copy = PHASE_COPY[phase] ?? PHASE_COPY.idle;

  return (
    <div className="flex flex-col items-center gap-7 py-6">
      {/* ===== 显影台：暗房里的相纸 ===== */}
      <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14] shadow-[0_0_80px_-20px_rgba(201,184,232,0.35)]">
        {previewUrl ? (
          <img
            key={previewUrl}
            src={previewUrl}
            alt="梦境显影中"
            onError={onImageError}
            onLoad={() => setDeveloped(true)}
            className={cn("h-full w-full object-cover", filterClass)}
            style={{
              filter: developed ? "blur(0px) saturate(1)" : "blur(28px) saturate(0.55)",
              transform: developed ? "scale(1)" : "scale(1.1)",
              opacity: developed ? 1 : 0.82,
              transition:
                "filter 2.6s cubic-bezier(0.22,1,0.36,1), transform 2.6s cubic-bezier(0.22,1,0.36,1), opacity 1.4s ease-out",
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {/* 暗房呼吸：无图时不放骨架屏，放一团缓慢呼吸的微光（相纸在药液中静置） */}
            <motion.div
              animate={{ opacity: [0.16, 0.4, 0.16], scale: [1, 1.12, 1] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
              className="h-44 w-44 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(201,184,232,0.5), rgba(139,92,246,0.14) 55%, transparent 72%)" }}
            />
            <Caption as="div" className="absolute bottom-6 text-[11px] tracking-[0.3em]">
              暗房静置中
            </Caption>
          </div>
        )}
        {/* 扫光：一道柔光缓缓扫过相纸（显影液流过的光泽），完成后停止 */}
        {phase !== "done" && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3"
            style={{ background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.07) 45%, rgba(201,184,232,0.1) 55%, transparent)" }}
            animate={{ left: ["-40%", "110%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.1 }}
          />
        )}
        {/* 边缘暗角：相纸四周沉入暗房 */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.55)]" />
      </div>

      {/* ===== 阶段词：显影 · 辨纹 · 落款（美术馆图录语言，替代机械进度条） ===== */}
      <div className="flex items-center gap-4">
        {STAGES.map((s, i) => {
          const isActive = i === activeIdx && phase !== "done";
          const isDone = i < activeIdx || phase === "done";
          return (
            <div key={s.key} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full"
                  animate={
                    isActive
                      ? { opacity: [0.5, 1, 0.5], scale: [1, 1.35, 1] }
                      : { opacity: isDone ? 1 : 0.25, scale: 1 }
                  }
                  transition={isActive ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                  style={{
                    background: isActive || isDone ? "#c9b8e8" : "rgba(255,255,255,0.35)",
                    boxShadow: isActive || isDone ? "0 0 8px rgba(201,184,232,0.9)" : "none",
                  }}
                />
                <Mono
                  className={cn(
                    "text-[11px] tracking-[0.3em] transition-colors duration-500",
                    isActive || isDone ? "text-dreamgate-text-primary" : "text-dreamgate-text-muted",
                  )}
                >
                  {s.label}
                </Mono>
              </div>
              {i < STAGES.length - 1 && <span className="h-px w-8 bg-white/12" />}
            </div>
          );
        })}
      </div>

      {/* ===== 诗性阶段文案 + fallback 徽章 ===== */}
      <div className="flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span className="font-display text-lg tracking-wide text-dreamgate-text-primary">
              {copy.main}
            </span>
            <Caption as="span" className="text-[11px]">{copy.sub}</Caption>
          </motion.div>
        </AnimatePresence>

        {(imageFallback || analysisFallback || offline) && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {offline && <Badge color="zinc" icon={<CloudOff size={10} />}>离线模式</Badge>}
            {imageFallback && <Badge color="amber" icon={<ImageIcon size={10} />}>图像走种子库</Badge>}
            {analysisFallback && <Badge color="sky" icon={<Sparkles size={10} />}>解析走规则</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}
