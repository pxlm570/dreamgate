// ShareCard — 3D 可定制梦境卡片预览（Task 6.1/6.2）
// CSS 3D perspective 容器 + 卡片微倾 transform；hover 抹平视角
// 上半图像（套 preset.cssFilter）+ 下半文字（情绪/原文摘录/符号/日期）
// forwardRef 暴露 DOM 节点供 html-to-image 导出

import { forwardRef, type CSSProperties } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";
import { presetToKey } from "@/components/Atmosphere";
import { cn } from "@/lib/utils";
import type { CardConfig, BorderStyle } from "./types";

export interface ShareCardProps {
  dream: Dream;
  config: CardConfig;
  /** 只读模式（从分享链接打开）：禁用 3D 倾斜 */
  readOnly?: boolean;
}

/** 边框样式 → Tailwind class（glow 阴影用 inline style 配合情绪色） */
const BORDER_CLASS: Record<BorderStyle, string> = {
  none: "",
  thin: "border border-white/20",
  double: "border-2 border-double border-amber-200/40",
  glow: "border border-white/10",
};

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ dream, config, readOnly = false }, ref) {
    const { artifact, emotion, aestheticPreset } = dream;
    const filterClass = `preset-${presetToKey[aestheticPreset]}`;
    const emotionColor = getEmotionByWord(emotion.word)?.color ?? "#c9b8e8";
    const fontClass = config.fontFamily === "display" ? "font-display" : "font-body";
    const excerpt = dream.rawText.slice(0, config.excerptLength);

    const containerStyle: CSSProperties = { perspective: "1200px" };
    // 只读模式不倾斜（截图更稳）；编辑模式微倾
    const cardStyle: CSSProperties = readOnly
      ? {}
      : {
          transform: "rotateY(-8deg) rotateX(4deg)",
          transition: "transform 0.6s ease-out",
        };
    // glow 阴影用情绪色，与卡片内容呼应
    const glowStyle: CSSProperties =
      config.borderStyle === "glow"
        ? { boxShadow: `0 0 40px -5px ${emotionColor}aa` }
        : {};

    return (
      <div style={containerStyle} className="mx-auto w-full max-w-sm">
        <div
          ref={ref}
          style={{ ...cardStyle, ...glowStyle }}
          className={cn(
            "group relative aspect-[2/3] w-full overflow-hidden rounded-2xl",
            "bg-gradient-to-b from-dreamgate-elevated to-dreamgate-deep",
            BORDER_CLASS[config.borderStyle],
            !readOnly && "hover:[transform:rotateY(0deg)_rotateX(0deg)]",
          )}
        >
          {/* 上半：图像——与走廊画框同一套「画嵌进框」语言：四边内阴影给出进深，
              直接贴图会显平板屏幕感（呼应 DreamDoor 的 innerShadow 处理） */}
          <div className="relative h-1/2 w-full overflow-hidden">
            {artifact.imageUrl ? (
              <img
                src={artifact.imageUrl}
                alt="梦境插画"
                crossOrigin="anonymous"
                className={cn("h-full w-full object-cover", filterClass)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-dreamgate-text-muted/40">
                <ImageIcon size={40} />
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ boxShadow: "inset 0 0 32px 6px rgba(0,0,0,0.45)" }}
            />
            {/* 上下半过渡渐变 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-dreamgate-deep/90 to-transparent" />
          </div>

          {/* 下半：文字 */}
          <div className={cn("flex h-1/2 flex-col gap-3 p-5", fontClass)}>
            {/* 情绪 */}
            {config.fields.emotion && (
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: emotionColor,
                    boxShadow: `0 0 8px ${emotionColor}`,
                  }}
                />
                <span
                  className="text-lg tracking-wide"
                  style={{ color: emotionColor }}
                >
                  {emotion.word}
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-widest text-dreamgate-text-muted">
                  {emotion.tone}
                </span>
              </div>
            )}

            {/* 原文摘录 */}
            {config.fields.rawText && excerpt && (
              <p className="line-clamp-5 text-sm leading-relaxed text-dreamgate-text-secondary">
                {excerpt}
              </p>
            )}

            {/* 符号列表 */}
            {config.fields.symbols && artifact.symbols.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {artifact.symbols.slice(0, 4).map((s, i) => (
                  <span
                    key={`${s.name}-${i}`}
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-dreamgate-text-secondary"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            {/* 日期 */}
            {config.fields.date && (
              <div className="mt-auto pt-2 text-[11px] tracking-wider text-dreamgate-text-muted">
                {formatDate(dream.createdAt)}
              </div>
            )}
          </div>

          {/* 底部情绪色条 */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${emotionColor}, transparent)`,
            }}
          />
        </div>
      </div>
    );
  },
);
