// CorridorScene — 3D 走廊画廊场景
// Canvas + fogExp2 + 走廊墙壁（地板/天花板/两侧）+ DreamDoor 两侧交替排列
// 相机由外部 scrollRef（GSAP ScrollTrigger 写入）驱动，沿 Z 轴前进 + 指针视差

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";
import { DreamDoor } from "./DreamDoor";
import { SilverDreamEffect } from "@/components/Atmosphere/SilverDreamEffect";
import { useSilverFilter } from "@/lib/silverFilter";

const FOG_BASE = "#07070d";
const DOOR_SPACING = 4; // 每扇门 z 间距
const DOOR_OFFSET_X = 3; // 门距走廊中轴 x 偏移
const CORRIDOR_HALF_HEIGHT = 3;

/** hex 基底 + accent 按比例混合，返回 three.Color */
function mixColor(base: string, accent: string, ratio: number): THREE.Color {
  return new THREE.Color(base).lerp(new THREE.Color(accent), ratio);
}

/** 径向柔光贴图（白核→透明），用于走廊尽头的柔和光晕焦点 */
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** 走廊浮尘：沿走廊分布的微光粒子，增加纵深与呼吸感（Bloom 加持出辉光） */
function CorridorDust({ length, color, texture }: { length: number; color: string; texture: THREE.Texture }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => {
    const count = 90;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 5;
      arr[i * 3 + 2] = -Math.random() * (length + 10) + 4;
    }
    return arr;
  }, [length]);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.2) * 0.15;
    if (matRef.current) matRef.current.opacity = 0.4 + Math.sin(t * 0.6) * 0.15;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={texture}
        size={0.08}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** 走廊墙壁：地板（MeshReflectorMaterial 反射）+ 天花板 + 左右墙 + 远端封口 + 尽头光源 */
function CorridorWalls({ length, accentColor, glowTex }: { length: number; accentColor: string; glowTex: THREE.Texture }) {
  // 墙体向尽头方向大幅延长：让走廊管道在雾中隐没，而非露出方形开口
  // （之前 +16 会在尽头露出背景色的方形截面——「字的背景像塑料板」的元凶）
  const wallLen = length + 90;
  const centerZ = -length / 2 - 25;
  return (
    <group>
      {/* 地板：深色反射地面（光池/画作倒影承担空间感） */}
      <mesh position={[0, -CORRIDOR_HALF_HEIGHT, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, wallLen]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={20}
          roughness={0.85}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#080812"
          metalness={0.5}
          mirror={0.4}
        />
      </mesh>
      {/* 天花板：哑光深邃 */}
      <mesh position={[0, CORRIDOR_HALF_HEIGHT, centerZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, wallLen]} />
        <meshStandardMaterial color="#06060c" metalness={0.05} roughness={0.95} />
      </mesh>
      {/* 左墙：哑光深邃 */}
      <mesh position={[-DOOR_OFFSET_X, 0, centerZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[wallLen, 6]} />
        <meshStandardMaterial color="#07070e" metalness={0.06} roughness={0.9} />
      </mesh>
      {/* 右墙 */}
      <mesh position={[DOOR_OFFSET_X, 0, centerZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[wallLen, 6]} />
        <meshStandardMaterial color="#07070e" metalness={0.06} roughness={0.9} />
      </mesh>
      {/* 尽头不再封口——走廊向未知敞开（靠远方微光 + 暗角自然隐没），留想象空间 */}
      {/* 尽头引导光源：远处微光 */}
      <pointLight
        position={[0, 0, -length - 5]}
        intensity={2.2}
        color={accentColor}
        distance={16}
        decay={2}
      />
      {/* 尽头柔光晕：更大更柔的远方微明，像走廊尽头未知处的微光 */}
      <mesh position={[0, 0, -length - 7.5]} scale={[8, 8, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTex}
          color={accentColor}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* 尽头文案：给「仍未被发现的梦境」留白想象，而非被墙挡住 */}
      <Html
        position={[0, 0.15, -length - 6.5]}
        center
        distanceFactor={9}
        pointerEvents="none"
        zIndexRange={[6, 0]}
      >
        <div className="select-none whitespace-nowrap text-center">
          <p className="font-display text-3xl tracking-[0.26em] text-white/75 text-glow-soft">
            仍未发现的梦境……
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.45em] text-white/25">
            the unfound dreams
          </p>
        </div>
      </Html>
    </group>
  );
}

/** 聚焦目标：某扇门的位置与朝向（side=-1 左墙 / +1 右墙） */
export interface FocusTarget {
  x: number;
  z: number;
  side: number;
}

/** 相机轨道：漫游模式读 scrollRef 沿 Z 前进；聚焦模式电影运镜到门前 */
function CameraRig({
  scrollRef,
  length,
  reduceMotion,
  focusTarget,
}: {
  scrollRef: RefObject<number>;
  length: number;
  reduceMotion: boolean;
  focusTarget: FocusTarget | null;
}) {
  const { camera } = useThree();
  const startZ = 4;
  const endZ = -length - 4;
  useFrame((state) => {
    if (focusTarget) {
      // 聚焦：相机移到门前（距门约 2.7），正对门面，带极轻指针视差保留呼吸感
      const camX = focusTarget.side * (DOOR_OFFSET_X - 2.7);
      const px = reduceMotion ? 0 : state.pointer.x * 0.08;
      const py = reduceMotion ? 0 : state.pointer.y * 0.06;
      const ease = reduceMotion ? 1 : 0.07;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX + px, ease);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.1 + py, ease);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, focusTarget.z, ease);
      camera.lookAt(focusTarget.x, 0, focusTarget.z);
      return;
    }
    const p = Math.max(0, Math.min(1, scrollRef.current ?? 0));
    const targetZ = startZ + (endZ - startZ) * p;
    if (reduceMotion) {
      camera.position.z = targetZ;
      camera.position.x = 0;
      camera.position.y = 0;
    } else {
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.12);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, state.pointer.x * 0.45, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, state.pointer.y * 0.25, 0.05);
    }
    camera.lookAt(0, 0, targetZ - 4);
  });
  return null;
}

/** 帧率采样：预热后采样 ~2s，平均帧率过低则触发降级回调（卡顿自动降 2.5D，保交付） */
function FpsSampler({ onLow }: { onLow?: () => void }) {
  const ref = useRef({ warmUntil: 0, sampleStart: 0, frames: 0, fired: false });
  useFrame(() => {
    const s = ref.current;
    if (s.fired || !onLow) return;
    const now = performance.now();
    if (s.warmUntil === 0) {
      s.warmUntil = now + 900; // 首帧：设预热截止，避开加载抖动
      return;
    }
    if (now < s.warmUntil) return;
    if (s.sampleStart === 0) {
      s.sampleStart = now;
      s.frames = 0;
      return;
    }
    s.frames += 1;
    const elapsed = now - s.sampleStart;
    if (elapsed >= 2000) {
      s.fired = true;
      const fps = (s.frames / elapsed) * 1000;
      if (fps < 35) onLow();
    }
  });
  return null;
}

export interface CorridorSceneProps {
  dreams: Dream[];
  onDoorClick: (dream: Dream) => void;
  /** 滚动进度 0-1，由外部 ScrollTrigger 写入 */
  scrollRef: RefObject<number>;
  /** 是否启用 WebGL 雾效（fogShader 降级开关关闭时为 false） */
  withShaderFog: boolean;
  /** prefers-reduced-motion 时禁用平滑 lerp */
  reduceMotion: boolean;
  /** 3D 帧率过低时回调（外部据此降级到 2.5D，保交付） */
  onLowPerformance?: () => void;
  /** 当前聚焦的梦境 id（聚焦模式：相机运镜到该门前，忽略滚动） */
  focusedId?: string | null;
  /** 点击画布空白处（未命中任何门）——外部用于退出聚焦 */
  onMissClick?: () => void;
}

export function CorridorScene({
  dreams,
  onDoorClick,
  scrollRef,
  withShaderFog,
  reduceMotion,
  onLowPerformance,
  focusedId,
  onMissClick,
}: CorridorSceneProps) {
  // 最近 20 条，最新在前（走廊入口先看到最新梦境）
  const recent = dreams.slice(-20).reverse();
  const length = Math.max(recent.length - 1, 0) * DOOR_SPACING;
  // 聚焦目标：由 focusedId 求门位（与下方 DreamDoor 排布公式一致）
  const focusIdx = focusedId ? recent.findIndex((d) => d.id === focusedId) : -1;
  const focusTarget: FocusTarget | null =
    focusIdx >= 0
      ? {
          x: (focusIdx % 2 === 0 ? -1 : 1) * DOOR_OFFSET_X,
          z: -focusIdx * DOOR_SPACING,
          side: focusIdx % 2 === 0 ? -1 : 1,
        }
      : null;
  const accentColor =
    getEmotionByWord(recent[0]?.emotion.word ?? "")?.color ?? "#c9b8e8";
  const fogColor = mixColor(FOG_BASE, accentColor, 0.1);
  const fogHex = `#${fogColor.getHexString()}`;
  // dpr 移动端降低，桌面端封顶 1.5
  const dpr: [number, number] =
    typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.2] : [1, 1.5];
  const glowTex = useMemo(makeGlowTexture, []);
  const silver = useSilverFilter();
  const silverFx = useMemo(() => new SilverDreamEffect(), []);

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 55 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      onPointerMissed={() => onMissClick?.()}
    >
      <color attach="background" args={[fogHex]} />
      {withShaderFog && <fogExp2 attach="fog" args={[fogHex, 0.05]} />}
      {/* 多层光源：环境 + 半球 + 顶光（情绪色）+ 辅光 */}
      <ambientLight intensity={0.32} />
      <hemisphereLight color={accentColor} groundColor={FOG_BASE} intensity={0.25} />
      <pointLight position={[0, 4, 2]} intensity={0.6} color={accentColor} distance={15} />
      <pointLight position={[0, -2, 4]} intensity={0.3} color="#c9b8e8" distance={10} />
      <CorridorWalls length={length} accentColor={accentColor} glowTex={glowTex} />
      <CameraRig scrollRef={scrollRef} length={length} reduceMotion={reduceMotion} focusTarget={focusTarget} />
      {!reduceMotion && <CorridorDust length={length} color={accentColor} texture={glowTex} />}
      {!reduceMotion && <FpsSampler onLow={onLowPerformance} />}
      {recent.map((d, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const rotationY = side === -1 ? Math.PI / 2 : -Math.PI / 2;
        const x = side * DOOR_OFFSET_X;
        const z = -i * DOOR_SPACING;
        return (
          <DreamDoor
            key={d.id}
            dream={d}
            position={[x, 0, z]}
            rotationY={rotationY}
            onClick={onDoorClick}
            hideLabel={!!focusedId}
            highlight={focusedId === d.id}
            glowTex={glowTex}
          />
        );
      })}
      {/* 后处理：Bloom 让门框辉光与尽头光晕扩散成电影感 */}
      <EffectComposer>
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.28}
          luminanceSmoothing={0.5}
          mipmapBlur
          radius={0.65}
        />
        {/* 银盐梦境滤镜（可开关） */}
        {silver && <primitive object={silverFx} />}
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
