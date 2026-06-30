// DreamCard2D — 2.5D 视差画廊单卡
// 玻璃感卡片：图像（套 preset 滤镜）+ 情绪色条 + 标题 + 情绪词
// GSAP scrollTrigger scrub 控制 translateZ / rotateX，产生纵深

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";
import { presetToKey } from "@/components/Atmosphere";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export interface DreamCard2DProps {
  dream: Dream;
  onClick: (dream: Dream) => void;
}

export function DreamCard2D({ dream, onClick }: DreamCard2DProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const emotionColor =
    getEmotionByWord(dream.emotion.word)?.color ?? "#c9b8e8";
  const filterClass = `preset-${presetToKey[dream.aestheticPreset]}`;
  const title =
    dream.rawText.length > 20
      ? dream.rawText.slice(0, 20) + "…"
      : dream.rawText || "（无题）";
  const imageUrl = dream.artifact.imageUrl;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.set(el, { transformPerspective: 1000, transformStyle: "preserve-3d" });
    const tween = gsap.fromTo(
      el,
      { z: -240, rotationX: 16, opacity: 0.2 },
      {
        z: 0,
        rotationX: 0,
        opacity: 1,
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "center center",
          scrub: 0.5,
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <motion.button
      ref={cardRef}
      type="button"
      onClick={() => onClick(dream)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      className="relative mx-auto block w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-dreamgate-elevated/60 text-left backdrop-blur-xl"
      style={{ boxShadow: `0 8px 40px -10px ${emotionColor}33` }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className={cn("h-full w-full object-cover", filterClass)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: emotionColor }}
          >
            <span className="font-mono text-sm text-white/70 tracking-widest">
              生成中
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: emotionColor, boxShadow: `0 0 12px ${emotionColor}` }}
        />
        <div className="absolute right-3 top-3 opacity-60">
          <ArrowRight size={14} className="text-white" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span
            className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px]"
            style={{ color: emotionColor }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: emotionColor }}
            />
            {dream.emotion.word}
          </span>
          <p className="line-clamp-2 font-display text-lg text-white text-glow-soft">
            {title}
          </p>
        </div>
      </div>
    </motion.button>
  );
}
