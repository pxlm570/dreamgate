// GateOverlay — 镜之门 HTML 文字叠层（增强版）
// 分步入场序列：顶部光线 → 标签 → 主标题（字符级 blur 揭示）→ 幕间文案
//
// 入场动画用「纯 CSS animation」实现，而非 framer 的 mount 动画：
//   首屏 3D 场景初始化会在挂载瞬间占用主线程，framer 的一次性 mount 动画可能被丢帧，
//   导致文字停留在 initial 透明态（dev/prod 偶发首屏空相框）。CSS 动画跑在合成层、
//   带 fill-mode: both，不会被主线程拥塞「丢掉」，保证文字必然可见。
//
// 分幕排版（kimi 式让位）：幕0 = 打字海报（标题是主角，门立远景）；
// 幕1 = 物体特写——标题/顶标整体隐去让位给镜面，文案区锚在屏幕底部
// （镜面之下的暗地板区域，不再压在镜面亮部上）。

import { useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Display, Caption } from "@/components/ui";

export interface GateOverlayProps {
  /** 是否显示（idle 阶段显示，触发后淡出） */
  visible: boolean;
  /** 分幕（kimi 式舞台）：0=远景幕（只有标题+靠近提示），1=近景幕（副文案+踏入提示） */
  act?: 0 | 1;
}

const TITLE_CHARS = ["踏", "入", "梦", "境"];

export function GateOverlay({ visible, act = 1 }: GateOverlayProps) {
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
      className="pointer-events-none absolute inset-0 z-10"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.7s ease-out" }}
    >
      {/* ===== 标题组（视差层）：幕0 主角，幕1 整体隐去让位给镜面 ===== */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <motion.div
          style={{
            x: sx,
            y: sy,
            opacity: act === 0 ? 1 : 0,
            transition: "opacity 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
          className="flex flex-col items-center"
        >
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

          {/* 主标题：字符级分步 blur 揭示；幕0 放大为画面主角 */}
          <div
            style={{
              transform: `scale(${act === 0 ? 1.8 : 1})`,
              transition: "transform 1.7s cubic-bezier(0.22,1,0.36,1)",
              transformOrigin: "center 60%",
            }}
          >
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
          </div>
        </motion.div>
      </div>

      {/* ===== 幕间文案区：锚在屏幕底部（暗地板区域），不与镜面抢画面 ===== */}
      <div className="absolute inset-x-0 bottom-8 flex justify-center px-6 md:bottom-10">
        <AnimatePresence mode="wait">
          {act === 0 ? (
            <motion.div
              key="act0"
              /* 首挂不用 framer 入场（3D 初始化抢主线程会丢帧卡在透明态——历史 bug 根因），
                 入场交给 CSS 动画；framer 只管幕间退场 */
              initial={false}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="animate-gate-up flex flex-col items-center gap-3"
              style={{ animationDelay: "2.1s" }}
            >
              <Caption className="block text-xs uppercase tracking-[0.5em] text-dreamgate-text-secondary md:text-sm">
                滚动 · 靠近梦境
              </Caption>
              <svg width="14" height="22" viewBox="0 0 14 22" fill="none" className="animate-gate-arrow text-dreamgate-ethereal">
                <path d="M7 2 V18 M2 13 L7 18 L12 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="act1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
              className="flex flex-col items-center"
            >
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-dreamgate-ethereal/70 to-transparent" />
              <p className="mt-5 max-w-md text-center font-body text-sm italic tracking-wide text-dreamgate-text-secondary md:text-base">
                在这扇门之后，藏着你尚未读懂的自己
              </p>
              <div className="mt-6 flex flex-col items-center gap-2.5">
                <Caption className="block text-xs uppercase tracking-[0.5em] text-dreamgate-text-secondary md:text-sm">
                  点击 · 或再滚动 · 踏入梦境
                </Caption>
                <svg width="14" height="22" viewBox="0 0 14 22" fill="none" className="animate-gate-arrow text-dreamgate-ethereal">
                  <path d="M7 2 V18 M2 13 L7 18 L12 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
