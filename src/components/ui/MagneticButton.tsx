// MagneticButton — 磁吸按钮
// 鼠标靠近时按钮被吸引偏移，离开后弹簧归位
// 借鉴 noomo / Awwwards 获奖站的磁吸微交互

import { forwardRef, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /** 磁吸强度（0-1），默认 0.3 */
  strength?: number;
  /** 点击回调 */
  onClick?: () => void;
  /** 作为链接的 href（有 href 时渲染为 a） */
  href?: string;
}

export const MagneticButton = forwardRef<HTMLDivElement, MagneticButtonProps>(
  ({ children, className, strength = 0.3, onClick, href }, _ref) => {
    const localRef = useRef<HTMLDivElement | HTMLAnchorElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.5 });
    const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.5 });

    const handleMove = (e: React.MouseEvent) => {
      const el = localRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      x.set(relX * strength);
      y.set(relY * strength);
    };

    const handleLeave = () => {
      x.set(0);
      y.set(0);
    };

    const motionProps = {
      ref: localRef as any,
      style: { x: sx, y: sy },
      onMouseMove: handleMove,
      onMouseLeave: handleLeave,
      className: cn("inline-block", className),
    };

    if (href) {
      return (
        <motion.a href={href} {...motionProps}>
          {children}
        </motion.a>
      );
    }

    return (
      <motion.div {...motionProps} onClick={onClick}>
        {children}
      </motion.div>
    );
  },
);

MagneticButton.displayName = "MagneticButton";
