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
      {/* emissiveMap 让梦境图自发光，即使暗色种子图也能读出「发光藏品」质感 */}
      {/* 走 ACES 电影调色（toneMapped 默认 true）：高光柔和滚降，画作更「胶片」 */}
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.55}
        roughness={0.55}
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

  // hover / 聚焦 时门微微放大 + 辉光与标签透明度跟随（每帧 lerp 平滑过渡）
  const lit = hovered || highlight;
  const glowRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Sprite>(null);
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const target = lit ? 1.06 : 1;
    g.scale.x = THREE.MathUtils.lerp(g.scale.x, target, 0.15);
    g.scale.y = THREE.MathUtils.lerp(g.scale.y, target, 0.15);
    // 外层辉光 mesh 的 opacity 跟随点亮状态
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = lit ? 0.35 : 0.08;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.12);
    }
    if (labelRef.current) {
      const mat = labelRef.current.material as THREE.SpriteMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, lit ? 1 : 0.75, 0.12);
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
          color="#0b0b13"
          metalness={0.45}
          roughness={0.55}
          emissive={emotionColor}
          emissiveIntensity={lit ? 0.28 : 0.06}
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
      {/* 射灯洗墙光：从画上方倾泻在墙上的暖白光斑（美术馆 track light 打在墙面） */}
      {glowTex && (
        <mesh position={[0, 1.1, -0.1]} scale={[3.6, 4.4, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={glowTex}
            color="#efe8ff"
            transparent
            opacity={lit ? 0.17 : 0.1}
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
      </group>

      {/* 注：不再每门挂 pointLight——20 扇门 = 20 个逐光源计费的光，是走廊卡顿主因。
          门面板 emissiveMap 自发光 + 光池 + Bloom 已足够呈现「射灯打亮」。 */}

      {/* 画前地面光池：博物馆射灯洒在地板上的光斑（配反射地板成空间锚点） */}
      {glowTex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.96, 1.0]} scale={[2.8, 1.8, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={glowTex}
            color={emotionColor}
            transparent
            opacity={lit ? 0.7 : 0.36}
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
