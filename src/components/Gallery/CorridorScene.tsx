// CorridorScene — 3D 走廊画廊场景
// Canvas + fogExp2 + 走廊墙壁（地板/天花板/两侧）+ DreamDoor 两侧交替排列
// 相机由外部 scrollRef（GSAP ScrollTrigger 写入）驱动，沿 Z 轴前进 + 指针视差

import { type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";
import { DreamDoor } from "./DreamDoor";

const FOG_BASE = "#07070d";
const WALL_COLOR = "#0a0a14";
const DOOR_SPACING = 4; // 每扇门 z 间距
const DOOR_OFFSET_X = 3; // 门距走廊中轴 x 偏移
const CORRIDOR_HALF_HEIGHT = 3;

/** hex 基底 + accent 按比例混合，返回 three.Color */
function mixColor(base: string, accent: string, ratio: number): THREE.Color {
  return new THREE.Color(base).lerp(new THREE.Color(accent), ratio);
}

/** 走廊墙壁：地板 / 天花板 / 左右墙 / 远端封口 */
function CorridorWalls({ length }: { length: number }) {
  const wallLen = length + 16;
  const centerZ = -length / 2;
  return (
    <group>
      <mesh position={[0, -CORRIDOR_HALF_HEIGHT, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, wallLen]} />
        <meshStandardMaterial color={WALL_COLOR} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, CORRIDOR_HALF_HEIGHT, centerZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, wallLen]} />
        <meshStandardMaterial color={WALL_COLOR} metalness={0.2} roughness={0.8} />
      </mesh>
      <mesh position={[-DOOR_OFFSET_X, 0, centerZ]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[wallLen, 6]} />
        <meshStandardMaterial color={WALL_COLOR} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[DOOR_OFFSET_X, 0, centerZ]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[wallLen, 6]} />
        <meshStandardMaterial color={WALL_COLOR} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, -length - 6]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#050509" metalness={0.1} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** 相机轨道：读取 scrollRef，从 z=startZ 移到 z=endZ，叠加指针视差 */
function CameraRig({
  scrollRef,
  length,
  reduceMotion,
}: {
  scrollRef: RefObject<number>;
  length: number;
  reduceMotion: boolean;
}) {
  const { camera } = useThree();
  const startZ = 4;
  const endZ = -length - 4;
  useFrame((state) => {
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

export interface CorridorSceneProps {
  dreams: Dream[];
  onDoorClick: (dream: Dream) => void;
  /** 滚动进度 0-1，由外部 ScrollTrigger 写入 */
  scrollRef: RefObject<number>;
  /** 是否启用 WebGL 雾效（fogShader 降级开关关闭时为 false） */
  withShaderFog: boolean;
  /** prefers-reduced-motion 时禁用平滑 lerp */
  reduceMotion: boolean;
}

export function CorridorScene({
  dreams,
  onDoorClick,
  scrollRef,
  withShaderFog,
  reduceMotion,
}: CorridorSceneProps) {
  // 最近 20 条，最新在前（走廊入口先看到最新梦境）
  const recent = dreams.slice(-20).reverse();
  const length = Math.max(recent.length - 1, 0) * DOOR_SPACING;
  const accentColor =
    getEmotionByWord(recent[0]?.emotion.word ?? "")?.color ?? "#c9b8e8";
  const fogColor = mixColor(FOG_BASE, accentColor, 0.1);
  const fogHex = `#${fogColor.getHexString()}`;
  // dpr 移动端降低，桌面端封顶 1.5
  const dpr: [number, number] =
    typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.2] : [1, 1.5];

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 55 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[fogHex]} />
      {withShaderFog && <fogExp2 attach="fog" args={[fogHex, 0.05]} />}
      <ambientLight intensity={0.2} />
      <hemisphereLight color={accentColor} groundColor={FOG_BASE} intensity={0.18} />
      <CorridorWalls length={length} />
      <CameraRig scrollRef={scrollRef} length={length} reduceMotion={reduceMotion} />
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
          />
        );
      })}
    </Canvas>
  );
}
