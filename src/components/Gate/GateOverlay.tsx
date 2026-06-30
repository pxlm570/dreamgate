// GateOverlay — 镜之门 HTML 文字叠层
// "踏入梦境" + 提示，使用 Display（display 字体 + text-glow）+ 缓慢呼吸动画
// pointer-events-none，让点击穿透到下层 wrapper 触发转场

import { AnimatePresence, motion } from "framer-motion";
import { Display, Caption } from "@/components/ui";

export interface GateOverlayProps {
  /** 是否显示（idle 阶段显示，触发后淡出） */
  visible: boolean;
}

export function GateOverlay({ visible }: GateOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 1.4, delay: 0.4 }}
        >
          <motion.div
            animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.025, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <Display className="text-5xl md:text-7xl font-light tracking-[0.35em] text-dreamgate-text-primary">
              踏入梦境
            </Display>
            <div className="mt-7 h-px w-28 bg-gradient-to-r from-transparent via-dreamgate-ethereal/70 to-transparent" />
            <Caption className="mt-7 block text-xs md:text-sm tracking-[0.5em] uppercase text-dreamgate-text-secondary">
              点击 · 或滚动 · 进入
            </Caption>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
