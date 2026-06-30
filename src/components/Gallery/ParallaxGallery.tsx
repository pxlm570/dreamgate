// ParallaxGallery — 移动端 / 降级 2.5D 视差画廊
// CSS 3D perspective 容器 + 卡片纵向排列，每张卡 GSAP scrollTrigger scrub 驱动 translateZ/rotateX

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dream } from "@/lib/types";
import { DreamCard2D } from "./DreamCard2D";

gsap.registerPlugin(ScrollTrigger);

export interface ParallaxGalleryProps {
  dreams: Dream[];
  onCardClick: (dream: Dream) => void;
}

export function ParallaxGallery({
  dreams,
  onCardClick,
}: ParallaxGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 最近 20 条，最新在前
  const recent = dreams.slice(-20).reverse();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // 卡片挂载后刷新 ScrollTrigger 位置（图像懒加载完成后会再次刷新）
    const ctx = gsap.context(() => {
      ScrollTrigger.refresh();
    }, container);
    // 图像加载完成后再次刷新（避免布局抖动导致 trigger 位置错位）
    const imgs = container.querySelectorAll("img");
    const refresh = () => ScrollTrigger.refresh();
    imgs.forEach((img) => {
      if (img.complete) return;
      img.addEventListener("load", refresh);
      img.addEventListener("error", refresh);
    });
    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("load", refresh);
        img.removeEventListener("error", refresh);
      });
      ctx.revert();
    };
  }, [dreams]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ perspective: "1000px" }}
    >
      <div className="flex flex-col gap-12 px-4 py-8 sm:gap-16">
        {recent.map((d) => (
          <DreamCard2D key={d.id} dream={d} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}
