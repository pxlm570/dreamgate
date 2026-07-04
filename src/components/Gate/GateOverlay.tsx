// GateOverlay — 镜之门 HTML 文字叠层（增强版）
// 分步入场序列：顶部光线 → 标签 → 主标题（字符级 blur 揭示）→ 分隔线 → 副标题 → 提示
//
// 入场动画用「纯 CSS animation」实现，而非 framer 的 mount 动画：
//   首屏 3D 场景初始化会在挂载瞬间占用主线程，framer 的一次性 mount 动画可能被丢帧，
//   导致文字停留在 initial 透明态（dev/prod 偶发首屏空相框）。CSS 动画跑在合成层、
//   带 fill-mode: both，不会被主线程拥塞「丢掉」，保证文字必然可见。
// 整体显隐由外层 div 的 opacity（React 驱动）控制；鼠标视差仍用 framer（仅影响 transform，
// 不影响可见性，安全）。

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Display, Caption } from "@/components/ui";

export interface GateOverlayProps {
  /** 是否显示（idle 阶段显示，触发后淡出） */
  visible: boolean;
}

const TITLE_CHARS = ["踏", "入", "梦", "境"];

export function GateOverlay({ visible }: GateOverlayProps) {
  // 鼠标视差：文字层随鼠标轻微偏移
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 80, damping: 20, mass: 0.5 });

  useEffect(() => {
    if (!visible) return;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mx.set(((e.clientX - cx) / cx) * 12); // 最大 ±12px
      my.set(((e.clientY - cy) / cy) * 8);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [visible, mx, my]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.7s ease-out" }}
    >
      <motion.div style={{ x: sx, y: sy }} className="flex flex-col items-center">
        {/* 顶部细光线：自上而下点亮，引导视线落到标题 */}
        <div
          className="animate-gate-line mb-7 h-14 w-px origin-top bg-gradient-to-b from-transparent to-dreamgate-ethereal/70"
          style={{ animationDelay: "0.1s" }}
        />

        {/* 顶部小标签：DREAMGATE */}
        <div
          className="animate-gate-up mb-9 font-mono text-[10px] uppercase tracking-[0.62em] text-dreamgate-ethereal/80 md:text-xs"
          style={{ animationDelay: "0.3s", paddingLeft: "0.62em" }}
        >
          DREAMGATE
        </div>

        {/* 主标题：字符级分步 blur 揭示（克制而优雅的尺度 + 宽字距，不与镜面争焦点） */}
        <Display className="flex pl-[0.32em] font-extralight leading-none tracking-[0.32em] text-[clamp(2.75rem,6.5vw,5rem)] text-dreamgate-text-primary">
          {TITLE_CHARS.map((ch, i) => (
            <span
              key={i}
              className="animate-gate-rise inline-block"
              style={{ animationDelay: `${0.6 + i * 0.14}s` }}
            >
              {ch}
            </span>
          ))}
        </Display>

        {/* 分隔线：从中心展开 */}
        <div
          className="animate-gate-divider mt-8 h-px w-32 origin-center bg-gradient-to-r from-transparent via-dreamgate-ethereal/70 to-transparent"
          style={{ animationDelay: "1.4s" }}
        />

        {/* 副标题：诗意一句话 */}
        <p
          className="animate-gate-up mt-7 max-w-md text-center font-body text-sm italic tracking-wide text-dreamgate-text-secondary md:text-base"
          style={{ animationDelay: "1.8s" }}
        >
          在镜面之后，藏着你尚未读懂的自己
        </p>

        {/* 底部提示：呼吸入场 + 向下箭头微动 */}
        <div
          className="animate-gate-up mt-12 flex flex-col items-center gap-3"
          style={{ animationDelay: "2.4s" }}
        >
          <Caption className="block text-xs uppercase tracking-[0.5em] text-dreamgate-text-secondary md:text-sm">
            点击 · 或滚动 · 进入
          </Caption>
          <svg
            width="14"
            height="22"
            viewBox="0 0 14 22"
            fill="none"
            className="animate-gate-arrow text-dreamgate-ethereal"
          >
            <path
              d="M7 2 V18 M2 13 L7 18 L12 13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
