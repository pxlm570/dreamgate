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
import { usePunchedFrame } from "@/hooks/useProcessedTexture";

// 基调从近黑提到深紫灰：留白要有层次的「空」，不是漆黑（noomo 的暗都是有色温的）
const FOG_COLOR = "#0d0c19";
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
}: {
  triggering: boolean;
  onComplete: () => void;
  nebula: THREE.Texture;
  act: 0 | 1;
}) {
  const mirrorRef = useRef<THREE.Mesh>(null);
  const portalRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lookYRef = useRef(0);
  const { camera } = useThree();
  // 镜面用独立克隆贴图：呼吸动画改 offset/repeat，不能影响画界与碎片共享的原图
  const mirrorMap = useMemo(() => {
    const t = nebula.clone();
    t.needsUpdate = true;
    return t;
  }, [nebula]);

  // idle 阶段：视差全部交给相机环绕漂移；镜面不再自转
  // （镜面倾斜会与固定镜框/发光缘产生相对错动，正是「黑色部分随鼠标变形」的来源）
  useFrame((state) => {
    if (!groupRef.current) return;
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
      const baseZ = act === 0 ? 9.6 : 5.7;
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
      camera.lookAt(0, lookYRef.current, 0);
    }
  });

  useEffect(() => {
    if (!triggering) return;
    const tl = gsap.timeline();
    // 严格顺序三拍（拍与拍零重叠——重叠正是「上一个动画没播完
    // 下一个已开始」的粗糙感来源）：
    //   第1拍 0~0.95s    碎裂完整谢幕：镜面缩没、碎片飞散并全部淡尽、白闪结束
    //   第2拍 0.95~2.25s 显影+吞没：画界浮现并自框中生长满屏，相机轻推
    //   第3拍 2.25~2.6s  静止帧：满屏画面完全静止，路由切换的冻结藏在这里
    if (mirrorRef.current) {
      // 瞬时隐去：碎片与镜面同位同图，接管是无缝的——
      // 「镜面缩小消失」动画本身就是"上一个画面没结束"的观感来源
      tl.set(mirrorRef.current, { visible: false }, 0.06);
    }
    if (portalRef.current) {
      const pm = portalRef.current.material as THREE.MeshBasicMaterial;
      pm.opacity = 0;
      tl.to(pm, { opacity: 1, duration: 0.45, ease: "power2.out" }, 0.95);
      tl.to(
        portalRef.current.scale,
        { x: 3.2, y: 3.2, duration: 1.3, ease: "power2.inOut" },
        0.95,
      );
    }
    tl.to(
      camera.position,
      { z: 4.3, duration: 1.3, ease: "power1.inOut", delay: 0.95 },
      0,
    );
    tl.call(onComplete, [], 2.6);
    return () => {
      tl.kill();
    };
  }, [triggering, camera, onComplete]);

  return (
    <group ref={groupRef}>
      {/* 镜面 = 望进梦境的星云传送门（黑镜的黑色四边形随视差歪斜会显得别扭） */}
      <mesh ref={mirrorRef} position={[0, 0, 0]}>
        <planeGeometry args={[2.4, 3.3]} />
        <meshBasicMaterial map={mirrorMap} />
      </mesh>
      {/* 「画界」：碎镜后在镜框原位显影的梦境图（与镜面同尺寸同位置），
          随后自框中向观者生长直至吞没画面——画框始终被画覆盖，无分离穿帮。
          fog=false 保画面鲜活。
          注意：不用 visible=false 隐藏——opacity=0 保持渲染管线常驻，
          纹理/着色器在挂载时就上传编译好；否则触发瞬间首次上传 GPU 必掉帧 */}
      <mesh ref={portalRef} position={[0, 0, 0.12]}>
        <planeGeometry args={[2.4, 3.3]} />
        <meshBasicMaterial map={nebula} transparent opacity={0} fog={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function MirrorGate({ triggering, onComplete, act = 1 }: MirrorGateProps) {
  const glow = useMemo(makeGlowTexture, []);
  const nebula = useMemo(makeNebulaTexture, []);
  const backdropCanvas = useMemo(makeBackdropTexture, []);
  // 定稿A「镜湖」素材（全部缺图回退现有画法）
  // 优雅立镜（做旧暗铜+紫边缘光）：浏览器逐像素实测开口
  // x 0.264 / 上 0.204（山墙顶）/ 下 0.160，抠窗略缩留框唇
  const mirrorFrameTex = usePunchedFrame("/textures/mirror-frame.png", 0.267, 0.207, 0.163);
  const cloudTex = useOptionalTexture("/textures/cloud-bank.png");
  // 天幕真图：gpt-image matte painting（程序化色晕画不出空气感），缺图回退 canvas 版
  const backdropImg = useOptionalTexture("/textures/gate-backdrop.png");
  const backdrop = backdropImg ?? backdropCanvas;
  // 镜中真画：gpt-image 生成的「门中梦境世界」（有作者的内容才是视觉主角）；
  // 未加载/缺图时回退程序星云，碎镜与镜面同源（碎的就是这幅画）
  const dreamTex = useOptionalTexture("/textures/mirror-dream.png");
  const mirrorTex = dreamTex ?? nebula;
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
      <ambientLight intensity={0.5} />
      <hemisphereLight color={ACCENT} groundColor={FOG_COLOR} intensity={0.38} />
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
      {mirrorFrameTex ? (
        <group position={[0, 0, -0.06]}>
          {/* 优雅立镜框：窗=2×3 对齐镜心（窗心比图心低 0.022 → 面片上移补偿）；
              镜面 2.4×3.3 超填于后，框带世界宽 ~0.5 全覆盖，杜绝露缝。
              z=0.1（组内）→ 世界 0.04：必须在镜面(0)之前，框带才能压住超填镜缘；
              画界在 0.12 更前，吞没时盖框 ✓ */}
          <mesh position={[0, 0.1, 0.1]}>
            <planeGeometry args={[2 / 0.472, 3 / 0.636]} />
            <meshBasicMaterial map={mirrorFrameTex} transparent depthWrite={false} />
          </mesh>
          {/* 辉光压暗：镜面隐去后这两层不能裸露成一块淡紫平板 */}
          <GlowPlane texture={glow} position={[0, 0, -0.02]} scale={[3.4, 4.4]} color={ACCENT_3} opacity={0.12} />
          <GlowPlane texture={glow} position={[0, 0, -0.04]} scale={[5.2, 6.2]} color={ACCENT} opacity={0.06} />
        </group>
      ) : (
        <MirrorFrame glow={glow} />
      )}
      {/* 定稿A：两侧云堤（加色混合黑底消隐；fog=false 保云的银边） */}
      {cloudTex && (
        <>
          <mesh position={[-8.2, -1.0, -8]} rotation={[0, 0.55, 0]} scale={[15, 10, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={cloudTex} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
          <mesh position={[8.2, -0.7, -8.5]} rotation={[0, -0.55, 0]} scale={[-15, 10, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={cloudTex} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
        </>
      )}

      <MirrorAndCamera triggering={triggering} onComplete={onComplete} nebula={mirrorTex} act={act} />
      <Shards triggered={triggering} nebula={mirrorTex} />
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
        {/* 暗角减弱：0.88 会把四周压成漆黑，吃掉留白层次 */}
        <Vignette eskil={false} offset={0.12} darkness={0.7} />
      </EffectComposer>
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
}
