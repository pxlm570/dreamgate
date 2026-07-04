// MirrorGate — 3D 镜之门场景（@react-three/fiber）
// 组成：雾效 + 镜面（MeshReflectorMaterial 反射）+ 镜框 + 柔光晕 + 微光粒子 + 碎片
// 触发时：GSAP timeline 隐去镜面 → 碎片飞散 → 雾气扩散 → 相机推进穿过镜框
// 约 2s 后调用 onComplete，由 GatePage 跳转 /gallery

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, RoundedBox } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";

const FOG_COLOR = "#0a0a14";
const ACCENT = "#c9b8e8";
const ACCENT_2 = "#4ec9b0";
const ACCENT_3 = "#8b5cf6"; // 紫罗兰辉光辅色

/** 生成径向柔光贴图（白核 → 透明边），颜色由材质 color 控制 */
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

/** 生成光瀑贴图：上窄下宽的梯形光束，向下渐隐（美术馆顶光倾泻感） */
function makeShaftTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  try {
    // canvas filter blur 软化光束边缘（不支持的浏览器仅边缘略硬，无碍）
    ctx.filter = "blur(14px)";
  } catch {
    /* noop */
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w * 0.38, 0);
  ctx.lineTo(w * 0.62, 0);
  ctx.lineTo(w * 0.92, h);
  ctx.lineTo(w * 0.08, h);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** 体积光瀑：两片交叉的光束面片，从上方倾泻到镜面（伪体积光，Bloom 加持） */
function LightShaft({ texture }: { texture: THREE.Texture }) {
  const matProps = {
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  } as const;
  return (
    <group position={[0, 2.35, -0.15]}>
      <mesh>
        <planeGeometry args={[3.4, 5.6]} />
        <meshBasicMaterial {...matProps} color={ACCENT} opacity={0.32} />
      </mesh>
      <mesh rotation={[0, Math.PI / 5, 0]}>
        <planeGeometry args={[3.0, 5.6]} />
        <meshBasicMaterial {...matProps} color={ACCENT_3} opacity={0.2} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 5, 0]}>
        <planeGeometry args={[3.0, 5.6]} />
        <meshBasicMaterial {...matProps} color="#ffffff" opacity={0.1} />
      </mesh>
    </group>
  );
}

/**
 * 生成镜中星云贴图：多层柔和色晕叠加 + 暗角。
 * 镜面不再是「黑镜」（黑色四边形随视差歪斜显得别扭），而是一扇望进梦境的传送门。
 */
function makeNebulaTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 768;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0918";
  ctx.fillRect(0, 0, w, h);
  const orb = (cx: number, cy: number, r: number, color: string, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color.replace("A)", `${a})`));
    g.addColorStop(1, color.replace("A)", "0)"));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  ctx.globalCompositeOperation = "lighter";
  orb(w * 0.38, h * 0.3, w * 0.5, "rgba(139,92,246,A)", 0.5); // 紫罗兰
  orb(w * 0.66, h * 0.55, w * 0.55, "rgba(78,201,176,A)", 0.24); // 青绿
  orb(w * 0.5, h * 0.74, w * 0.6, "rgba(164,80,139,A)", 0.32); // 洋红
  orb(w * 0.56, h * 0.2, w * 0.34, "rgba(201,184,232,A)", 0.4); // 淡紫白
  orb(w * 0.3, h * 0.62, w * 0.3, "rgba(139,92,246,A)", 0.28);
  ctx.globalCompositeOperation = "source-over";
  // 暗角：边缘沉入深色，中心保持发光
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.62);
  vig.addColorStop(0, "rgba(6,5,16,0)");
  vig.addColorStop(1, "rgba(6,5,16,0.82)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // 细噪点预抖动：打散平滑渐变的色带（暗部 banding = 廉价感）
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    px[i] += n;
    px[i + 1] += n;
    px[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** 柔光晕平面：用径向贴图 + 加色混合，营造无硬边的光源/光晕 */
function GlowPlane({
  texture,
  position,
  scale,
  color,
  opacity,
}: {
  texture: THREE.Texture;
  position: [number, number, number];
  scale: [number, number];
  color: string;
  opacity: number;
}) {
  return (
    <mesh position={position} scale={[scale[0], scale[1], 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** 微光粒子 — 梦境尘埃，多层漂浮 + 闪烁 + 整体旋转（Bloom 加持下出辉光） */
function DreamParticles({ texture }: { texture: THREE.Texture }) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const count = 80;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // 分三层：近层密集（z 近）、远层稀疏（z 远），营造景深
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
    ref.current.position.x = Math.sin(t * 0.09) * 0.18;
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
        map={texture}
        size={0.13}
        color={ACCENT}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** 镜框 + 边缘辉光（柔光晕替代硬边高光带，Bloom 加持下出电影感光晕） */
function MirrorFrame({ glow }: { glow: THREE.Texture }) {
  return (
    <group position={[0, 0, -0.06]}>
      {/* 外框：近黑哑光窄框（宽的均匀发紫板 = 塑料感；深色窄框只给「份量」不抢戏） */}
      <RoundedBox args={[2.42, 3.42, 0.08]} radius={0.04} smoothness={4}>
        <meshStandardMaterial
          color="#0a0912"
          metalness={0.35}
          roughness={0.55}
          emissive={ACCENT_3}
          emissiveIntensity={0.03}
        />
      </RoundedBox>
      {/* 发光细缘：4 根发光条拼成空心门框（Bloom 加持成光缘）——珠宝感的关键。
          必须空心（实心板会在碎镜后穿帮）；z 提到镜面前方 0.03，与门框拉开距离，
          否则与框前表面仅差 0.005 会 z-fighting 闪烁；条宽 0.05 抗运动锯齿闪烁 */}
      {[
        { pos: [0, 1.525, 0.09] as const, size: [2.1, 0.05] as const },
        { pos: [0, -1.525, 0.09] as const, size: [2.1, 0.05] as const },
        { pos: [-1.025, 0, 0.09] as const, size: [0.05, 3.0] as const },
        { pos: [1.025, 0, 0.09] as const, size: [0.05, 3.0] as const },
      ].map((bar, i) => (
        <mesh key={i} position={[bar.pos[0], bar.pos[1], bar.pos[2]]}>
          <planeGeometry args={[bar.size[0], bar.size[1]]} />
          <meshBasicMaterial color={ACCENT} toneMapped={false} />
        </mesh>
      ))}
      {/* 内层辉光：径向柔光贴图（平面色块会显塑料，柔光无硬边） */}
      <GlowPlane
        texture={glow}
        position={[0, 0, -0.02]}
        scale={[3.4, 4.4]}
        color={ACCENT_3}
        opacity={0.3}
      />
      {/* 外层辉光：更大范围淡紫白弥散 */}
      <GlowPlane
        texture={glow}
        position={[0, 0, -0.04]}
        scale={[5.2, 6.2]}
        color={ACCENT}
        opacity={0.14}
      />
      {/* 顶部光源柔晕：模拟上方光线倾泻（压低强度，避免灰色云块感） */}
      <GlowPlane
        texture={glow}
        position={[0, 1.9, 0.04]}
        scale={[3.0, 1.6]}
        color={ACCENT}
        opacity={0.32}
      />
    </group>
  );
}

/**
 * 碎片：3×5 网格，触发时显示并飞散。
 * 每片贴星云贴图的对应区块（UV offset/repeat）——碎的是「镜中影像」本身，
 * 而非纯色塑料片：碎裂瞬间与镜面无缝衔接，飞散时片片带光。
 */
function Shards({ triggered, nebula }: { triggered: boolean; nebula: THREE.Texture }) {
  const groupRef = useRef<THREE.Group>(null);
  const COLS = 3;
  const ROWS = 5;
  const SW = 2 / COLS; // 与镜面 2×3 精确对齐
  const SH = 3 / ROWS;

  const shardData = useMemo(() => {
    return Array.from({ length: COLS * ROWS }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = (col - (COLS - 1) / 2) * SW;
      const y = (row - (ROWS - 1) / 2) * SH;
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
        col,
        row,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 每片一份贴图克隆，取自己的 UV 区块（three 的 v=0 在底部，与 row 序一致）
  const shardTextures = useMemo(
    () =>
      shardData.map(({ col, row }) => {
        const t = nebula.clone();
        t.repeat.set(1 / COLS, 1 / ROWS);
        t.offset.set(col / COLS, row / ROWS);
        t.needsUpdate = true;
        return t;
      }),
     
    [nebula, shardData],
  );

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
          <planeGeometry args={[SW, SH]} />
          <meshBasicMaterial
            map={shardTextures[i]}
            toneMapped={false}
            transparent
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
  nebula,
}: {
  triggering: boolean;
  onComplete: () => void;
  nebula: THREE.Texture;
}) {
  const mirrorRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();

  // idle 阶段：视差全部交给相机环绕漂移；镜面不再自转
  // （镜面倾斜会与固定镜框/发光缘产生相对错动，正是「黑色部分随鼠标变形」的来源）
  useFrame((state) => {
    if (!groupRef.current) return;
    const px = state.pointer.x;
    const py = state.pointer.y;
    if (!triggering) {
      // 相机缓慢环绕漂移（李萨如轨迹）：持续的运动视差是最强的立体感线索
      const t = state.clock.elapsedTime;
      camera.position.z = 6 + Math.sin(t * 0.3) * 0.15;
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        Math.sin(t * 0.11) * 0.55 + px * 0.35,
        0.03,
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        Math.cos(t * 0.09) * 0.22 + py * 0.18,
        0.03,
      );
      camera.lookAt(0, 0, 0);
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
      {/* 镜面 = 望进梦境的星云传送门（黑镜的黑色四边形随视差歪斜会显得别扭） */}
      <mesh ref={mirrorRef} position={[0, 0, 0]}>
        <planeGeometry args={[2, 3]} />
        <meshBasicMaterial map={nebula} />
      </mesh>
    </group>
  );
}

export function MirrorGate({ triggering, onComplete }: MirrorGateProps) {
  const glow = useMemo(makeGlowTexture, []);
  const shaft = useMemo(makeShaftTexture, []);
  const nebula = useMemo(makeNebulaTexture, []);
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[FOG_COLOR]} />
      <fogExp2 attach="fog" args={[FOG_COLOR, 0.055]} />
      {/* 光源：环境光 + 半球光 + 顶光（紫白）+ 侧光（青绿）+ 辅光（紫罗兰） */}
      <ambientLight intensity={0.4} />
      <hemisphereLight color={ACCENT} groundColor={FOG_COLOR} intensity={0.3} />
      <pointLight position={[3, 4, 5]} intensity={1.2} color={ACCENT} distance={20} />
      <pointLight position={[-4, -2, 3]} intensity={0.7} color={ACCENT_2} distance={15} />
      <pointLight position={[0, 0, 3]} intensity={0.62} color={ACCENT_3} distance={11} />
      {/* 注：不用 drei Environment（运行时联网拉 HDR，违背本地优先且可能卡首屏）；
          镜框反射内容由场景光源承担 */}
      {/* 镜面背后的环境光晕：增加纵深与通透（大范围、低强度，从镜缘溢出） */}
      <GlowPlane
        texture={glow}
        position={[0, 0, -0.6]}
        scale={[6.5, 7.5]}
        color={ACCENT_3}
        opacity={0.32}
      />
      {/* 体积光瀑：光从上方倾泻在镜上（美术馆聚光的电影语言） */}
      <LightShaft texture={shaft} />
      {/* 反射地板：镜子立于其上，倒影是最强的空间锚点 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, 0]}>
        <planeGeometry args={[34, 24]} />
        <MeshReflectorMaterial
          blur={[220, 60]}
          resolution={512}
          mixBlur={1}
          mixStrength={28}
          roughness={0.8}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#070710"
          metalness={0.45}
          mirror={0.55}
        />
      </mesh>
      {/* 镜前地面光池：光瀑落地的光斑 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.71, 0.9]} scale={[3.6, 2.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color={ACCENT}
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <MirrorFrame glow={glow} />
      <MirrorAndCamera triggering={triggering} onComplete={onComplete} nebula={nebula} />
      <Shards triggered={triggering} nebula={nebula} />
      <DreamParticles texture={glow} />
      {/* 后处理：Bloom 辉光 + Vignette 暗角，电影感 */}
      <EffectComposer>
        <Bloom
          intensity={0.95}
          luminanceThreshold={0.22}
          luminanceSmoothing={0.5}
          mipmapBlur
          radius={0.72}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.88} />
      </EffectComposer>
    </Canvas>
  );
}

export interface MirrorGateProps {
  /** 是否触发碎镜转场 */
  triggering: boolean;
  /** 转场完成回调 */
  onComplete: () => void;
}
