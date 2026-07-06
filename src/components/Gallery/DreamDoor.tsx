// DreamDoor — 单扇梦境门 3D 组件
// 圆角矩形面板（图像纹理 / 纯色 fallback）+ 情绪色门框 + hover 高亮 + canvas 贴图标签
// 标签不用 drei Html：相机每帧移动会导致所有 Html 标签每帧改 DOM transform（布局抖动=卡顿），
// 改为一次性绘制的 canvas 贴图面片，零每帧成本。

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";

const DOOR_W = 2;
const DOOR_H = 3;

/** 把「标题 + 情绪」一次性画进 canvas 贴图（用页面已加载的中文字体） */
function makeLabelTexture(
  title: string,
  emotion: string,
  color: string,
): { tex: THREE.CanvasTexture; aspect: number } {
  const S = 2; // 超采样，保证文字清晰
  const padX = 26;
  const padY = 16;
  const gap = 10;
  const titleFont = '500 26px "ZCOOL XiaoWei", "Noto Serif SC", serif';
  const emoFont = '400 15px "JetBrains Mono", ui-monospace, monospace';
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = titleFont;
  const tw = ctx.measureText(title).width;
  ctx.font = emoFont;
  const ew = ctx.measureText(emotion).width + 16;
  const w = Math.ceil(Math.max(tw, ew, 120) + padX * 2);
  const h = Math.ceil(26 + gap + 16 + padY * 2);
  canvas.width = w * S;
  canvas.height = h * S;
  ctx.scale(S, S);
  // 半透明深色圆角底 + 细描边（与原 DOM 标签一致的观感）
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(6,6,16,0.68)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // 标题
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = titleFont;
  ctx.fillStyle = "rgba(240,238,248,0.96)";
  ctx.fillText(title, w / 2, padY);
  // 情绪：色点 + 词
  ctx.font = emoFont;
  ctx.fillStyle = color;
  const ey = padY + 26 + gap;
  ctx.beginPath();
  ctx.arc(w / 2 - ew / 2 + 4, ey + 8, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.fillText(emotion, w / 2 - ew / 2 + 14, ey);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { tex, aspect: w / h };
}

/**
 * 画面内阴影贴图（模块级单例）：四边向内的柔和暗渐变。
 * 叠在画作表面 = 画「嵌」在框里的进深感——直接贴图的"屏幕感"就来自缺这一层。
 */
let innerShadowTex: THREE.CanvasTexture | null = null;
function getInnerShadowTexture(): THREE.CanvasTexture {
  if (innerShadowTex) return innerShadowTex;
  const w = 256;
  const h = 384;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const d = 30;
  const edge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0.52)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  edge(0, 0, 0, d, 0, 0, w, d); // 上
  edge(0, h, 0, h - d, 0, h - d, w, d); // 下
  edge(0, 0, d, 0, 0, 0, d, h); // 左
  edge(w, 0, w - d, 0, w - d, 0, d, h); // 右
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  innerShadowTex = tex;
  return tex;
}

/** 纯色 fallback 面板（imageUrl 为空或加载失败时） */
function DoorPanelPlain({ color }: { color: string }) {
  return (
    <mesh>
      <planeGeometry args={[DOOR_W, DOOR_H]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.18}
        roughness={0.6}
      />
    </mesh>
  );
}

/** 图像纹理面板：手动加载，失败回退纯色，避免 Suspense 抛错 */
function DoorPanelTextured({
  imageUrl,
  fallbackColor,
}: {
  imageUrl: string;
  fallbackColor: string;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      imageUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        if (active) setTexture(tex);
      },
      undefined,
      () => {
        if (active) setTexture(null);
      },
    );
    return () => {
      active = false;
      setTexture(null);
    };
  }, [imageUrl]);

  if (!texture) return <DoorPanelPlain color={fallbackColor} />;
  return (
    <mesh>
      <planeGeometry args={[DOOR_W, DOOR_H]} />
      {/* emissiveMap 让梦境图自发光；强度压低到「被射灯照亮的油画」而非背光屏幕 */}
      {/* 走 ACES 电影调色（toneMapped 默认 true）：高光柔和滚降，画作更「胶片」 */}
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.45}
        roughness={0.62}
      />
    </mesh>
  );
}

export interface DreamDoorProps {
  dream: Dream;
  position: [number, number, number];
  /** 绕 Y 轴旋转，使门朝向走廊内侧 */
  rotationY?: number;
  onClick: (dream: Dream) => void;
  /** 聚焦模式下隐藏门下标签（信息由底部展签面板接管） */
  hideLabel?: boolean;
  /** 当前被聚焦（展签态）：射灯/光池增强 */
  highlight?: boolean;
  /** 径向柔光贴图（地面光池用），由场景传入避免重复生成 */
  glowTex?: THREE.Texture;
}

export function DreamDoor({
  dream,
  position,
  rotationY = 0,
  onClick,
  hideLabel = false,
  highlight = false,
  glowTex,
}: DreamDoorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const emotionColor =
    getEmotionByWord(dream.emotion.word)?.color ?? "#c9b8e8";
  const imageUrl = dream.artifact.imageUrl;
  const title =
    dream.rawText.length > 20
      ? dream.rawText.slice(0, 20) + "…"
      : dream.rawText;

  // 标签贴图：一次性绘制（标题/情绪/颜色变化时重绘）
  const label = useMemo(
    () => makeLabelTexture(title || "（无题）", dream.emotion.word, emotionColor),
    [title, dream.emotion.word, emotionColor],
  );

  // 逐画注目节奏（kimi 式分幕感延伸进走廊）：
  // 相机走近 → 该画获得 0~1「注目度」→ 射灯亮起/光池变亮/标签浮现；
  // 远处的画自动暗下——任何时刻只有身边的画被「点亮」，走廊有了呼吸的节奏。
  const lit = hovered || highlight;
  const glowRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Sprite>(null);
  const frameMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const poolMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const washMatRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    // 注目度：距离 2 以内满格，5.5 之外归零；hover/聚焦时恒为 1
    const dz = Math.abs(state.camera.position.z - position[2]);
    const near = THREE.MathUtils.clamp(1 - (dz - 2) / 3.5, 0, 1);
    const attention = Math.max(near * 0.85, lit ? 1 : 0);

    const target = 1 + attention * 0.02 + (lit ? 0.04 : 0);
    g.scale.x = THREE.MathUtils.damp(g.scale.x, target, 8, dt);
    g.scale.y = THREE.MathUtils.damp(g.scale.y, target, 8, dt);
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.05 + attention * 0.3, 6, dt);
    }
    if (labelRef.current) {
      const mat = labelRef.current.material as THREE.SpriteMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.18 + attention * 0.82, 6, dt);
    }
    if (frameMatRef.current) {
      frameMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        frameMatRef.current.emissiveIntensity, 0.05 + attention * 0.5, 6, dt);
    }
    if (poolMatRef.current) {
      poolMatRef.current.opacity = THREE.MathUtils.damp(
        poolMatRef.current.opacity, 0.12 + attention * 0.55, 6, dt);
    }
    if (washMatRef.current) {
      washMatRef.current.opacity = THREE.MathUtils.damp(
        washMatRef.current.opacity, 0.04 + attention * 0.14, 6, dt);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      {/* 外层辉光面板：hover 时扩散，Bloom 加持下出光晕 */}
      <mesh ref={glowRef} position={[0, 0, -0.1]}>
        <planeGeometry args={[DOOR_W + 0.9, DOOR_H + 0.9]} />
        <meshBasicMaterial
          color={emotionColor}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* —— 真实画廊装裱语言：深色外框 + 暖白卡纸 + 画作 ——
          「室内感」靠建筑/装裱线索（框、卡纸、射灯、洗墙光），不靠墙面贴图 */}
      {/* 外框：深色装裱框 */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[DOOR_W + 0.5, DOOR_H + 0.5, 0.06]} />
        <meshStandardMaterial
          ref={frameMatRef}
          color="#0b0b13"
          metalness={0.45}
          roughness={0.55}
          emissive={emotionColor}
          emissiveIntensity={0.06}
        />
      </mesh>
      {/* 卡纸（mat）：暖白内衬——画作被「装裱」而非悬浮 */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[DOOR_W + 0.26, DOOR_H + 0.26]} />
        <meshStandardMaterial
          color="#d9d4c8"
          roughness={0.92}
          metalness={0}
          emissive="#fffdf5"
          emissiveIntensity={lit ? 0.14 : 0.07}
        />
      </mesh>
      {/* 鎏金内衬（Belle Époque 装裱语言，对标《光与影 33》画框质感）：
          卡纸与画之间一圈窄金边，金属高反射在射灯下出微光 */}
      <mesh position={[0, 0, 0.0]}>
        <planeGeometry args={[DOOR_W + 0.1, DOOR_H + 0.1]} />
        <meshStandardMaterial
          color="#96793f"
          metalness={0.92}
          roughness={0.32}
          emissive="#5c4718"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* 射灯洗墙光：从画上方倾泻在墙上的暖白光斑（美术馆 track light 打在墙面） */}
      {glowTex && (
        <mesh position={[0, 1.1, -0.1]} scale={[3.6, 4.4, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={washMatRef}
            map={glowTex}
            color="#f3ead9"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* 射灯灯具：吊杆 + 灯筒 + 发光灯口（可见光源=室内感的最强线索） */}
      <group position={[0, DOOR_H / 2 + 1.0, 0.55]}>
        {/* 吊杆（接天花板） */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
          <meshStandardMaterial color="#15151f" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* 灯筒：斜指画面 */}
        <group rotation={[Math.PI / 5, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.075, 0.22, 12]} />
            <meshStandardMaterial color="#191924" metalness={0.75} roughness={0.35} />
          </mesh>
          {/* 灯口亮点（Bloom 出光晕） */}
          <mesh position={[0, -0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.05, 12]} />
            <meshBasicMaterial color="#fff3da" />
          </mesh>
        </group>
      </group>

      {/* 门面板：图像 / 纯色 */}
      <group
        position={[0, 0, 0.03]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(dream);
        }}
      >
        {imageUrl ? (
          <DoorPanelTextured
            imageUrl={imageUrl}
            fallbackColor={emotionColor}
          />
        ) : (
          <DoorPanelPlain color={emotionColor} />
        )}
        {/* 画面内阴影：画嵌进框里的进深（去掉"图片直接贴上去"的屏幕感） */}
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[DOOR_W, DOOR_H]} />
          <meshBasicMaterial
            map={getInnerShadowTexture()}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 注：不再每门挂 pointLight——20 扇门 = 20 个逐光源计费的光，是走廊卡顿主因。
          门面板 emissiveMap 自发光 + 光池 + Bloom 已足够呈现「射灯打亮」。 */}

      {/* 画前地面光池：博物馆射灯洒在地板上的光斑（配反射地板成空间锚点） */}
      {glowTex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.96, 1.0]} scale={[2.8, 1.8, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={poolMatRef}
            map={glowTex}
            color={emotionColor}
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 下方标签：canvas 贴图 sprite（一次绘制零每帧成本；sprite 始终面向相机） */}
      {!hideLabel && (
        <sprite
          ref={labelRef}
          position={[0, -DOOR_H / 2 - 0.55, 0.5]}
          scale={[1.5, 1.5 / label.aspect, 1]}
        >
          <spriteMaterial
            map={label.tex}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  );
}
