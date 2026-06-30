// GateOverlay — 镜之门 HTML 文字叠层（增强版）
// 分步入场序列：顶部标签 → 主标题（字符级）→ 分隔线展开 → 副标题 → 底部提示
// 鼠标视差：文字层随鼠标轻微偏移，增强空间感
// pointer-events-none，让点击穿透到下层 wrapper 触发转场

import { useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
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
      mx.set((e.clientX - cx) / cx * 12); // 最大 ±12px
      my.set((e.clientY - cy) / cy * 8);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [visible, mx, my]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 1.0 }}
        >
          <motion.div
            style={{ x: sx, y: sy }}
            className="flex flex-col items-center"
          >
            {/* 顶部小标签：DREAMGATE */}
            <motion.span
              initial={{ opacity: 0, y: -10, letterSpacing: "0.1em" }}
              animate={{ opacity: 0.6, y: 0, letterSpacing: "0.6em" }}
              transition={{ duration: 1.4, delay: 0.2 }}
              className="font-mono text-[10px] md:text-xs uppercase text-dreamgate-ethereal/70 mb-8"
            >
              DREAMGATE
            </motion.span>

            {/* 主标题：字符级分步入场 */}
            <Display className="flex font-light tracking-[0.35em] text-dreamgate-text-primary text-5xl md:text-7xl">
              {TITLE_CHARS.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.9,
                    delay: 0.6 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </Display>

            {/* 分隔线：从中心展开 */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.0, delay: 1.4, ease: "easeOut" }}
              className="mt-7 h-px w-28 origin-center bg-gradient-to-r from-transparent via-dreamgate-ethereal/70 to-transparent"
            />

            {/* 副标题：诗意一句话 */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.75, y: 0 }}
              transition={{ duration: 1.0, delay: 1.8 }}
              className="mt-6 font-body text-sm md:text-base text-dreamgate-text-secondary italic tracking-wide text-center max-w-md"
            >
              在镜面之后，藏着你尚未读懂的自己
            </motion.p>

            {/* 底部提示：呼吸闪烁 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.5] }}
              transition={{
                duration: 1.2,
                delay: 2.4,
                times: [0, 0.5, 1],
              }}
              className="mt-10 flex flex-col items-center gap-3"
            >
              <Caption className="block text-xs md:text-sm tracking-[0.5em] uppercase text-dreamgate-text-secondary">
                点击 · 或滚动 · 进入
              </Caption>
              {/* 向下箭头：微动提示 */}
              <motion.svg
                width="14"
                height="20"
                viewBox="0 0 14 20"
                fill="none"
                animate={{ y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <path
                  d="M7 2 V17 M2 12 L7 17 L12 12"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-dreamgate-ethereal"
                />
              </motion.svg>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
