// GalleryPage — 3D 走廊画廊主页面
// 模式判定：移动/降级开关/用户偏好 → CorridorScene 或 ParallaxGallery
// Lenis + GSAP ScrollTrigger 联动驱动 3D 相机；空状态 → EmptyGallery

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Moon, Plus, ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useDreamStore } from "@/store/useDreamStore";
import { useDegradation, triggerDegradation } from "@/lib/degradation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getEmotionByWord } from "@/lib/emotions";
import { Fog } from "@/components/Atmosphere";
import { Button, Display, Caption } from "@/components/ui";
import { CorridorScene, ParallaxGallery, EmptyGallery, GalleryModeToggle, type GalleryMode } from "@/components/Gallery";
import { loadSeeds, SEED_DREAMS } from "@/data/seedDreams";
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
  const updateDream = useDreamStore((s) => s.updateDream);
  const navigate = useNavigate();
  const degradation = useDegradation();
  const scrollRef = useRef(0);
  const [userMode, setUserMode] = useState<GalleryMode | null>(() => {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem(STORAGE_KEY);
    return s === "3d" || s === "2.5d" ? s : null;
  });
  const reduceMotion = usePrefersReducedMotion();
  // 聚焦的梦境（3D：点门先运镜聚焦看展签，再点/按钮才入画）
  const [focused, setFocused] = useState<Dream | null>(null);
  // 入画中：相机向画面俯冲 + 页面淡出，随后跳转（内容即门——穿过画作进入梦境）
  const [diving, setDiving] = useState(false);

  useEffect(() => {
    setView("gallery");
  }, [setView]);

  // ESC 退出聚焦（入画途中不可中断）
  useEffect(() => {
    if (!focused || diving) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocused(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, diving]);

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

  // 种子藏品迁移：老用户 IndexedDB 里的种子梦还是旧 SVG 占位图（种子只自动加载一次、
  // 已存在的不覆盖），检测到即升级为新版 gpt-image 真图——老浏览器打开也能看到精美画作
  useEffect(() => {
    if (!loaded) return;
    for (const d of dreams) {
      const seed = SEED_DREAMS.find((s) => s.id === d.id);
      if (
        seed &&
        d.artifact.imageUrl.startsWith("/seeds/") &&
        d.artifact.imageUrl !== seed.artifact.imageUrl
      ) {
        updateDream({ ...d, artifact: { ...seed.artifact } }).catch((err) =>
          console.error("[DreamGate] 种子藏品迁移失败:", err),
        );
      }
    }
  }, [loaded, dreams, updateDream]);

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
    setFocused(null);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  };
  const gotoDream = (d: Dream) => { setSelectedDream(d.id); navigate(`/dream/${d.id}`); };
  // 入画：3D 聚焦态下相机向画面俯冲 + 淡出遮罩，~0.82s 后真正跳转（reduce-motion 直接跳）
  const enterDream = (d: Dream) => {
    if (mode === "3d" && !reduceMotion && focused?.id === d.id) {
      if (diving) return;
      setDiving(true);
      window.setTimeout(() => gotoDream(d), 820);
      return;
    }
    gotoDream(d);
  };
  // 3D：第一次点门 → 运镜聚焦看展签；再点同一扇门（或展签按钮）→ 入画。2.5D 卡片本身已含信息，直接进入。
  const handleSelect = (d: Dream) => {
    if (diving) return;
    if (mode === "3d" && focused?.id !== d.id) {
      setFocused(d);
      return;
    }
    enterDream(d);
  };

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

  // 3D 门为鼠标交互——给键盘 / 读屏用户一个等价的可达梦境列表（视觉隐藏）
  const a11yList = (
    <nav aria-label="全部梦境" className="sr-only">
      <ul>
        {dreams.map((d) => (
          <li key={d.id}>
            <Link to={`/dream/${d.id}`}>
              {(d.rawText.slice(0, 30) || "无题") + "（" + d.emotion.word + "）"}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  if (mode === "3d") {
    const focusColor = focused
      ? (getEmotionByWord(focused.emotion.word)?.color ?? "#c9b8e8")
      : "#c9b8e8";
    // 展签方位：偏心构图把画作让位到一侧，展签占对侧留白
    // 左墙画（idx 偶数，side=-1）→ 画偏屏幕右 → 展签在左；右墙画反之
    const focusIdx = focused ? recent.findIndex((d) => d.id === focused.id) : -1;
    const focusSide = focusIdx >= 0 && focusIdx % 2 === 0 ? -1 : 1;
    return (
      <div className="relative bg-dreamgate-deep">
        <div className="fixed inset-0 z-0">
          <CorridorScene
            dreams={dreams}
            onDoorClick={handleSelect}
            scrollRef={scrollRef}
            withShaderFog={withShaderFog}
            reduceMotion={reduceMotion}
            onLowPerformance={() => triggerDegradation("desktop3D")}
            focusedId={focused?.id ?? null}
            diving={diving}
            onMissClick={() => { if (!diving) setFocused(null); }}
          />
        </div>
        {!withShaderFog && <Fog className="pointer-events-none fixed inset-0 z-[1]" intensity={0.5} color={accentColor} />}
        {header}
        {a11yList}
        <div aria-hidden style={{ height: `${recent.length * 80 + 60}vh` }} />
        {/* 漫游提示（聚焦时隐去） */}
        {!focused && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
            <Caption as="div" className="animate-pulse-glow rounded-full border border-white/10 bg-dreamgate-elevated/40 px-4 py-1.5 text-[11px] uppercase tracking-widest backdrop-blur-md">
              滚动 · 漫游走廊 · 点击画作驻足
            </Caption>
          </div>
        )}
        {/* 聚焦展签：编辑式侧栏（noomo 排版语言）——画作偏一侧，展签占对侧留白，
            文字直接落在场景上（无卡片壳），左右交替 = 每次驻足都是一页新的画册排版 */}
        <AnimatePresence>
          {focused && !diving && (
            <motion.aside
              key={focused.id}
              initial={{ opacity: 0, x: focusSide === -1 ? -30 : 30, y: "-50%" }}
              animate={{ opacity: 1, x: 0, y: "-50%" }}
              exit={{ opacity: 0, x: focusSide === -1 ? -18 : 18, y: "-50%" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className={`pointer-events-none fixed top-1/2 z-20 w-[21rem] max-w-[78vw] ${
                focusSide === -1 ? "left-6 md:left-16" : "right-6 md:right-16"
              }`}
            >
              <div
                className={`pointer-events-auto flex flex-col ${
                  focusSide === -1 ? "items-start text-left" : "items-end text-right"
                }`}
              >
                <Caption as="div" className="font-mono text-[10px] tracking-[0.42em]">
                  N°{String(focusIdx + 1).padStart(2, "0")} ·{" "}
                  {new Date(focused.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
                </Caption>
                <div className={`mt-4 flex items-center gap-2.5 ${focusSide === 1 ? "flex-row-reverse" : ""}`}>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: focusColor, boxShadow: `0 0 12px ${focusColor}` }}
                  />
                  <span className="font-mono text-xs tracking-[0.2em]" style={{ color: focusColor }}>
                    {focused.emotion.word}
                  </span>
                </div>
                <p
                  className="mt-5 line-clamp-4 font-display text-[1.55rem] leading-snug text-dreamgate-text-primary md:text-[1.8rem]"
                  style={{ textShadow: "0 2px 24px rgba(0,0,0,0.85)" }}
                >
                  {focused.rawText}
                </p>
                <div
                  className="mt-6 h-px w-16"
                  style={{ background: `linear-gradient(${focusSide === -1 ? "90deg" : "270deg"}, ${focusColor}88, transparent)` }}
                />
                <div className={`mt-7 flex items-center gap-4 ${focusSide === 1 ? "flex-row-reverse" : ""}`}>
                  <Button variant="ethereal" size="sm" onClick={() => enterDream(focused)}>
                    入画 · 步入梦境
                    <ArrowRight size={14} />
                  </Button>
                  <button
                    type="button"
                    aria-label="返回走廊"
                    onClick={() => setFocused(null)}
                    className="rounded-full border border-white/10 p-1.5 text-dreamgate-text-muted transition-colors hover:text-dreamgate-text-primary"
                  >
                    <X size={14} />
                  </button>
                </div>
                <Caption as="div" className="mt-5 text-[10px]">
                  再次点击画作亦可入画 · ESC 返回
                </Caption>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        {/* 入画淡出遮罩：相机俯冲的同时画面沉入黑暗——「穿过画布」的一瞬 */}
        <AnimatePresence>
          {diving && (
            <motion.div
              key="dive-fade"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.62, ease: "easeIn", delay: 0.18 }}
              className="pointer-events-auto fixed inset-0 z-40 bg-dreamgate-deep"
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-dreamgate-deep">
      <Fog className="fixed inset-0 z-0" intensity={0.5} color={accentColor} />
      {header}
      {a11yList}
      <main className="relative z-10 pb-32 pt-28">
        <ParallaxGallery dreams={dreams} onCardClick={handleSelect} />
      </main>
    </div>
  );
}
