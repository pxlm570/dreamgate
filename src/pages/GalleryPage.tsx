// GalleryPage — 3D 走廊画廊主页面
// 模式判定：移动/降级开关/用户偏好 → CorridorScene 或 ParallaxGallery
// Lenis + GSAP ScrollTrigger 联动驱动 3D 相机；空状态 → EmptyGallery

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Moon, Plus } from "lucide-react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useDreamStore } from "@/store/useDreamStore";
import { useDegradation } from "@/lib/degradation";
import { getEmotionByWord } from "@/lib/emotions";
import { Fog } from "@/components/Atmosphere";
import { Button, Display, Caption } from "@/components/ui";
import { CorridorScene, ParallaxGallery, EmptyGallery, GalleryModeToggle, type GalleryMode } from "@/components/Gallery";
import { loadSeeds } from "@/data/seedDreams";
import type { Dream } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);
const STORAGE_KEY = "dg-gallery-mode";
const SEEDS_AUTO_LOADED_KEY = "dreamgate-seeds-auto-loaded";

export default function GalleryPage() {
  const setView = useDreamStore((s) => s.setView);
  const dreams = useDreamStore((s) => s.dreams);
  const loaded = useDreamStore((s) => s.loaded);
  const meta = useDreamStore((s) => s.meta);
  const setSelectedDream = useDreamStore((s) => s.setSelectedDream);
  const navigate = useNavigate();
  const degradation = useDegradation();
  const scrollRef = useRef(0);
  const [userMode, setUserMode] = useState<GalleryMode | null>(() => {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem(STORAGE_KEY);
    return s === "3d" || s === "2.5d" ? s : null;
  });
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    setView("gallery");
  }, [setView]);

  // 首次进入空画廊且已完成引导时，自动加载示例梦境（仅一次，用户清空后不再自动加载）
  useEffect(() => {
    if (!loaded || dreams.length > 0 || !meta.onboarded) return;
    if (localStorage.getItem(SEEDS_AUTO_LOADED_KEY) === "true") return;
    let cancelled = false;
    (async () => {
      await loadSeeds();
      if (cancelled) return;
      try {
        localStorage.setItem(SEEDS_AUTO_LOADED_KEY, "true");
      } catch {
        /* ignore quota errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, dreams.length, meta.onboarded]);

  const defaultMode: GalleryMode = useMemo(() => {
    let gl = false;
    try {
      const c = document.createElement("canvas");
      gl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      /* noop */
    }
    if (!gl || window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) < 4) return "2.5d";
    if (degradation.mobile2_5D || degradation.desktop3D) return "2.5d";
    return "3d";
  }, [degradation.mobile2_5D, degradation.desktop3D]);

  const mode = userMode ?? defaultMode;
  const withShaderFog = !degradation.fogShader && mode === "3d";
  const handleModeChange = (m: GalleryMode) => {
    setUserMode(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  };
  const handleSelect = (d: Dream) => { setSelectedDream(d.id); navigate(`/dream/${d.id}`); };

  // Lenis + ScrollTrigger 联动驱动 3D 相机；reduce-motion 时退化为原生 scroll
  useEffect(() => {
    if (mode !== "3d" || dreams.length === 0) return;
    if (reduceMotion) {
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollRef.current = max > 0 ? window.scrollY / max : 0;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", () => ScrollTrigger.update());
    const tickerFn = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);
    const st = ScrollTrigger.create({
      start: 0, end: "max", scrub: true,
      onUpdate: (self) => { scrollRef.current = self.progress; },
    });
    return () => { lenis.destroy(); gsap.ticker.remove(tickerFn); st.kill(); };
  }, [mode, dreams.length, reduceMotion]);

  if (!loaded) return <div className="min-h-screen bg-dreamgate-deep" />;
  if (dreams.length === 0) {
    return (
      <div className="relative min-h-screen bg-dreamgate-deep">
        <Fog className="fixed inset-0 z-0" intensity={0.5} color="#c9b8e8" />
        <EmptyGallery />
      </div>
    );
  }

  const recent = dreams.slice(-20).reverse();
  const accentColor = getEmotionByWord(recent[0]?.emotion.word ?? "")?.color ?? "#c9b8e8";

  const header = (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-dreamgate-elevated/40 px-4 py-2 backdrop-blur-md">
          <Moon size={14} className="text-dreamgate-ethereal" />
          <Display className="text-base tracking-wide sm:text-lg">梦境画廊</Display>
          <Caption as="span" className="ml-2 hidden text-[10px] sm:inline">{recent.length} 扇门</Caption>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <GalleryModeToggle mode={mode} onChange={handleModeChange} />
          <Link to="/record">
            <Button variant="ethereal" size="sm"><Plus size={14} /><span className="hidden sm:inline">记录新梦</span></Button>
          </Link>
        </div>
      </div>
    </header>
  );

  if (mode === "3d") {
    return (
      <div className="relative bg-dreamgate-deep">
        <div className="fixed inset-0 z-0">
          <CorridorScene dreams={dreams} onDoorClick={handleSelect} scrollRef={scrollRef} withShaderFog={withShaderFog} reduceMotion={reduceMotion} />
        </div>
        {!withShaderFog && <Fog className="pointer-events-none fixed inset-0 z-[1]" intensity={0.5} color={accentColor} />}
        {header}
        <div aria-hidden style={{ height: `${recent.length * 80 + 60}vh` }} />
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
          <Caption as="div" className="animate-pulse-glow rounded-full border border-white/10 bg-dreamgate-elevated/40 px-4 py-1.5 text-[11px] uppercase tracking-widest backdrop-blur-md">
            滚动 · 漫游走廊
          </Caption>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-dreamgate-deep">
      <Fog className="fixed inset-0 z-0" intensity={0.5} color={accentColor} />
      {header}
      <main className="relative z-10 pb-32 pt-28">
        <ParallaxGallery dreams={dreams} onCardClick={handleSelect} />
      </main>
    </div>
  );
}
