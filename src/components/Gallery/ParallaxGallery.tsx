// ParallaxGallery — 移动端 / 降级 2.5D 视差画廊
// CSS 3D perspective 容器 + 卡片纵向排列，每张卡 GSAP scrollTrigger scrub 驱动 translateZ/rotateX

import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dream } from "@/lib/types";
import { Button, Display, Caption } from "@/components/ui";
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
  // 最近 20 条，最新在前（按 dreams 引用缓存，避免每次渲染重算）
  const recent = useMemo(() => dreams.slice(-20).reverse(), [dreams]);

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

      {/* 走廊尽头「仍未发现的梦境」引导区：视觉突出的记录入口 */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mx-auto mt-16 flex max-w-md flex-col items-center gap-4 rounded-[2rem] border border-dreamgate-ethereal/20 bg-dreamgate-elevated/20 px-6 py-12 text-center backdrop-blur-md sm:mt-24 sm:py-16"
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border border-dreamgate-ethereal/30"
          style={{ boxShadow: "0 0 50px -12px rgba(201,184,232,0.5)" }}
        >
          <Plus size={28} className="text-dreamgate-ethereal" />
        </div>
        <Display className="text-2xl sm:text-3xl">仍未发现的梦境</Display>
        <Caption as="p" className="max-w-xs text-sm">
          走廊的下一扇门，等你写下新的梦境来点亮
        </Caption>
        <Link to="/record" className="mt-2">
          <Button variant="primary" size="md" className="min-w-[180px]">
            <Plus size={16} />
            记录新的梦境
          </Button>
        </Link>
      </motion.section>
    </div>
  );
}
