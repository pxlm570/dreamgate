// ArtifactView — 藏品展示（Task 4.3/4.4/4.5 渲染）
// 图像（套 preset.cssFilter + 圆角 + 阴影 + glow）+ 情绪标签 + 符号概率地图 + 解析文本 + 免责

import { motion } from "framer-motion";
import { Sparkles, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Body, Caption, Mono } from "@/components/ui";
import { presetToKey } from "@/components/Atmosphere";
import { getEmotionByWord } from "@/lib/emotions";
import { cn } from "@/lib/utils";
import type { Dream } from "@/lib/types";

export interface ArtifactViewProps {
  dream: Dream;
  onImageError?: () => void;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export function ArtifactView({ dream, onImageError }: ArtifactViewProps) {
  const { artifact, emotion, aestheticPreset } = dream;
  const filterClass = `preset-${presetToKey[aestheticPreset]}`;
  const emotionColor = getEmotionByWord(emotion.word)?.color ?? "#c9b8e8";
  const intensityPct = Math.round(emotion.intensity * 100);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* 图像 */}
      <motion.div variants={item} className="flex flex-col items-center">
        <div
          className="relative aspect-square w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
          style={{ boxShadow: `0 0 60px -15px ${emotionColor}66` }}
        >
          {artifact.imageUrl ? (
            <img
              src={artifact.imageUrl}
              alt="梦境插画"
              onError={onImageError}
              className={cn("h-full w-full object-cover", filterClass)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-dreamgate-text-muted">
              <ImageIcon size={32} />
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {artifact.imageSource === "seed" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono text-amber-200/80">
              <ImageIcon size={10} /> 种子图
            </span>
          )}
          {artifact.analysisSource === "rule" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-mono text-sky-200/80">
              <Sparkles size={10} /> 规则解析
            </span>
          )}
        </div>
      </motion.div>

      {/* 情绪标签 */}
      <motion.div variants={item} className="rounded-xl border border-white/8 bg-dreamgate-elevated/60 p-5 backdrop-blur-md">
        <Caption as="div" className="mb-2 text-[11px] uppercase tracking-widest">主导情绪</Caption>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ background: emotionColor, boxShadow: `0 0 10px ${emotionColor}` }} />
          <span className="font-display text-2xl tracking-wide" style={{ color: emotionColor }}>{emotion.word}</span>
          <Caption>基调 · {emotion.tone}</Caption>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-dreamgate-text-muted">
            <Mono>强度</Mono><Mono>{intensityPct}%</Mono>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full"
              style={{ background: emotionColor }}
              initial={{ width: 0 }}
              animate={{ width: `${intensityPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>
      </motion.div>

      {/* 符号概率地图 */}
      {artifact.symbols.length > 0 && (
        <motion.div variants={item} className="rounded-xl border border-white/8 bg-dreamgate-elevated/60 p-5 backdrop-blur-md">
          <Caption as="div" className="mb-3 text-[11px] uppercase tracking-widest">符号概率地图</Caption>
          <div className="flex flex-col gap-3">
            {artifact.symbols.map((s, i) => (
              <div key={`${s.name}-${i}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-display text-base text-dreamgate-text-primary">{s.name}</span>
                  <Mono className="text-[11px] text-dreamgate-text-muted">{Math.round(s.probability * 100)}%</Mono>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: emotionColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(s.probability * 100)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 * i }}
                  />
                </div>
                <Body as="p" className="mt-1 text-xs leading-relaxed text-dreamgate-text-secondary">{s.note}</Body>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 解析文本 */}
      <motion.div variants={item} className="rounded-xl border border-white/8 bg-dreamgate-elevated/60 p-6 backdrop-blur-md">
        <Caption as="div" className="mb-3 text-[11px] uppercase tracking-widest">梦境解析</Caption>
        <Body as="p" className="whitespace-pre-line text-lg leading-relaxed text-dreamgate-text-primary text-glow-soft">
          {artifact.emotionAnalysis || "（暂无解析文本）"}
        </Body>
      </motion.div>

      {/* 免责声明 */}
      <motion.div variants={item} className="flex items-start gap-2 px-1 pb-4">
        <AlertCircle size={12} className="mt-0.5 shrink-0 text-dreamgate-text-muted" />
        <Caption as="p" className="text-[11px] leading-relaxed">
          梦境解析仅供自省与娱乐，非心理诊断。若情绪困扰持续，请寻求专业帮助。
        </Caption>
      </motion.div>
    </motion.div>
  );
}
