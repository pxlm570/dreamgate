// GenerationProgress — 生成进度 UI（Task 4.6 渐进式呈现）
// 三阶段指示器：① 图像生成中（骨架屏 + 进度条）② 解析中（spinner）③ 完成
// 显示 fallback 状态徽章（种子图 / 规则解析 / 离线）

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Image as ImageIcon, Sparkles, CheckCircle2, CloudOff } from "lucide-react";
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
  { key: "image", label: "图像生成" },
  { key: "analysis", label: "梦境解析" },
  { key: "done", label: "完成" },
] as const;

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
  const activeIdx = STAGES.findIndex((s) => s.key === phase);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* 图像区：骨架屏 / 真图 */}
      <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-dreamgate-elevated/40 shadow-[0_0_60px_-15px_rgba(201,184,232,0.4)]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="梦境插画生成中"
            onError={onImageError}
            className={cn("h-full w-full object-cover", filterClass)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-dreamgate-ethereal/50"
            >
              <ImageIcon size={28} />
              <Caption>正在召唤图像…</Caption>
            </motion.div>
          </div>
        )}
        {phase !== "done" && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dreamgate-elevated/60 via-transparent to-transparent"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* 阶段指示器 */}
      <div className="flex w-full max-w-md items-center justify-between gap-1">
        {STAGES.map((s, i) => {
          const isActive = i === activeIdx;
          const isDone = i < activeIdx || phase === "done";
          return (
            <div key={s.key} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition-all",
                  isDone
                    ? "border-dreamgate-ethereal/60 bg-dreamgate-ethereal/15 text-dreamgate-ethereal"
                    : isActive
                      ? "border-dreamgate-ethereal/40 text-dreamgate-ethereal"
                      : "border-white/10 text-dreamgate-text-muted",
                )}
              >
                {isDone ? <CheckCircle2 size={13} /> : isActive ? <Loader2 size={13} className="animate-spin" /> : <span>{i + 1}</span>}
              </div>
              <Mono className={cn("text-[11px]", isActive || isDone ? "text-dreamgate-text-primary" : "text-dreamgate-text-muted")}>
                {s.label}
              </Mono>
              {i < STAGES.length - 1 && <div className="mx-1 h-px flex-1 bg-white/8" />}
            </div>
          );
        })}
      </div>

      {/* 进度条 */}
      <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-dreamgate-ethereal/70 to-dreamgate-mystical/70"
          animate={{ width: phase === "image" ? "40%" : phase === "analysis" ? "75%" : phase === "done" ? "100%" : "15%" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* 当前阶段说明 + fallback 徽章 */}
      <div className="flex flex-col items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-dreamgate-text-secondary"
          >
            {phase === "image" && <Sparkles size={13} className="text-dreamgate-ethereal" />}
            {phase === "analysis" && <Loader2 size={13} className="animate-spin text-dreamgate-ethereal" />}
            <Caption as="span" className="text-sm">
              {phase === "image" && "正在生成梦境插画…"}
              {phase === "analysis" && "正在解析情绪与符号…"}
              {phase === "done" && "藏品已生成"}
              {phase === "idle" && "准备中…"}
            </Caption>
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
