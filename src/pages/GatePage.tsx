// GatePage — 镜之门开场入口页
// 状态机：idle → triggered → done
// 检测 WebGL / 硬件并发，决定 3D 还是 CSS 降级
// 点击 / 滚轮 / 触摸均可触发；完成后 setView('gallery') + navigate('/gallery')

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useDreamStore } from "@/store/useDreamStore";
import { MirrorGate } from "@/components/Gate/MirrorGate";
import { GateOverlay } from "@/components/Gate/GateOverlay";
import { CssMirrorFallback } from "@/components/Gate/CssMirrorFallback";

type Phase = "idle" | "triggered" | "done";
type Mode = "3d" | "fallback" | null;

/** 探测 WebGL 上下文是否可获取 */
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!gl;
  } catch {
    return false;
  }
}

/** 降级判定：WebGL 不可用 或 逻辑核心数 < 4 */
function shouldUseFallback(): boolean {
  if (!isWebGLAvailable()) return true;
  const cores = navigator.hardwareConcurrency ?? 8;
  return cores < 4;
}

export default function GatePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>(null);
  // kimi 式分幕：0=远景幕（门立于光瀑下）；1=近景幕（运镜推近镜面）；再进一步=碎镜穿越
  const [act, setAct] = useState<0 | 1>(0);
  const actRef = useRef<0 | 1>(0);
  const phaseRef = useRef<Phase>("idle");
  const lockRef = useRef(0); // 转场锁：一格滚轮=一次完整转场，转场期间忽略输入
  const navigate = useNavigate();
  const setView = useDreamStore((s) => s.setView);

  useEffect(() => {
    actRef.current = act;
  }, [act]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // 同步 store 视图状态
  useEffect(() => {
    setView("gate");
  }, [setView]);

  // 预热画廊资源：碎镜转场后 GalleryPage 首帧要解码的门图/尽头迷雾，
  // 在首页停留期间提前拉进浏览器缓存——跳转后的「卡一下」主要是纹理解码
  const dreams = useDreamStore((s) => s.dreams);
  useEffect(() => {
    const urls = [
      "/textures/corridor-mist.png",
      ...dreams
        .slice(-8)
        .map((d) => d.artifact.imageUrl)
        .filter((u) => u && !u.startsWith("data:")),
    ];
    for (const u of urls) {
      const im = new Image();
      im.src = u;
    }
  }, [dreams]);

  // 首次挂载判定降级模式
  useEffect(() => {
    setMode(shouldUseFallback() ? "fallback" : "3d");
  }, []);

  const trigger = useCallback(() => {
    setPhase((p) => (p === "idle" ? "triggered" : p));
  }, []);

  /** 分幕推进：dir=1 前进（幕0→幕1→碎镜），dir=-1 回退（幕1→幕0）。带 1.9s 转场锁。 */
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
      if (actRef.current === 0) {
        setAct(1);
      } else {
        trigger();
      }
    },
    [trigger],
  );

  const handleComplete = useCallback(() => {
    setPhase("done");
  }, []);

  // 完成后跳转画廊
  useEffect(() => {
    if (phase !== "done") return;
    setView("gallery");
    navigate("/gallery");
  }, [phase, navigate, setView]);

  // 全局滚轮 / 触摸推进分幕（3D 模式）；降级模式保持一步直达
  useEffect(() => {
    if (mode === null) return;
    const isFallback = mode === "fallback";
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
  }, [mode, advance, trigger]);

  // 模式尚未判定时，渲染纯深色背景避免白闪
  if (mode === null) {
    return <div className="min-h-[100dvh] w-screen bg-dreamgate-deep" />;
  }

  const flashOverlay = (
    <AnimatePresence>
      {phase === "triggered" && (
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
      {/* 末端暗场：注意条件是 phase!=="idle"——onComplete 置 done 后遮罩必须继续在场，
          否则全黑刚盖住的瞬间被卸载，会闪回门的画面再跳转（转场生硬的元凶） */}
      {phase !== "idle" && (
        <motion.div
          key="dive-end"
          className="pointer-events-none absolute inset-0 z-30 bg-dreamgate-deep"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: "easeIn", delay: 1.75 }}
        />
      )}
    </AnimatePresence>
  );

  if (mode === "fallback") {
    return (
      <div
        className="relative h-[100dvh] w-screen cursor-pointer overflow-hidden bg-dreamgate-deep select-none"
        onClick={trigger}
      >
        <CssMirrorFallback
          triggering={phase === "triggered"}
          onComplete={handleComplete}
        />
        {flashOverlay}
      </div>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-screen cursor-pointer overflow-hidden bg-dreamgate-deep select-none"
      onClick={() => advance(1)}
    >
      <MirrorGate
        triggering={phase === "triggered"}
        onComplete={handleComplete}
        act={act}
      />
      <GateOverlay visible={phase === "idle"} act={act} />
      {flashOverlay}
    </div>
  );
}
