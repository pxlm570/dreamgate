// CorridorScene — 3D 走廊画廊场景
// Canvas + fogExp2 + 走廊墙壁（地板/天花板/两侧）+ DreamDoor 两侧交替排列
// 相机由外部 scrollRef（GSAP ScrollTrigger 写入）驱动，沿 Z 轴前进 + 指针视差

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";
import { useOptionalTexture } from "@/hooks/useOptionalTexture";
import { DreamDoor } from "./DreamDoor";

// 基调从近黑提到深紫灰（有色温的暗才有留白感，漆黑只有虚无感）
const FOG_BASE = "#0b0a15";
const DOOR_SPACING = 4; // 每扇门 z 间距
const DOOR_OFFSET_X = 3; // 门距走廊中轴 x 偏移
const CORRIDOR_HALF_HEIGHT = 3;

/** hex 基底 + accent 按比例混合，返回 three.Color */
function mixColor(base: string, accent: string, ratio: number): THREE.Color {
  return new THREE.Color(base).lerp(new THREE.Color(accent), ratio);
}

/** 尽头文案贴图：一次性绘制（Html 会每帧写 DOM transform——滚动抖动源之一） */
function makeEndTextTexture(): { tex: THREE.CanvasTexture; aspect: number } {
  const S = 2;
  const w = 720;
  const h = 150;
  const canvas = document.createElement("canvas");
  canvas.width = w * S;
  canvas.height = h * S;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(S, S);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = '300 44px "ZCOOL XiaoWei", "Noto Serif SC", serif';
  ctx.fillStyle = "rgba(240,238,248,0.8)";
  ctx.fillText("仍 未 发 现 的 梦 境 … …", w / 2, 18);
  ctx.font = '400 15px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText("T H E   U N F O U N D   D R E A M S", w / 2, 100);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { tex, aspect: w / h };
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
function CorridorWalls({ length, accentColor, glowTex, endMist }: { length: number; accentColor: string; glowTex: THREE.Texture; endMist: THREE.Texture | null }) {
  // 墙体向尽头方向大幅延长：让走廊管道在雾中隐没，而非露出方形开口
  // （之前 +16 会在尽头露出背景色的方形截面——「字的背景像塑料板」的元凶）
  const wallLen = length + 90;
  const centerZ = -length / 2 - 25;
  const endText = useMemo(makeEndTextTexture, []);
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
          color="#0c0b18"
          metalness={0.5}
          mirror={0.4}
        />
      </mesh>
      {/* 天花板：哑光深邃 */}
      <mesh position={[0, CORRIDOR_HALF_HEIGHT, centerZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, wallLen]} />
        <meshStandardMaterial color="#0a0913" metalness={0.05} roughness={0.95} />
      </mesh>
      {/* 左墙：哑光深邃 */}
      <mesh position={[-DOOR_OFFSET_X, 0, centerZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[wallLen, 6]} />
        <meshStandardMaterial color="#0c0b17" metalness={0.06} roughness={0.9} />
      </mesh>
      {/* 右墙 */}
      <mesh position={[DOOR_OFFSET_X, 0, centerZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[wallLen, 6]} />
        <meshStandardMaterial color="#0c0b17" metalness={0.06} roughness={0.9} />
      </mesh>
      {/* —— 建筑线索：踢脚线 + 天花灯带（透视消失线 = 室内空间感的骨架）—— */}
      {/* 左右踢脚线：墙脚微光勾边 */}
      <mesh position={[-DOOR_OFFSET_X + 0.02, -CORRIDOR_HALF_HEIGHT + 0.07, centerZ]}>
        <boxGeometry args={[0.03, 0.14, wallLen]} />
        <meshStandardMaterial color="#232236" metalness={0.5} roughness={0.5} emissive="#8b7fb8" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[DOOR_OFFSET_X - 0.02, -CORRIDOR_HALF_HEIGHT + 0.07, centerZ]}>
        <boxGeometry args={[0.03, 0.14, wallLen]} />
        <meshStandardMaterial color="#232236" metalness={0.5} roughness={0.5} emissive="#8b7fb8" emissiveIntensity={0.2} />
      </mesh>
      {/* 天花中央灯带：贯穿走廊的细发光线（最强纵深透视线索，Bloom 出柔光） */}
      <mesh position={[0, CORRIDOR_HALF_HEIGHT - 0.02, centerZ]}>
        <boxGeometry args={[0.09, 0.02, wallLen]} />
        <meshBasicMaterial color="#a99cd6" />
      </mesh>
      {/* 尽头不再封口——走廊向未知敞开，想象感来自「纵深」而非一块亮斑 */}
      {/* 尽头引导光源：远处微光 */}
      <pointLight
        position={[0, 0, -length - 5]}
        intensity={2.2}
        color={accentColor}
        distance={16}
        decay={2}
      />
      {/* 光之隧道：柔光在不同深度递减层叠——单块大光晕会读成「一面发光的墙」，
          多层递减才是「光通向更远处」 */}
      {/* 远三层用 gpt-image 迷雾真图（有云絮形状的光才不像亮片），近一层保留情绪色柔光 */}
      {[
        { z: -length - 6, s: 4.5, o: 0.38, mist: false },
        { z: -length - 11, s: 8, o: 0.3, mist: true },
        { z: -length - 18, s: 13, o: 0.2, mist: true },
        { z: -length - 27, s: 20, o: 0.12, mist: true },
      ].map((g, i) => (
        <mesh key={i} position={[0, 0, g.z]} scale={[g.s, g.s, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={g.mist && endMist ? endMist : glowTex}
            color={g.mist && endMist ? "#ffffff" : accentColor}
            transparent
            opacity={g.o}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* 幽灵门：尽头之外墙上若隐若现的空门框——尚未成形的梦境，越远越淡 */}
      {[0, 1, 2, 3].map((i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const z = -length - 4 - i * 3.4;
        return (
          <mesh
            key={`ghost-${i}`}
            position={[side * (DOOR_OFFSET_X - 0.04), 0, z]}
            rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            <planeGeometry args={[2.1, 3.1]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.11 - i * 0.022}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      {/* 尽头文案：canvas sprite（一次绘制零每帧成本），飘在光的深处 */}
      <sprite position={[0, 0.15, -length - 7.5]} scale={[5.6, 5.6 / endText.aspect, 1]}>
        <spriteMaterial map={endText.tex} transparent opacity={0.85} depthWrite={false} />
      </sprite>
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
  diving = false,
}: {
  scrollRef: RefObject<number>;
  length: number;
  reduceMotion: boolean;
  focusTarget: FocusTarget | null;
  diving?: boolean;
}) {
  const { camera } = useThree();
  const startZ = 4;
  const endZ = -length - 4;
  // 聚焦偏心构图的 lookAt z 偏移（damp 过渡，入画俯冲时收回到正对画心）
  const lookZOffRef = useRef(0.9);
  // 注：平滑一律用 damp（帧率无关的指数衰减）。固定系数 lerp 在帧率波动时
  // 平滑量逐帧不同（重场景帧率不稳），叠加 Lenis 自身平滑即产生肉眼可见的滚动抖动。
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); // 掐掉超长帧尖峰，防跳变
    if (focusTarget) {
      // 聚焦：偏心构图（noomo 编辑式排版）——lookAt 沿走廊方向偏移 0.9，
      // 画作让位到画面一侧，另一侧留白给 DOM 展签（左墙画→画偏右/展签在左，右墙反之）。
      // 入画（diving）：相机向画面俯冲 + lookAt 收回画心，配合页面淡出完成「穿越入画」。
      const camX = focusTarget.side * (DOOR_OFFSET_X - (diving ? 1.05 : 2.7));
      const lookZTarget = diving ? 0 : 0.9;
      const px = reduceMotion || diving ? 0 : state.pointer.x * 0.08;
      const py = reduceMotion || diving ? 0 : state.pointer.y * 0.06;
      if (reduceMotion) {
        lookZOffRef.current = lookZTarget;
        camera.position.set(camX, 0.1, focusTarget.z);
      } else {
        const lam = diving ? 3.2 : 4.5;
        lookZOffRef.current = THREE.MathUtils.damp(lookZOffRef.current, lookZTarget, lam, dt);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, camX + px, lam, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.1 + py, lam, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, focusTarget.z, lam, dt);
      }
      camera.lookAt(focusTarget.x, 0, focusTarget.z + lookZOffRef.current);
      return;
    }
    lookZOffRef.current = 0.9; // 退出聚焦即复位，下次聚焦仍是偏心构图
    const p = Math.max(0, Math.min(1, scrollRef.current ?? 0));
    const targetZ = startZ + (endZ - startZ) * p;
    if (reduceMotion) {
      camera.position.z = targetZ;
      camera.position.x = 0;
      camera.position.y = 0;
    } else {
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 8, dt);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, state.pointer.x * 0.45, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, state.pointer.y * 0.25, 3, dt);
    }
    // 朝向跟随相机自身的平滑 z（跟未平滑的 targetZ 会让朝向领先位置，产生微晃）
    camera.lookAt(0, 0, camera.position.z - 8);
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
  /** 入画中：相机向聚焦画面俯冲（配合页面淡出过渡） */
  diving?: boolean;
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
  diving = false,
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
  const fogColor = mixColor(FOG_BASE, accentColor, 0.16);
  const fogHex = `#${fogColor.getHexString()}`;
  // dpr 移动端降低，桌面端封顶 1.5
  const dpr: [number, number] =
    typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.2] : [1, 1.5];
  const glowTex = useMemo(makeGlowTexture, []);
  // 尽头迷雾真图（gpt-image）：缺图回退程序化径向柔光
  const endMist = useOptionalTexture("/textures/corridor-mist.png");

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
      <ambientLight intensity={0.42} />
      <hemisphereLight color={accentColor} groundColor={FOG_BASE} intensity={0.34} />
      <pointLight position={[0, 4, 2]} intensity={0.6} color={accentColor} distance={15} />
      <pointLight position={[0, -2, 4]} intensity={0.3} color="#c9b8e8" distance={10} />
      <CorridorWalls length={length} accentColor={accentColor} glowTex={glowTex} endMist={endMist} />
      <CameraRig scrollRef={scrollRef} length={length} reduceMotion={reduceMotion} focusTarget={focusTarget} diving={diving} />
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
        {/* 暗角减弱：过重的暗角把走廊四周压成漆黑，吃掉建筑线条的留白层次 */}
        <Vignette eskil={false} offset={0.16} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}
