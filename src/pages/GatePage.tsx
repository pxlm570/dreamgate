// GatePage — 镜之门开场入口页
// 状态机：idle → triggered → done
// 检测 WebGL / 硬件并发，决定 3D 还是 CSS 降级
// 点击 / 滚轮 / 触摸均可触发；完成后 setView('gallery') + navigate('/gallery')

import { useCallback, useEffect, useState } from "react";
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
  const navigate = useNavigate();
  const setView = useDreamStore((s) => s.setView);

  // 同步 store 视图状态
  useEffect(() => {
    setView("gate");
  }, [setView]);

  // 首次挂载判定降级模式
  useEffect(() => {
    setMode(shouldUseFallback() ? "fallback" : "3d");
  }, []);

  const trigger = useCallback(() => {
    setPhase((p) => (p === "idle" ? "triggered" : p));
  }, []);

  const handleComplete = useCallback(() => {
    setPhase("done");
  }, []);

  // 完成后跳转画廊
  useEffect(() => {
    if (phase !== "done") return;
    setView("gallery");
    navigate("/gallery");
  }, [phase, navigate, setView]);

  // 全局滚轮 / 触摸触发（两种模式共用）
  useEffect(() => {
    if (mode === null) return;
    const onWheel = () => trigger();
    const onTouch = () => trigger();
    window.addEventListener("wheel", onWheel, { once: true, passive: true });
    window.addEventListener("touchstart", onTouch, {
      once: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [mode, trigger]);

  // 模式尚未判定时，渲染纯深色背景避免白闪
  if (mode === null) {
    return <div className="min-h-[100dvh] w-screen bg-dreamgate-deep" />;
  }

  const flashOverlay = (
    <AnimatePresence>
      {phase === "triggered" && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.7, times: [0, 0.3, 1] }}
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85), rgba(201,184,232,0.3) 60%, transparent 100%)",
          }}
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
      onClick={trigger}
    >
      <MirrorGate
        triggering={phase === "triggered"}
        onComplete={handleComplete}
      />
      <GateOverlay visible={phase === "idle"} />
      {flashOverlay}
    </div>
  );
}
