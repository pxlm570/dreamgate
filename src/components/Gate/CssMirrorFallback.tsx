// CssMirrorFallback — CSS 降级版镜之门转场
// WebGL 不可用 / 低端设备时使用：CSS 镜面 + framer-motion 16 碎片飞散 + 雾气渐变
// 同样约 2 秒后调用 onComplete，由 GatePage 跳转 /gallery

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Display, Caption } from "@/components/ui";

export interface CssMirrorFallbackProps {
  /** 是否触发碎镜转场 */
  triggering: boolean;
  /** 转场完成回调 */
  onComplete: () => void;
}

interface ShardData {
  left: number;
  top: number;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
}

export function CssMirrorFallback({
  triggering,
  onComplete,
}: CssMirrorFallbackProps) {
  const shards = useMemo<ShardData[]>(() => {
    const cols = 4;
    const rows = 4;
    return Array.from({ length: cols * rows }, (_, i) => {
      const cx = (i % cols) - (cols - 1) / 2;
      const cy = Math.floor(i / cols) - (rows - 1) / 2;
      const angle = Math.atan2(cy, cx) + (Math.random() - 0.5) * 0.6;
      const dist = 55 + Math.random() * 35;
      return {
        left: 50 + cx * 11,
        top: 50 + cy * 14,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.12,
      };
    });
  }, []);

  useEffect(() => {
    if (!triggering) return;
    const t = window.setTimeout(onComplete, 2000);
    return () => window.clearTimeout(t);
  }, [triggering, onComplete]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-dreamgate-deep">
      {/* 底层氛围光 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 50%, rgba(70,55,110,0.45) 0%, transparent 70%)",
        }}
      />

      {/* 大理石拱门（idle 时显示，触发后淡出收缩）——与 3D 版白卡拉拉拱门同一造型语言 */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: "min(26vw, 300px)", height: "min(40vw, 460px)" }}
        initial={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
        animate={{
          opacity: triggering ? 0 : 1,
          scale: triggering ? 0.85 : 1,
          x: "-50%",
          y: "-50%",
        }}
        transition={{ duration: 0.4, ease: "easeIn" }}
      >
        {/* 门框：白大理石渐变 + 拱顶圆角；底部开放（门无底杠） */}
        <div
          className="h-full w-full"
          style={{
            borderRadius: "50% 50% 0 0 / 32% 32% 0 0",
            padding: "min(2.4vw, 26px)",
            paddingBottom: 0,
            background: "linear-gradient(160deg, #f2f0ec 0%, #d8d5cf 48%, #ecebe6 100%)",
            boxShadow:
              "0 0 70px rgba(201,184,232,0.3), inset 0 1px 14px rgba(255,255,255,0.6), inset 0 -6px 18px rgba(110,100,135,0.28)",
          }}
        >
          {/* 门洞：梦境画（缺图时渐变底自然兜底），拱形裁切 */}
          <div
            className="h-full w-full overflow-hidden"
            style={{
              borderRadius: "50% 50% 0 0 / 34% 34% 0 0",
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(78,201,176,0.1) 55%, rgba(164,80,139,0.28)), url(/textures/mirror-dream.png) center / cover no-repeat, linear-gradient(160deg, #171230, #0b0918)",
              boxShadow: "inset 0 0 46px rgba(12,8,30,0.6)",
            }}
          />
        </div>
      </motion.div>

      {/* 碎片飞散（触发时显示） */}
      {triggering &&
        shards.map((s, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s.left}%`, top: `${s.top}%` }}
          >
            <motion.div
              initial={{ x: "0vw", y: "0vh", opacity: 1, rotate: 0 }}
              animate={{
                x: `${s.dx}vw`,
                y: `${s.dy}vh`,
                opacity: 0,
                rotate: s.rot,
              }}
              transition={{
                duration: 1.8,
                ease: [0.22, 1, 0.36, 1],
                delay: s.delay,
              }}
            >
              <div
                style={{
                  width: "min(7vw, 70px)",
                  height: "min(10vw, 100px)",
                  background:
                    "linear-gradient(135deg, rgba(201,184,232,0.32), rgba(78,201,176,0.16))",
                  border: "1px solid rgba(201,184,232,0.4)",
                  boxShadow: "0 0 22px rgba(201,184,232,0.4)",
                }}
              />
            </motion.div>
          </div>
        ))}

      {/* 扩散雾气（覆盖在最上层，触发时渐显吞没） */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: triggering ? 1 : 0 }}
        transition={{ duration: 1.6, ease: "easeIn" }}
        style={{
          background:
            "radial-gradient(80% 80% at 50% 50%, rgba(10,10,20,0.9) 0%, rgba(7,7,13,1) 60%)",
        }}
      />

      {/* 提示文字（idle 时显示，触发后淡出）——常驻 motion.div，避免 AnimatePresence 首帧 enter 不触发 */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: triggering ? 0 : 1 }}
        transition={{
          duration: triggering ? 0.5 : 1.2,
          delay: triggering ? 0 : 0.3,
        }}
      >
        <motion.div
          animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.025, 1] }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
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
    </div>
  );
}
