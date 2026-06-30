// CustomCursor — 自定义梦境光标
// 跟随鼠标的柔光圆点，hover 可交互元素（a/button/[data-cursor]）时放大
// 移动端（触屏设备）不渲染，桌面端仅在指针为 fine 时启用
// 借鉴 noomo / 高端 storytelling 站的沉浸式光标

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    // 仅在 fine 指针（鼠标）设备启用，触屏/粗指针禁用
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      // 检测是否 hover 可交互元素
      const target = e.target as HTMLElement;
      const interactive = target.closest("a, button, [data-cursor], input, textarea, select, [role='button']");
      setHovering(!!interactive);
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* 外层光晕：hover 时放大 */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full"
        style={{
          x: sx,
          y: sy,
          translateX: "-50%",
          translateY: "-50%",
        }}
      >
        <motion.div
          className="rounded-full border border-dreamgate-ethereal/50"
          animate={{
            width: hovering ? 48 : 28,
            height: hovering ? 48 : 28,
            backgroundColor: hovering
              ? "rgba(201, 184, 232, 0.12)"
              : "rgba(201, 184, 232, 0.04)",
            borderColor: hovering
              ? "rgba(201, 184, 232, 0.7)"
              : "rgba(201, 184, 232, 0.35)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      </motion.div>
      {/* 内层核心点：精确跟随 */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[101] h-1.5 w-1.5 rounded-full bg-dreamgate-ethereal"
        style={{
          x,
          y,
          translateX: "-50%",
          translateY: "-50%",
          boxShadow: "0 0 8px rgba(201, 184, 232, 0.8)",
        }}
      />
    </>
  );
}
