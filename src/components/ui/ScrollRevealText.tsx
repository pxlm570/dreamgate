// ScrollRevealText — 滚动驱动文字入场组件
// 元素进入视口时，从下方淡入上浮；支持 delay 与 splitBy（按词分步入场）
// 借鉴 noomo storytelling 的滚动叙事文字编排

import { forwardRef, useRef, type ElementType, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollRevealTextProps {
  children: ReactNode;
  className?: string;
  /** 入场延迟（秒），用于序列化多个文字块 */
  delay?: number;
  /** 元素标签，默认 div */
  as?: ElementType;
  /** 按词拆分，每个词独立入场（分步叙事） */
  splitByWords?: boolean;
  /** 入场距离（px），默认 28 */
  distance?: number;
}

/** 单个词的入场包装 */
function Word({
  children,
  progress,
  range,
  distance,
}: {
  children: ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
  distance: number;
}) {
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [distance, 0]);
  return (
    <motion.span style={{ opacity, y }} className="inline-block whitespace-pre">
      {children}
    </motion.span>
  );
}

export const ScrollRevealText = forwardRef<HTMLElement, ScrollRevealTextProps>(
  (
    {
      children,
      className,
      delay = 0,
      as = "div",
      splitByWords = false,
      distance = 28,
    },
    _ref,
  ) => {
    const localRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
      target: localRef,
      offset: ["start 85%", "start 35%"],
    });

    const Tag = motion[as as keyof typeof motion] as typeof motion.div;

    // 整体入场（非拆分模式）
    const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
    const y = useTransform(scrollYProgress, [0, 1], [distance, 0]);

    if (splitByWords && typeof children === "string") {
      const words = children.split(/(\s+)/);
      const total = words.length;
      const step = 1 / total;
      return (
        <Tag
          ref={localRef as any}
          className={cn("inline-block", className)}
          style={{ opacity: 1 }}
        >
          {words.map((w, i) =>
            /^\s+$/.test(w) ? (
              <span key={i}>{w}</span>
            ) : (
              <Word
                key={i}
                progress={scrollYProgress}
                range={[i * step, (i + 1) * step]}
                distance={distance}
              >
                {w}
              </Word>
            ),
          )}
        </Tag>
      );
    }

    return (
      <Tag
        ref={localRef as any}
        className={className}
        style={{ opacity, y, transitionDelay: `${delay}s` }}
      >
        {children}
      </Tag>
    );
  },
);

ScrollRevealText.displayName = "ScrollRevealText";
