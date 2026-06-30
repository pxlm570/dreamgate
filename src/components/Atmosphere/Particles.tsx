// Particles — 微光粒子（Canvas 2D，不依赖 WebGL）
// 粒子缓慢上浮 + 闪烁，营造梦境尘埃感；性能友好（rAF + 可控粒子数）

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { hexToRgb } from "./presets";

export interface ParticlesProps {
  /** 粒子数，默认 30 */
  count?: number;
  /** 粒子色 hex，默认柔白 */
  color?: string;
  /** 上浮速度倍率，默认 0.3 */
  speed?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  vy: number;
  drift: number;
  phase: number;
  twinkleSpeed: number;
}

export function Particles({
  count = 30,
  color = "#d8d4e8",
  speed = 0.3,
  className,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rgb = hexToRgb(color);
    const colorStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];

    const initParticles = () => {
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.8,
        vy: (0.1 + Math.random() * 0.5) * speed,
        drift: (Math.random() - 0.5) * 0.2 * speed,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.03,
      }));
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) initParticles();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.vy;
        p.x += p.drift;
        p.phase += p.twinkleSpeed;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorStr}, ${alpha})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${colorStr}, ${alpha * 0.6})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    resize();

    let rafId = 0;
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      rafId = requestAnimationFrame(loop);
    };

    if (reduce) {
      draw(); // 静态一帧
    } else {
      loop();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [count, color, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
    />
  );
}
