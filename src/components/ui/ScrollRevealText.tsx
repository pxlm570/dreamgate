// ScrollRevealText — 进入视口时的文字入场组件
// 元素滚入视口时，从下方淡入上浮；支持 delay 与 splitByWords（按词分步 blur 揭示）
// 借鉴 noomo storytelling 的滚动叙事文字编排
//
// 用 whileInView（视口触发）而非 useScroll（滚动进度驱动）：后者要求滚动容器为定位元素，
// 否则 framer 会告警「container has non-static position」；whileInView 无此依赖且更简洁。

import { type ElementType, type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ScrollRevealTextProps {
  children: ReactNode;
  className?: string;
  /** 入场延迟（秒），用于序列化多个文字块 */
  delay?: number;
  /** 元素标签，默认 div */
  as?: ElementType;
  /** 按词拆分，每个词独立 blur 分步入场（分步叙事） */
  splitByWords?: boolean;
  /** 入场距离（px），默认 28 */
  distance?: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function ScrollRevealText({
  children,
  className,
  delay = 0,
  as = "div",
  splitByWords = false,
  distance = 28,
}: ScrollRevealTextProps) {
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  if (splitByWords && typeof children === "string") {
    // 有空格按词拆；中文等无空格文本按字符拆，实现逐字揭示
    const hasSpaces = /\s/.test(children);
    const words = hasSpaces ? children.split(/(\s+)/) : Array.from(children);
    const container: Variants = {
      hidden: {},
      show: { transition: { staggerChildren: 0.06, delayChildren: delay } },
    };
    const word: Variants = {
      hidden: { opacity: 0, y: distance, filter: "blur(6px)" },
      show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.7, ease: EASE },
      },
    };
    return (
      <MotionTag
        className={cn("inline-block", className)}
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-12% 0px" }}
      >
        {words.map((w, i) =>
          /^\s+$/.test(w) ? (
            <span key={i}>{w}</span>
          ) : (
            <motion.span key={i} variants={word} className="inline-block whitespace-pre">
              {w}
            </motion.span>
          ),
        )}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}
