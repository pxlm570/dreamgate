// MirrorGate — 3D 镜之门场景（@react-three/fiber）
// 组成：雾效 + 镜面（MeshReflectorMaterial 反射）+ 镜框 + 微光粒子 + 碎片
// 触发时：GSAP timeline 隐去镜面 → 碎片飞散 → 雾气扩散 → 相机推进穿过镜框
// 约 2s 后调用 onComplete，由 GatePage 跳转 /gallery

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, RoundedBox, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";

const FOG_COLOR = "#0a0a14";
const MIRROR_COLOR = "#15132a";
const ACCENT = "#c9b8e8";
const ACCENT_2 = "#4ec9b0";
const ACCENT_3 = "#8b5cf6"; // 新增：紫罗兰辉光辅色

export interface MirrorGateProps {
  /** 是否触发碎镜转场 */
  triggering: boolean;
  /** 转场完成回调 */
  onComplete: () => void;
}

/** 微光粒子 — 梦境尘埃，多层漂浮 + 闪烁 + 整体旋转（Bloom 加持下出辉光） */
function DreamParticles() {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const count = 120; // 45 → 120，密度提升
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // 分两层：近层密集（z 近）、远层稀疏（z 远），营造景深
      const layer = i % 3;
      const zRange = layer === 0 ? 4 : layer === 1 ? 8 : 12;
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * zRange - 1;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.025;
    ref.current.position.y = Math.sin(t * 0.15) * 0.25;
    // 闪烁：opacity 呼吸
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(t * 0.8) * 0.2;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.085}
        color={ACCENT}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** 镜框 + 边缘辉光（多层叠加，Bloom 加持下出电影感光晕） */
function MirrorFrame() {
  return (
    <group position={[0, 0, -0.06]}>
      <RoundedBox args={[2.35, 3.35, 0.12]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color="#08080f"
          metalness={0.85}
          roughness={0.35}
          emissive={ACCENT_3}
          emissiveIntensity={0.12}
        />
      </RoundedBox>
      {/* 内层辉光：紧贴镜框，紫罗兰 */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[2.55, 3.55]} />
        <meshBasicMaterial
          color={ACCENT_3}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* 外层辉光：更大范围，淡紫白，营造光晕扩散 */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[3.1, 4.1]} />
        <meshBasicMaterial
          color={ACCENT}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* 顶部高光带：模拟上方光源投射 */}
      <mesh position={[0, 1.85, 0.02]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2.2, 0.15]} />
        <meshBasicMaterial
          color={ACCENT}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** 碎片：3×5 网格，触发时显示并飞散 */
function Shards({ triggered }: { triggered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const shardData = useMemo(() => {
    const cols = 3;
    const rows = 5;
    const sw = 1.9 / cols;
    const sh = 2.9 / rows;
    return Array.from({ length: cols * rows }, (_, i) => {
      const cx = (i % cols) - (cols - 1) / 2;
      const cy = Math.floor(i / cols) - (rows - 1) / 2;
      const x = cx * sw;
      const y = cy * sh;
      const angle = Math.atan2(y, x) + (Math.random() - 0.5) * 0.7;
      const dist = 3 + Math.random() * 2.5;
      return {
        init: [x, y, 0] as [number, number, number],
        target: [
          x + Math.cos(angle) * dist,
          y + Math.sin(angle) * dist,
          Math.random() * 3 - 0.5,
        ] as [number, number, number],
        rot: [
          (Math.random() - 0.5) * Math.PI * 3,
          (Math.random() - 0.5) * Math.PI * 3,
          (Math.random() - 0.5) * Math.PI * 3,
        ] as [number, number, number],
        scale: 0.6 + Math.random() * 0.5,
      };
    });
  }, []);

  useEffect(() => {
    if (!triggered) return;
    const group = groupRef.current;
    if (!group) return;
    const meshes = group.children as THREE.Mesh[];
    const tl = gsap.timeline();
    meshes.forEach((m, i) => {
      const d = shardData[i];
      if (!d) return;
      m.visible = true;
      m.position.set(...d.init);
      m.rotation.set(0, 0, 0);
      m.scale.setScalar(1);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = 1;
      tl.to(
        m.position,
        { x: d.target[0], y: d.target[1], z: d.target[2], duration: 1.8, ease: "power3.out" },
        0,
      );
      tl.to(
        m.rotation,
        { x: d.rot[0], y: d.rot[1], z: d.rot[2], duration: 1.8, ease: "power2.out" },
        0,
      );
      tl.to(
        m.scale,
        { x: d.scale, y: d.scale, z: d.scale, duration: 1.8, ease: "power2.out" },
        0,
      );
      tl.to(mat, { opacity: 0, duration: 1.4, ease: "power2.in" }, 0.25);
    });
    return () => {
      tl.kill();
    };
  }, [triggered, shardData]);

  return (
    <group ref={groupRef}>
      {shardData.map((_, i) => (
        <mesh key={i} visible={false}>
          <planeGeometry args={[0.6, 0.55]} />
          <meshStandardMaterial
            color={MIRROR_COLOR}
            metalness={0.95}
            roughness={0.18}
            transparent
            emissive={ACCENT}
            emissiveIntensity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 镜面 + 相机推进 + 雾气扩散（核心转场动画） */
function MirrorAndCamera({
  triggering,
  onComplete,
}: {
  triggering: boolean;
  onComplete: () => void;
}) {
  const mirrorRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();

  // idle 阶段：镜面跟随指针视差 + 相机轻微呼吸
  useFrame((state) => {
    if (!groupRef.current) return;
    const px = state.pointer.x;
    const py = state.pointer.y;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      px * 0.15,
      0.04,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      -py * 0.12,
      0.04,
    );
    if (!triggering) {
      const t = state.clock.elapsedTime;
      camera.position.z = 6 + Math.sin(t * 0.3) * 0.15;
    }
  });

  useEffect(() => {
    if (!triggering) return;
    const fog = scene.fog as THREE.FogExp2 | null;
    const tl = gsap.timeline();
    if (mirrorRef.current) {
      tl.to(
        mirrorRef.current.scale,
        { x: 0, y: 0, duration: 0.3, ease: "power3.in" },
        0,
      );
    }
    if (fog) {
      tl.to(fog, { density: 0.34, duration: 1.8, ease: "power2.in" }, 0);
    }
    tl.to(
      camera.position,
      {
        z: -3.2,
        duration: 1.85,
        ease: "power2.inOut",
        delay: 0.15,
        onComplete,
      },
      0,
    );
    return () => {
      tl.kill();
    };
  }, [triggering, camera, scene, onComplete]);

  return (
    <group ref={groupRef}>
      <mesh ref={mirrorRef} position={[0, 0, 0]}>
        <planeGeometry args={[2, 3]} />
        <MeshReflectorMaterial
          blur={[150, 40]}
          resolution={1024}
          mixBlur={1}
          mixStrength={35}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a14"
          mirror={0.65}
        />
      </mesh>
    </group>
  );
}

export function MirrorGate({ triggering, onComplete }: MirrorGateProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[FOG_COLOR]} />
      <fogExp2 attach="fog" args={[FOG_COLOR, 0.055]} />
      {/* 三层光源：环境光 + 顶光（紫白）+ 侧光（青绿）+ 辅光（紫罗兰） */}
      <ambientLight intensity={0.4} />
      <hemisphereLight color={ACCENT} groundColor={FOG_COLOR} intensity={0.3} />
      <pointLight position={[3, 4, 5]} intensity={1.2} color={ACCENT} distance={20} />
      <pointLight position={[-4, -2, 3]} intensity={0.7} color={ACCENT_2} distance={15} />
      <pointLight position={[0, 0, 3]} intensity={0.5} color={ACCENT_3} distance={10} />
      {/* 环境贴图：让金属镜框有反射内容 */}
      <Environment preset="night" />
      <MirrorFrame />
      <MirrorAndCamera triggering={triggering} onComplete={onComplete} />
      <Shards triggered={triggering} />
      <DreamParticles />
      {/* 后处理：Bloom 辉光 + Vignette 暗角，电影感 */}
      <EffectComposer>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.5}
          mipmapBlur
          radius={0.7}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
