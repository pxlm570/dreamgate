// Typography — 统一排版层级
// Display（display 字体 + text-glow）/ Heading / Body / Caption / Mono

import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

/** 大标题 / 镜门文字：display 字体 + 微光晕 */
export function Display({ as: Tag = "h1", className, ...props }: TypographyProps) {
  return (
    <Tag
      className={cn(
        "font-display font-medium leading-tight tracking-wide text-glow",
        className,
      )}
      {...props}
    />
  );
}

/** 次级标题：display 字体 + 柔光 */
export function Heading({ as: Tag = "h2", className, ...props }: TypographyProps) {
  return (
    <Tag
      className={cn(
        "font-display font-medium leading-snug tracking-wide text-glow-soft",
        className,
      )}
      {...props}
    />
  );
}

/** 正文：body 衬线，次级文字色 */
export function Body({ as: Tag = "p", className, ...props }: TypographyProps) {
  return (
    <Tag
      className={cn(
        "font-body leading-relaxed text-dreamgate-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

/** 注释 / 辅助说明 */
export function Caption({ as: Tag = "span", className, ...props }: TypographyProps) {
  return (
    <Tag
      className={cn(
        "font-body text-sm tracking-wide text-dreamgate-text-muted",
        className,
      )}
      {...props}
    />
  );
}

/** 等宽：情绪标签 / 数据 */
export function Mono({ as: Tag = "span", className, ...props }: TypographyProps) {
  return (
    <Tag
      className={cn(
        "font-mono tracking-tight text-dreamgate-text-secondary",
        className,
      )}
      {...props}
    />
  );
}
