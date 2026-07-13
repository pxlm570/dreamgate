// WorldPage — 单世界页面：镜之门与 3D 走廊共享同一个持久 Canvas。
// 挂为 layout route（"/" 与 "/gallery" 的父级），路由在两者间切换时本组件不重挂——
// 这是转场卡顿的根治：没有 WebGL 上下文销毁/重建，没有纹理重新上传。
//
// 真连续穿门（无遮罩、无静帧）：门立在走廊门槛前（GATE_ORIGIN_Z），
// 碎裂白闪瞬间（crossing）门内换成真实走廊——走廊显形、雾切走廊值、镜湖环境隐去；
// 相机加速推过门洞（终点=走廊相机起点），onComplete → navigate('/gallery')，
// CameraRig 接力（intro 自适应零跳变）。「穿过门就走进了美术馆」。
//
// stage 状态机（由 URL 派生）：
//   /         → stage=gate    门场景可见、门相机激活；走廊隐形挂载（GPU 预热）
//   /gallery  → stage=corridor 走廊可见、CameraRig 接管；门场景隐形保活（回退零卡顿）

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Plus } from "lucide-react";
import { useDreamStore } from "@/store/useDreamStore";
import { useDegradation, triggerDegradation } from "@/lib/degradation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getEmotionByWord } from "@/lib/emotions";
import { Fog } from "@/components/Atmosphere";
import { Button, Display, Caption, EntranceVeil, ErrorBoundary } from "@/components/ui";
import { GateScene, GateOverlay, CssMirrorFallback, GATE_ATMOSPHERE } from "@/components/Gate";
import {
  CorridorWorld,
  corridorAtmosphere,
  ParallaxGallery,
  EmptyGallery,
  GalleryModeToggle,
  type GalleryMode,
} from "@/components/Gallery";
import { useSeedBootstrap, useStopNavigation } from "@/components/Gallery/hooks";
import type { Dream } from "@/lib/types";

const STORAGE_KEY = "dg-gallery-mode";
/** 本会话已进入过画廊的标记——重挂(切到 /record、/dream/:id 再回 /gallery)时据此跳过揭幕 */
const GALLERY_ENTERED_KEY = "dg-gallery-entered";
/** 门的世界 z 原点：门立在走廊门槛前，推进终点(originZ-0.5)≈走廊相机起点(z=4)，接力零跳变 */
const GATE_ORIGIN_Z = 4.5;

type Stage = "gate" | "corridor";
type GatePhase = "idle" | "triggered" | "done";
type GateMode = "3d" | "fallback" | null;

/** 探测 WebGL / 硬件并发：不可用或核数过低 → 门走 CSS 降级 */
function shouldUseGateFallback(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
  } catch {
    return true;
  }
  return (navigator.hardwareConcurrency ?? 8) < 4;
}

/** 场景级氛围（背景色 + 雾）——单 Canvas 只能有一份，由 World 按 stage 切换 */
function WorldAtmosphere({
  stage,
  dreams,
  withShaderFog,
}: {
  stage: Stage;
  dreams: Dream[];
  withShaderFog: boolean;
}) {
  const atmo = stage === "gate" ? GATE_ATMOSPHERE : corridorAtmosphere(dreams);
  return (
    <>
      <color attach="background" args={[atmo.color]} />
      {(stage === "gate" || withShaderFog) && (
        <fogExp2 attach="fog" args={[atmo.color, atmo.density]} />
      )}
    </>
  );
}

/** 后处理——两场景参数不同，按 stage 切换（重建藏在静止帧后） */
function WorldEffects({ stage }: { stage: Stage }) {
  return stage === "gate" ? (
    <EffectComposer>
      <Bloom intensity={0.95} luminanceThreshold={0.22} luminanceSmoothing={0.5} mipmapBlur radius={0.72} />
      <Vignette eskil={false} offset={0.12} darkness={0.7} />
    </EffectComposer>
  ) : (
    <EffectComposer>
      <Bloom intensity={0.85} luminanceThreshold={0.28} luminanceSmoothing={0.5} mipmapBlur radius={0.65} />
      <Vignette eskil={false} offset={0.16} darkness={0.62} />
    </EffectComposer>
  );
}

export default function WorldPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const stage: Stage = location.pathname.startsWith("/gallery") ? "corridor" : "gate";

  const setView = useDreamStore((s) => s.setView);
  const dreams = useDreamStore((s) => s.dreams);
  const loaded = useDreamStore((s) => s.loaded);
  const setSelectedDream = useDreamStore((s) => s.setSelectedDream);
  const degradation = useDegradation();
  const reduceMotion = usePrefersReducedMotion();

  // —— 门侧状态 ——
  const [phase, setPhase] = useState<GatePhase>("idle");
  const [act, setAct] = useState<0 | 1>(0);
  const [gateMode, setGateMode] = useState<GateMode>(null);
  const phaseRef = useRef<GatePhase>("idle");
  const actRef = useRef<0 | 1>(0);
  const lockRef = useRef(0); // 转场锁：一格滚轮=一次完整转场
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    actRef.current = act;
  }, [act]);
  useEffect(() => {
    setGateMode(shouldUseGateFallback() ? "fallback" : "3d");
  }, []);

  // —— 画廊侧状态 ——
  const scrollRef = useRef(0);
  const [userMode, setUserMode] = useState<GalleryMode | null>(() => {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem(STORAGE_KEY);
    return s === "3d" || s === "2.5d" ? s : null;
  });
  const [focused, setFocused] = useState<Dream | null>(null);
  const [diving, setDiving] = useState(false);
  // 穿门中间态：碎裂白闪瞬间置 true——走廊显形、雾/后处理切走廊值、镜湖环境隐去。
  // 真连续的关键：从这一刻起门内就是真实走廊，相机推进穿门，无任何遮罩。
  const [crossing, setCrossing] = useState(false);
  // 本会话是否已进入过画廊——重挂时据此跳过揭幕。
  // 首次穿门进画廊本就不播揭幕(crossing=true 零遮罩真连续);首次深链 /gallery 仍播揭幕盖 3D 初始化。
  const [galleryEntered, setGalleryEntered] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(GALLERY_ENTERED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useSeedBootstrap();

  useEffect(() => {
    setView(stage === "gate" ? "gate" : "gallery");
  }, [stage, setView]);

  // 从走廊回退到门（浏览器后退）：重置门状态机，让门可以再次触发
  useEffect(() => {
    if (stage === "gate" && phaseRef.current === "done") {
      setPhase("idle");
      setAct(0);
      setCrossing(false);
    }
  }, [stage]);

  // 进入走廊后标记「本会话已进入画廊」——重挂(去 /record 回 /gallery)时据此跳过揭幕。
  // 延迟 1.6s(> 揭幕 1.4s)写,避免截断首次深链揭幕;卸载清定时器。
  useEffect(() => {
    if (stage !== "corridor") return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(GALLERY_ENTERED_KEY, "1");
      } catch {
        /* ignore */
      }
      setGalleryEntered(true);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [stage]);

  // —— 门的分幕推进 ——
  const trigger = useCallback(() => {
    setPhase((p) => (p === "idle" ? "triggered" : p));
  }, []);
  const advance = useCallback(
    (dir: 1 | -1) => {
      if (phaseRef.current !== "idle") return;
      const now = performance.now();
      if (now - lockRef.current < 1900) return;
      lockRef.current = now;
      if (dir === -1) {
        setAct((a) => (a === 1 ? 0 : a));
        return;
      }
      if (actRef.current === 0) setAct(1);
      else trigger();
    },
    [trigger],
  );
  // 碎裂白闪瞬间（门时间线 0.1s 回调）：门内换成真走廊——走廊显形、
  // 雾/后处理切走廊值、镜湖环境（天幕/湖面/云堤）隐去，全部藏进白闪。
  // 必须是 useCallback 稳定引用：它在门的触发 effect 依赖里，抖动会 kill 时间线
  const handleShatter = useCallback(() => setCrossing(true), []);
  // 推进穿门完成 → 一次性切走廊路由（layout 不重挂，相机已立在走廊入口，
  // CameraRig 接力 intro 自适应零跳变——无遮罩、无静帧，真连续）。
  // 注意必须是一次性调用而非「phase=done ⇒ navigate」的持续 effect 规则——
  // 后者会在浏览器回退到门的瞬间（phase 尚未重置）把路由又顶回走廊
  const handleComplete = useCallback(() => {
    setPhase("done");
    navigate("/gallery");
  }, [navigate]);

  // 门的输入（仅 gate 阶段监听；走廊的滚轮由 useStopNavigation 接管）
  useEffect(() => {
    if (stage !== "gate" || gateMode === null) return;
    const isFallback = gateMode === "fallback";
    const onWheel = (e: WheelEvent) => {
      if (isFallback) return trigger();
      advance(e.deltaY >= 0 ? 1 : -1);
    };
    const onTouch = () => {
      if (isFallback) return trigger();
      advance(1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [stage, gateMode, advance, trigger]);

  // —— 画廊模式与交互 ——
  // 桌面默认一律 3D（用户定稿 07-09）：只有 WebGL 不可用 / 移动端窄屏 /
  // 运行时实测持续掉帧（FpsSampler，参数已保守化）才降 2.5D。
  // 曾经的 hardwareConcurrency<4 预判过于激进（核数≠GPU 能力），已移除。
  const defaultGalleryMode: GalleryMode = useMemo(() => {
    let gl = false;
    try {
      const c = document.createElement("canvas");
      gl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      /* noop */
    }
    if (!gl || window.innerWidth < 768) return "2.5d";
    if (degradation.mobile2_5D || degradation.desktop3D) return "2.5d";
    return "3d";
  }, [degradation.mobile2_5D, degradation.desktop3D]);
  const galleryMode = userMode ?? defaultGalleryMode;
  const withShaderFog = !degradation.fogShader && galleryMode === "3d";
  const handleModeChange = (m: GalleryMode) => {
    setUserMode(m);
    setFocused(null);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  const gotoDream = (d: Dream) => {
    setSelectedDream(d.id);
    navigate(`/dream/${d.id}`);
  };
  // 点击画作或简介牌 → 直接入画（相机俯冲 + 淡出）→ 详情页。
  // 美术馆式简介牌常驻墙上，画作信息一直可读——不再需要「先驻足看展签」
  // 的两步交互（用户定稿 07-09）；focused 仅作为俯冲相机的目标保留
  const handleSelect = (d: Dream) => {
    if (diving) return;
    if (galleryMode === "3d" && !reduceMotion) {
      setFocused(d);
      setDiving(true);
      window.setTimeout(() => gotoDream(d), 820);
      return;
    }
    gotoDream(d);
  };

  const recentCount = Math.min(dreams.length, 20);
  const stop = useStopNavigation({
    enabled: stage === "corridor" && galleryMode === "3d",
    recentCount,
    paused: diving,
    scrollRef,
  });

  // —— 渲染 ——
  if (gateMode === null) {
    return <div className="min-h-[100dvh] w-screen bg-dreamgate-deep" />;
  }

  // 单 Canvas 是否挂载：门用 3D 且（在门阶段，或走廊侧也是 3D）
  const canvasOn =
    gateMode === "3d" && (stage === "gate" || (galleryMode === "3d" && dreams.length > 0));
  // 走廊场景挂载条件（gate 阶段也隐形挂载 = GPU 预热，同一上下文无 Context Lost 风险）
  const corridorMounted = gateMode === "3d" && galleryMode === "3d" && loaded && dreams.length > 0;

  const recent = dreams.slice(-20).reverse();
  const accentColor = getEmotionByWord(recent[0]?.emotion.word ?? "")?.color ?? "#c9b8e8";

  const galleryHeader = (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-dreamgate-elevated/40 px-4 py-2 backdrop-blur-md">
          <Moon size={14} className="text-dreamgate-ethereal" />
          <Display className="text-base tracking-wide sm:text-lg">梦境画廊</Display>
          <Caption as="span" className="ml-2 hidden text-[10px] sm:inline">{recent.length} 扇门</Caption>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <GalleryModeToggle mode={galleryMode} onChange={handleModeChange} />
          <Link to="/record">
            <Button variant="ethereal" size="sm"><Plus size={14} /><span className="hidden sm:inline">记录新梦</span></Button>
          </Link>
        </div>
      </div>
    </header>
  );

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

  const gateFlash = (
    <AnimatePresence>
      {stage === "gate" && phase === "triggered" && (
        <motion.div
          key="flash"
          className="pointer-events-none absolute inset-0 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.42, 0] }}
          transition={{ duration: 0.55, times: [0, 0.3, 1] }}
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85), rgba(201,184,232,0.3) 60%, transparent 100%)",
          }}
        />
      )}
    </AnimatePresence>
  );

  return (
    <div
      className={`relative bg-dreamgate-deep ${
        stage === "gate" ? "h-[100dvh] w-screen cursor-pointer overflow-hidden select-none" : "min-h-screen"
      }`}
      onClick={() => {
        if (stage !== "gate") return;
        if (gateMode === "fallback") trigger();
        else advance(1);
      }}
    >
      {/* —— 单一持久 Canvas：两场景组同时挂载，visible/cameraEnabled 按 stage 翻转 ——
          局部 ErrorBoundary：3D 崩溃（WebGL context lost / shader / 纹理）时降级到静态 UI，
          保留上层 header/nav 不白屏。红线：Canvas props 与状态机不变，仅外层包裹。 */}
      {canvasOn && (
        <div className="fixed inset-0 z-0">
          <ErrorBoundary
            fallback={(_err, reset) => <CanvasCrashFallback stage={stage} onReset={reset} />}
          >
            <Canvas
              camera={{ position: [0, 0, 6], fov: 50 }}
              dpr={typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.2] : [1, 1.5]}
              gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
              style={{ position: "absolute", inset: 0 }}
            >
              {/* 氛围/后处理按「视觉阶段」切换：碎裂白闪起（crossing）即用走廊值 */}
              <WorldAtmosphere
                stage={crossing || stage === "corridor" ? "corridor" : "gate"}
                dreams={dreams}
                withShaderFog={withShaderFog}
              />
              {/* 门体常驻可见：走廊阶段回头能看到来路的拱门（门内星云仍在）——
                  空间连续感；镜湖环境（天幕/湖面/云堤）自 crossing 起隐去 */}
              <GateScene
                standalone={false}
                visible
                cameraEnabled={stage === "gate"}
                triggering={stage === "gate" && phase === "triggered"}
                onComplete={handleComplete}
                act={act}
                originZ={GATE_ORIGIN_Z}
                hideEnvirons={crossing || stage === "corridor"}
                onShatter={handleShatter}
              />
              {corridorMounted && (
                <CorridorWorld
                  standalone={false}
                  visible={crossing || stage === "corridor"}
                  cameraEnabled={stage === "corridor"}
                  dreams={dreams}
                  onDoorClick={handleSelect}
                  scrollRef={scrollRef}
                  withShaderFog={withShaderFog}
                  reduceMotion={reduceMotion}
                  onLowPerformance={() => triggerDegradation("desktop3D")}
                  focusedId={focused?.id ?? null}
                  diving={diving}
                />
              )}
              <WorldEffects stage={crossing || stage === "corridor" ? "corridor" : "gate"} />
            </Canvas>
          </ErrorBoundary>
        </div>
      )}

      {/* —— 门阶段 DOM 层 —— */}
      {stage === "gate" && gateMode === "fallback" && (
        <CssMirrorFallback triggering={phase === "triggered"} onComplete={handleComplete} />
      )}
      {stage === "gate" && gateMode === "3d" && <GateOverlay visible={phase === "idle"} act={act} />}
      {gateFlash}

      {/* —— 走廊阶段 DOM 层 —— */}
      {stage === "corridor" && !loaded && (
        <div className="fixed inset-0 z-10 bg-dreamgate-deep" aria-hidden />
      )}
      {stage === "corridor" && loaded && dreams.length === 0 && (
        <>
          <Fog className="fixed inset-0 z-0" intensity={0.5} color="#c9b8e8" />
          <EmptyGallery />
        </>
      )}
      {stage === "corridor" && loaded && dreams.length > 0 && galleryMode === "3d" && (
        <>
          {/* 入场揭幕：直接深链才盖深色幕布；穿门(crossing)零遮罩；本会话已进入过画廊也不再盖 */}
          {!crossing && !galleryEntered && <EntranceVeil />}
          {galleryHeader}
          {a11yList}
          {!withShaderFog && (
            <Fog className="pointer-events-none fixed inset-0 z-[1]" intensity={0.5} color={accentColor} />
          )}
          {!diving && (
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
              <Caption as="div" className="animate-pulse-glow rounded-full border border-white/10 bg-dreamgate-elevated/40 px-4 py-1.5 text-[11px] uppercase tracking-widest backdrop-blur-md">
                滚动 · 逐画前行{stop > 0 ? ` · ${Math.min(stop + 1, recentCount)} / ${recentCount}` : ""} · 点击画作或简介 · 入画
              </Caption>
            </div>
          )}
          {/* 画作信息由墙上的美术馆式简介牌承载（DreamDoor 内 3D 展牌），
              点画作或简介即直接入画——旧的两步聚焦展签已退役（用户定稿 07-09） */}
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
        </>
      )}
      {stage === "corridor" && loaded && dreams.length > 0 && galleryMode === "2.5d" && (
        <>
          <Fog className="fixed inset-0 z-0" intensity={0.5} color={accentColor} />
          {galleryHeader}
          {a11yList}
          <main className="relative z-10 pb-32 pt-28">
            <ParallaxGallery dreams={dreams} onCardClick={handleSelect} />
          </main>
        </>
      )}
    </div>
  );
}

/** Canvas 崩溃兜底：3D 渲染失败时显示静态 UI（保留上层 header/nav 不白屏） */
function CanvasCrashFallback({ stage, onReset }: { stage: Stage; onReset: () => void }) {
  const isCorridor = stage === "corridor";
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-dreamgate-deep px-6 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-2xl font-light tracking-[0.2em] text-dreamgate-text-primary">
          {isCorridor ? "画廊暂时失焦" : "镜之门暂时失焦"}
        </p>
        <p className="max-w-sm text-sm text-dreamgate-text-muted">
          3D 场景未能渲染。可重试，或前往记录新的梦境。
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-dreamgate-ethereal/40 bg-dreamgate-elevated/30 px-5 py-2 text-sm tracking-wide text-dreamgate-ethereal backdrop-blur-sm transition hover:bg-dreamgate-ethereal/10"
        >
          重试
        </button>
        <a
          href="#/record"
          className="rounded-full border border-white/15 bg-dreamgate-ethereal/90 px-5 py-2 text-sm font-semibold tracking-wide text-dreamgate-deep transition hover:brightness-110"
        >
          记录新梦
        </a>
      </div>
    </div>
  );
}
