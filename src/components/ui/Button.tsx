// Button — 基础按钮
// 变体：primary（梦境色渐变）/ ghost（透明边框）/ ethereal（柔光）
// 尺寸 sm / md / lg；hover 微光晕 + 过渡动画

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "ethereal";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-dreamgate-ethereal/90 via-dreamgate-ethereal/70 to-dreamgate-mystical/70 text-dreamgate-deep font-semibold border border-white/15 hover:shadow-[0_0_28px_rgba(201,184,232,0.45)] hover:brightness-110",
  ghost:
    "bg-transparent text-dreamgate-text-primary border border-dreamgate-border-strong hover:bg-dreamgate-elevated/60 hover:border-white/30 hover:text-white",
  ethereal:
    "bg-dreamgate-elevated/30 text-dreamgate-ethereal border border-dreamgate-ethereal/30 backdrop-blur-sm hover:bg-dreamgate-ethereal/10 hover:shadow-[0_0_22px_rgba(201,184,232,0.38)]",
};

const sizeClasses: Record<Size, string> = {
  // min-h 确保移动端触摸目标 ≥44px（WCAG 2.5.5），桌面端视觉比例不受影响
  sm: "px-4 py-1.5 text-sm tracking-wide rounded-full min-h-[44px]",
  md: "px-6 py-2.5 text-base tracking-wide rounded-full min-h-[44px]",
  lg: "px-8 py-3.5 text-lg tracking-wider rounded-full min-h-[48px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "group relative inline-flex items-center justify-center gap-2 font-body",
          "transition-all duration-300 ease-out select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dreamgate-ethereal/50 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
