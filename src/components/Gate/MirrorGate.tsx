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
import { useOptionalTexture } from "@/hooks/useOptionalTexture";

// 基调从近黑提到深紫灰：留白要有层次的「空」，不是漆黑（noomo 的暗都是有色温的）
const FOG_COLOR = "#0d0c19";
const ACCENT = "#c9b8e8";
const ACCENT_2 = "#4ec9b0";
const ACCENT_3 = "#8b5cf6"; // 紫罗兰辉光辅色

/**
 * 拱门框贴图开口实测值（PowerShell 逐像素，System.Drawing，1024×1536，v2 雕饰版）：
 * 直边内缘 fx≈0.1768（左右均值）；拱顶内缘 fyApex=0.1022；
 * 拱为标准半圆 → 拱肩 fySpring = fyApex + 半径(0.2155h) ≈ 0.318；开口直通图底（门）。
 * 外缘：侧带宽 0.1367w、拱顶带厚 0.0938h（实体几何外轮廓按 ~92% 内缩，保前盖不采黑底）。
 */
const ARCH_M = { fx: 0.1768, fyApex: 0.1022, fySpring: 0.318 };
/**
 * 世界映射：窗宽（0.6465w）= 世界 2；apex=+1.5；
 * 窗底=图底，对齐到镜面底缘 -1.65（拱门无底杠，若仍按 -1.5 映射，
 * 镜面下缘超填部分会从门洞下方露出一条）→ 窗高 = 3.15。
 */
const ARCH_WF = 1 - ARCH_M.fx * 2;
const ARCH_HF = 1 - ARCH_M.fyApex;
const ARCH_PLANE_W = 2 / ARCH_WF;
const ARCH_PLANE_H = 3.15 / ARCH_HF;
/** 贴图平面 y：使贴图中 apex 落在世界 +1.5（底缘即窗底 -1.65） */
const ARCH_MESH_Y = 1.5 - (0.5 - ARCH_M.fyApex) * ARCH_PLANE_H;
/** 拱肩线的世界 y */
const ARCH_SPRING_Y = 1.5 - ((ARCH_M.fySpring - ARCH_M.fyApex) / ARCH_HF) * 3.15;
/** 门带世界宽（外轮廓用，按实测 92% 内缩：侧 0.1367w→0.39、顶 0.0938h→0.30） */
const ARCH_BAND_X = 0.39;
const ARCH_BAND_TOP = 0.3;

/**
 * 「画界」拱形几何体：与拱窗同形；左右/拱顶外扩 pad 塞进框唇下，
 * 底缘与镜底 -1.65 齐平（下方没有框可塞）。
 * UV 重映射到旧矩形画界（2.4×3.3 居中）的坐标系，贴图构图与矩形版一致。
 */
function makeArchPortalGeometry(pad = 0.08): THREE.ShapeGeometry {
  const hw = 1 + pad; // 半宽
  const yB = -1.65;
  const yA = 1.5 + pad;
  const yS = ARCH_SPRING_Y;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, yB);
  shape.lineTo(-hw, yS);
  // 从 π 顺时针到 0，经过 π/2（Y-up 拱顶）
  shape.absellipse(0, yS, hw, yA - yS, Math.PI, 0, true, 0);
  shape.lineTo(hw, yB);
  shape.closePath();
  const geom = new THREE.ShapeGeometry(shape, 48);
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / 2.4 + 0.5, pos.getY(i) / 3.3 + 0.5);
  }
  uv.needsUpdate = true;
  return geom;
}

/**
 * 拱门实体几何（用户三轮反馈 07-09：门框太平面 → 真三维）：
 * ∩ 形单轮廓（外缘 - 门洞）挤出 depth 厚度。门洞边界由几何定义——
 * 画面（镜面）藏在门体厚度内，被门洞内壁(jamb)深度剔除，从根上杜绝露边；
 * 内壁在相机视差下真实可见 = 立体感来源。
 * 材质组：0=前后盖（前盖贴大理石雕饰图，UV 映射到贴图平面坐标），1=侧壁（纯大理石受光）。
 */
function makeArchSolidGeometry(depth = 0.24): THREE.ExtrudeGeometry {
  const wIn = 1;
  const wOut = 1 + ARCH_BAND_X;
  const yB = -1.65;
  const yS = ARCH_SPRING_Y;
  const yAIn = 1.5;
  const yAOut = 1.5 + ARCH_BAND_TOP;
  const s = new THREE.Shape();
  // 外缘：左腿底 → 左外侧上行 → 外拱（π→0 经顶）→ 右外侧下行 → 右腿底
  s.moveTo(-wOut, yB);
  s.lineTo(-wOut, yS);
  s.absellipse(0, yS, wOut, yAOut - yS, Math.PI, 0, true, 0);
  s.lineTo(wOut, yB);
  // 内缘（反向回描）：右腿底内侧 → 内拱（0→π 经顶）→ 左腿底内侧 → close
  s.lineTo(wIn, yB);
  s.lineTo(wIn, yS);
  s.absellipse(0, yS, wIn, yAIn - yS, 0, Math.PI, false, 0);
  s.lineTo(-wIn, yB);
  s.closePath();
  const geom = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 48 });
  // 前后盖 UV：映射到贴图平面坐标系（ARCH_PLANE_W/H 中心在 ARCH_MESH_Y）
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const uv = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(norm.getZ(i)) > 0.9) {
      uv.setXY(
        i,
        pos.getX(i) / ARCH_PLANE_W + 0.5,
        (pos.getY(i) - ARCH_MESH_Y) / ARCH_PLANE_H + 0.5,
      );
    }
  }
  uv.needsUpdate = true;
  return geom;
}

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

/**
 * 天幕贴图：竖向渐变的无限影棚背景（cyclorama）——
 * 地平线附近微亮的深紫，向上向下沉入基调色，加细噪抖动杀色带。
 * 舞台感的关键：背景不是黑洞，而是有远方的「空」。
 */
function makeBackdropTexture(): THREE.CanvasTexture {
  // 大平面上的线性渐变会读成「塑料布」——空气感要靠多层柔和色晕的不均匀性：
  // 亮区有形状、有偏移、有冷暖对比，边缘沉入基调，重噪抖动杀色带
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0b0a16";
  ctx.fillRect(0, 0, w, h);
  const orb = (cx: number, cy: number, r: number, color: string, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color.replace("A)", `${a})`));
    g.addColorStop(1, color.replace("A)", "0)"));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  ctx.globalCompositeOperation = "lighter";
  orb(w * 0.5, h * 0.74, w * 0.5, "rgba(58,48,104,A)", 0.5); // 主光区：地平线上方暗紫
  orb(w * 0.3, h * 0.6, w * 0.38, "rgba(84,66,140,A)", 0.2); // 左上偏亮紫
  orb(w * 0.72, h * 0.66, w * 0.42, "rgba(58,84,120,A)", 0.15); // 右侧一点冷蓝平衡
  orb(w * 0.5, h * 0.26, w * 0.55, "rgba(28,24,56,A)", 0.32); // 上空幽暗
  ctx.globalCompositeOperation = "source-over";
  // 四周暗角：平面边界沉入基调色，看不出「一块布」的边
  const vig = ctx.createRadialGradient(w / 2, h * 0.62, h * 0.2, w / 2, h * 0.62, h * 0.72);
  vig.addColorStop(0, "rgba(11,10,22,0)");
  vig.addColorStop(1, "rgba(11,10,22,0.9)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const n = (Math.random() - 0.5) * 13;
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
      {/* 外框：大理石白哑光窄框（与定稿贴图同方向；贴图缺失时的形近回退） */}
      <RoundedBox args={[2.42, 3.42, 0.08]} radius={0.04} smoothness={4}>
        <meshStandardMaterial
          color="#e9e7e1"
          metalness={0.05}
          roughness={0.5}
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
  const SW = 2.4 / COLS; // 与镜面 2.4×3.3 精确对齐
  const SH = 3.3 / ROWS;

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
        { x: d.target[0], y: d.target[1], z: d.target[2], duration: 1.1, ease: "power3.out" },
        0,
      );
      tl.to(
        m.rotation,
        { x: d.rot[0], y: d.rot[1], z: d.rot[2], duration: 1.1, ease: "power2.out" },
        0,
      );
      tl.to(
        m.scale,
        { x: d.scale, y: d.scale, z: d.scale, duration: 1.1, ease: "power2.out" },
        0,
      );
      tl.to(mat, { opacity: 0, duration: 0.85, ease: "power2.in" }, 0.2);
    });
    return () => {
      tl.kill();
    };
  }, [triggered, shardData]);

  return (
    <group ref={groupRef}>
      {/* 预热：opacity=0 而非 visible=false——15 份碎片纹理克隆若等到触发才首渲，
          触发帧要一次性上传 15 张纹理 + 编译着色器，必然卡顿；常驻透明渲染零感知 */}
      {shardData.map((_, i) => (
        <mesh key={i}>
          <planeGeometry args={[SW, SH]} />
          <meshBasicMaterial
            map={shardTextures[i]}
            toneMapped={false}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 镜面 + 相机推进 + 雾气扩散（核心转场动画）；act 驱动分幕运镜 */
function MirrorAndCamera({
  triggering,
  onComplete,
  nebula,
  act,
  cameraEnabled = true,
  originZ = 0,
  onShatter,
}: {
  triggering: boolean;
  onComplete: () => void;
  nebula: THREE.Texture;
  act: 0 | 1;
  /** 单世界模式下走廊接管相机后置 false（idle 漂移与触发推进都停用） */
  cameraEnabled?: boolean;
  /** 门的世界 z 原点（单世界把门立在走廊门槛前 originZ=GATE_ORIGIN_Z；场景组已整体平移，此处补相机数值） */
  originZ?: number;
  /** 碎裂瞬间回调（白闪峰值附近）——单世界借此切走廊可见/雾/隐镜湖环境 */
  onShatter?: () => void;
}) {
  const mirrorRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lookYRef = useRef(0);
  const { camera } = useThree();
  // 镜面拱形几何体：框贴图拱肩外是键控透明区，矩形镜面的上角会从拱肩后穿出——
  // 镜面用拱形（pad 大，整圈塞进框带之下；框带世界宽 ~0.33）
  const mirrorGeom = useMemo(() => makeArchPortalGeometry(0.14), []);
  // 镜面用独立克隆贴图：呼吸动画改 offset/repeat，不能影响碎片共享的原图
  const mirrorMap = useMemo(() => {
    const t = nebula.clone();
    t.needsUpdate = true;
    return t;
  }, [nebula]);

  // 相机接力（单世界）：门重新接管相机时恢复 gate 视角参数；
  // 并在非触发态复位镜面（从走廊回退到门时，转场留下的隐藏镜面要复原）
  useEffect(() => {
    if (!cameraEnabled) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera && cam.fov !== 50) {
      cam.fov = 50;
      cam.updateProjectionMatrix();
    }
  }, [cameraEnabled, camera]);
  useEffect(() => {
    if (triggering) return;
    if (mirrorRef.current) mirrorRef.current.visible = true;
  }, [triggering]);

  // idle 阶段：视差全部交给相机环绕漂移；镜面不再自转
  // （镜面倾斜会与固定镜框/发光缘产生相对错动，正是「黑色部分随鼠标变形」的来源）
  useFrame((state) => {
    if (!groupRef.current || !cameraEnabled) return;
    const px = state.pointer.x;
    const py = state.pointer.y;
    if (!triggering) {
      // 分幕运镜（kimi 式）：幕0 远景舞台全貌，幕1 推近镜面；
      // 慢速 lerp 本身即 ~2s 的电影转场，叠加李萨如漂移保持画面恒动
      const t = state.clock.elapsedTime;
      // 镜中世界的呼吸：贴图缓慢推近/漂移——镜面不是一张贴死的画，
      // 而是一扇望进去还在流动的窗（镜子的想象空间所在）
      if (mirrorRef.current) {
        const mat = mirrorRef.current.material as THREE.MeshBasicMaterial;
        if (mat.map) {
          const s = 0.93 + Math.sin(t * 0.06) * 0.025;
          mat.map.repeat.set(s, s);
          mat.map.offset.set(
            (1 - s) / 2 + Math.sin(t * 0.11) * 0.006,
            (1 - s) / 2 + Math.cos(t * 0.08) * 0.005,
          );
        }
      }
      // 幕1 拉远一点 + 视线下移：镜面在画面里上移收小，底部文案区不再压住镜面
      const baseZ = originZ + (act === 0 ? 9.6 : 5.7);
      const ax = act === 0 ? 0.8 : 0.42;
      const ay = act === 0 ? 0.32 : 0.18;
      const lookY = act === 0 ? 0 : -0.5;
      lookYRef.current = THREE.MathUtils.lerp(lookYRef.current, lookY, 0.03);
      camera.position.z = THREE.MathUtils.lerp(
        camera.position.z,
        baseZ + Math.sin(t * 0.3) * 0.15,
        0.035,
      );
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        Math.sin(t * 0.11) * ax + px * 0.35,
        0.03,
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        Math.cos(t * 0.09) * ay + py * 0.18,
        0.03,
      );
      camera.lookAt(0, lookYRef.current, originZ);
    }
  });

  useEffect(() => {
    if (!triggering || !cameraEnabled) return;
    const tl = gsap.timeline();
    // 真连续穿门（单世界）——两拍：
    //   第1拍 0~0.95s   碎裂谢幕：镜面瞬隐、碎片飞散淡尽；白闪峰值处 onShatter
    //                   （外层借此把门内换成真走廊：走廊显形、雾切走廊值、镜湖环境隐去）
    //   第2拍 0.95~2.25s 推进穿门：相机加速推过门洞（终点=走廊相机起点 originZ-0.5），
    //                   门内已是真实走廊——不再有画界贴图、不再有静帧遮罩，
    //                   「穿过门就走进了美术馆」
    //   2.3s onComplete：相机已立在走廊入口，交给 CameraRig 接管（intro 自适应零跳变）
    if (mirrorRef.current) {
      // 瞬时隐去：碎片与镜面同位同图，接管是无缝的——
      // 「镜面缩小消失」动画本身就是"上一个画面没结束"的观感来源
      tl.set(mirrorRef.current, { visible: false }, 0.06);
    }
    if (onShatter) tl.call(onShatter, [], 0.1);
    // 相机推进：归正 x/y 对准门心，z 一路推过门洞。power2.in 先缓后急 =
    // 迈进门槛的加速度感。lookAt 全程看向「前方 6 单位」——推进中自然从
    // 门心滑向走廊深处，与走廊 CameraRig 的注视语义(z-8)平滑衔接。
    const look = { y: lookYRef.current };
    tl.to(
      camera.position,
      { x: 0, y: 0, z: originZ - 0.5, duration: 1.3, ease: "power2.in" },
      0.95,
    );
    tl.to(
      look,
      {
        y: 0,
        duration: 1.3,
        ease: "power2.out",
        onUpdate: () => camera.lookAt(0, look.y, camera.position.z - 6),
      },
      0.95,
    );
    tl.call(onComplete, [], 2.3);
    return () => {
      tl.kill();
    };
  }, [triggering, camera, onComplete, cameraEnabled, originZ, onShatter]);

  return (
    <group ref={groupRef}>
      {/* 镜面 = 望进梦境的星云传送门（黑镜的黑色四边形随视差歪斜会显得别扭）；
          拱形几何体，上角不再从拱肩后穿出。碎裂后门内露出的是真实走廊（单世界）。 */}
      <mesh ref={mirrorRef} position={[0, 0, 0]} geometry={mirrorGeom}>
        <meshBasicMaterial map={mirrorMap} />
      </mesh>
    </group>
  );
}

/** 镜之门场景的氛围参数（单世界 World 统一管理雾/背景时取用） */
export const GATE_ATMOSPHERE = { color: FOG_COLOR, density: 0.055 } as const;

/**
 * GateScene — 镜之门场景内容（不含 Canvas 壳）。
 * 融合单世界 Step1 提取：可作为独立页 Canvas 的孩子（MirrorGate），
 * 也可挂进单世界 World Canvas 与走廊共存（standalone=false + visible/cameraEnabled 切换）。
 */
export function GateScene({
  triggering,
  onComplete,
  act = 1,
  standalone = true,
  cameraEnabled = true,
  visible = true,
  originZ = 0,
  hideEnvirons = false,
  onShatter,
}: MirrorGateProps) {
  const glow = useMemo(makeGlowTexture, []);
  const nebula = useMemo(makeNebulaTexture, []);
  const backdropCanvas = useMemo(makeBackdropTexture, []);
  // 定稿A「镜湖」素材（全部缺图回退现有画法）
  // 白大理石拱门（07-09 三轮：实体几何 + 雕饰线脚贴图）：门洞边界由几何定义，
  // 原图直接贴前盖（无需抠窗/键控），开口实测值见 ARCH_M
  const mirrorFrameTex = useOptionalTexture("/textures/mirror-frame-arch.png");
  const archSolid = useMemo(() => makeArchSolidGeometry(), []);
  const cloudTex = useOptionalTexture("/textures/cloud-bank.png");
  // 天幕真图：gpt-image matte painting（程序化色晕画不出空气感），缺图回退 canvas 版
  const backdropImg = useOptionalTexture("/textures/gate-backdrop.png");
  const backdrop = backdropImg ?? backdropCanvas;
  // 镜中真画：gpt-image 生成的「门中梦境世界」（有作者的内容才是视觉主角）；
  // 未加载/缺图时回退程序星云，碎镜与镜面同源（碎的就是这幅画）
  const dreamTex = useOptionalTexture("/textures/mirror-dream.png");
  const mirrorTex = dreamTex ?? nebula;
  return (
    <>
      {standalone && (
        <>
          <color attach="background" args={[GATE_ATMOSPHERE.color]} />
          <fogExp2 attach="fog" args={[GATE_ATMOSPHERE.color, GATE_ATMOSPHERE.density]} />
        </>
      )}
      {/* 场景本体：单世界模式下经 visible 整组显隐（隐藏时灯光/物体均不参与渲染，
          但纹理/着色器常驻 GPU——切换零上传成本，这正是融合的意义）。
          position.z=originZ：单世界把整座镜湖舞台平移到走廊门槛前。 */}
      <group visible={visible} position={[0, 0, originZ]}>
      {/* 光源：环境光 + 半球光 + 顶光（紫白）+ 侧光（青绿）+ 辅光（紫罗兰） */}
      <ambientLight intensity={0.5} />
      <hemisphereLight color={ACCENT} groundColor={FOG_COLOR} intensity={0.38} />
      {/* —— 镜湖环境（穿门瞬间整组隐去，藏进白闪；门框/碎片/粒子保留）—— */}
      <group visible={!hideEnvirons}>
      {/* 天幕：无限影棚渐变背景（fog=false 保渐变纯净，否则远距被雾灰化） */}
      <mesh position={[0, 2, -17]}>
        <planeGeometry args={[64, 32]} />
        <meshBasicMaterial map={backdrop} fog={false} />
      </mesh>
      {/* 地平线微光：镜后远方的一线晨昏（压低压小——过亮的大光带=平板塑料感） */}
      <GlowPlane
        texture={glow}
        position={[0, -1.1, -13.5]}
        scale={[24, 6]}
        color={ACCENT_3}
        opacity={0.11}
      />
      {/* 镜面背后的环境光晕：增加纵深与通透（大范围、低强度，从镜缘溢出） */}
      <GlowPlane
        texture={glow}
        position={[0, 0, -0.6]}
        scale={[6.5, 7.5]}
        color={ACCENT_3}
        opacity={0.32}
      />
      {/* 反射地板：镜子立于其上，倒影是最强的空间锚点 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, -5]}>
        <planeGeometry args={[34, 34]} />
        <MeshReflectorMaterial
          blur={[120, 30]}
          resolution={512}
          mixBlur={1}
          mixStrength={48}
          roughness={0.35}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#131129"
          metalness={0.6}
          mirror={0.8}
        />
      </mesh>
      {/* 地平线雾霭：柔光横带糊掉「地板黑平板 vs 天幕」的生硬接缝——
          远处地面应溶进空气里，而不是一条切线 */}
      <GlowPlane
        texture={glow}
        position={[0, -1.2, -12.2]}
        scale={[44, 5.6]}
        color="#6a5c9e"
        opacity={0.28}
      />
      <GlowPlane
        texture={glow}
        position={[0, -1.45, -11.8]}
        scale={[62, 3.6]}
        color="#4a3f78"
        opacity={0.2}
      />
      {/* 镜前地面光池：光瀑落地的光斑 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.71, 0.9]} scale={[3.6, 2.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color={ACCENT}
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      </group>
      <pointLight position={[3, 4, 5]} intensity={1.2} color={ACCENT} distance={20} />
      <pointLight position={[-4, -2, 3]} intensity={0.7} color={ACCENT_2} distance={15} />
      <pointLight position={[0, 0, 3]} intensity={0.62} color={ACCENT_3} distance={11} />
      {/* 注：不用 drei Environment（运行时联网拉 HDR，违背本地优先且可能卡首屏）；
          镜框反射内容由场景光源承担 */}
      {mirrorFrameTex ? (
        <group position={[0, 0, -0.06]}>
          {/* 大理石拱门实体：0.24 厚挤出体（组内 -0.02..0.22 → 世界 -0.08..0.16），
              镜面（世界 z≈0）藏在门体厚度内，门洞内壁深度剔除超填镜缘——零露边；
              前盖贴雕饰大理石图（画进去的光影），侧壁/内壁纯大理石吃场景光=立体 */}
          <mesh geometry={archSolid} position={[0, 0, -0.02]}>
            <meshBasicMaterial attach="material-0" map={mirrorFrameTex} />
            <meshStandardMaterial
              attach="material-1"
              color="#d9d6cf"
              roughness={0.55}
              metalness={0.05}
            />
          </mesh>
          {/* 辉光压暗：镜面隐去后这两层不能裸露成一块淡紫平板 */}
          <GlowPlane texture={glow} position={[0, 0, -0.02]} scale={[3.4, 4.4]} color={ACCENT_3} opacity={0.12} />
          <GlowPlane texture={glow} position={[0, 0, -0.04]} scale={[5.2, 6.2]} color={ACCENT} opacity={0.06} />
        </group>
      ) : (
        <MirrorFrame glow={glow} />
      )}
      {/* 定稿A：两侧云堤（加色混合黑底消隐；fog=false 保云的银边）——属镜湖环境 */}
      {cloudTex && (
        <group visible={!hideEnvirons}>
          <mesh position={[-8.2, -1.0, -8]} rotation={[0, 0.55, 0]} scale={[15, 10, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={cloudTex} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
          <mesh position={[8.2, -0.7, -8.5]} rotation={[0, -0.55, 0]} scale={[-15, 10, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={cloudTex} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
        </group>
      )}

      <MirrorAndCamera
        triggering={triggering}
        onComplete={onComplete}
        nebula={mirrorTex}
        act={act}
        cameraEnabled={cameraEnabled}
        originZ={originZ}
        onShatter={onShatter}
      />
      <Shards triggered={triggering} nebula={mirrorTex} />
      <DreamParticles texture={glow} />
      </group>
      {/* 后处理：Bloom 辉光 + Vignette 暗角，电影感（单世界模式由 World 统一提供） */}
      {standalone && (
        <EffectComposer>
          <Bloom
            intensity={0.95}
            luminanceThreshold={0.22}
            luminanceSmoothing={0.5}
            mipmapBlur
            radius={0.72}
          />
          {/* 暗角减弱：0.88 会把四周压成漆黑，吃掉留白层次 */}
          <Vignette eskil={false} offset={0.12} darkness={0.7} />
        </EffectComposer>
      )}
    </>
  );
}

/** 独立 Canvas 壳（单世界 WorldPage 已改用 GateScene；此壳留作独立复用） */
export function MirrorGate(props: MirrorGateProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <GateScene {...props} />
    </Canvas>
  );
}

export interface MirrorGateProps {
  /** 是否触发碎镜转场 */
  triggering: boolean;
  /** 转场完成回调 */
  onComplete: () => void;
  /** 分幕（kimi 式舞台）：0=远景幕，1=近景幕；默认 1 保持旧行为 */
  act?: 0 | 1;
  /** 独立页模式（默认）：自渲染背景/雾/后处理；单世界 World 统一管理时置 false */
  standalone?: boolean;
  /** 相机控制是否激活（单世界 corridor 阶段置 false，交给走廊 CameraRig） */
  cameraEnabled?: boolean;
  /** 场景整组可见性（单世界 corridor 阶段隐藏门场景） */
  visible?: boolean;
  /** 门的世界 z 原点：单世界把门立在走廊门槛前（场景组整体平移 + 相机数值偏移） */
  originZ?: number;
  /** 隐去镜湖环境（天幕/湖面/云堤/光池）——穿门瞬间起门内是真走廊，环境藏进白闪 */
  hideEnvirons?: boolean;
  /** 碎裂瞬间回调（白闪峰值附近），单世界切走廊显形/雾/环境 */
  onShatter?: () => void;
}
