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

/**
 * 美术馆式画作简介牌（用户定稿 07-09：门下小字看不清看不全 → 壁挂展牌）：
 * 米白卡纸底 + 深色文字，一次性画进 canvas 贴图（零每帧成本）。
 * 内容：N° 编号·日期 / 梦境简介（自动换行至多 3 行）/ 情绪 + 「入画」提示。
 */
function makePlacardTexture(
  no: string,
  date: string,
  text: string,
  emotion: string,
  color: string,
): { tex: THREE.CanvasTexture; aspect: number } {
  const S = 2; // 超采样，保证文字清晰
  const W = 360;
  const padX = 26;
  const padY = 22;
  const excerptFont = '500 27px "ZCOOL XiaoWei", "Noto Serif SC", serif';
  const monoFont = '400 14px "JetBrains Mono", ui-monospace, monospace';
  const lineH = 39;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  // 先测量换行（canvas 改尺寸会重置状态，测量在前）
  ctx.font = excerptFont;
  const maxW = W - padX * 2;
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      lines.push(line);
      line = ch;
      if (lines.length === 3) break;
    } else {
      line += ch;
    }
  }
  if (lines.length < 3 && line) lines.push(line);
  else if (lines.length === 3) lines[2] = lines[2].slice(0, -1) + "…";
  const H = padY + 16 + 14 + lines.length * lineH + 14 + 18 + padY;
  canvas.width = W * S;
  canvas.height = H * S;
  ctx.scale(S, S);
  // 卡纸底：米白微渐变 + 细边 + 底缘投影线（贴墙的纸卡质感）
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#efece4");
  g.addColorStop(1, "#e2ded4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(80,74,90,0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  // 顶行：N° 编号 · 日期
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = monoFont;
  ctx.fillStyle = "#6d6878";
  ctx.fillText(`N°${no} · ${date}`, padX, padY);
  // 简介行
  ctx.font = excerptFont;
  ctx.fillStyle = "#2b2834";
  lines.forEach((l, i) => {
    ctx.fillText(l, padX, padY + 16 + 14 + i * lineH);
  });
  // 底行：情绪色点 + 词（左）· 入画提示（右）
  const by = H - padY - 16;
  ctx.font = monoFont;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(padX + 4, by + 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText(emotion, padX + 14, by);
  ctx.textAlign = "right";
  ctx.fillStyle = "#8a8494";
  ctx.fillText("入画 →", W - padX, by);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return { tex, aspect: W / H };
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

/**
 * 雕花鎏金画框贴图（gpt-image 实物级金框，模块级缓存）：
 * 加载后在 canvas 里把内窗抠成透明（羽化边缘），叠在画作前=真实装裱。
 * 几何拼的金属条永远是"塑料条"——真framequality只能来自真图。
 */
let ornatePromise: Promise<THREE.Texture | null> | null = null;
function loadOrnateFrame(): Promise<THREE.Texture | null> {
  if (ornatePromise) return ornatePromise;
  ornatePromise = new Promise((resolve) => {
    const img = new Image();
    img.src = "/textures/frame-simple.png";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      // 内窗抠透明（羽化 18px）：简约框边窄，抠窗按实测边宽
      const inX = c.width * 0.135;
      const inY = c.height * 0.1;
      ctx.globalCompositeOperation = "destination-out";
      try {
        ctx.filter = "blur(18px)";
      } catch {
        /* 老浏览器无 filter：硬边窗口，可接受 */
      }
      ctx.fillStyle = "#fff";
      ctx.fillRect(inX, inY, c.width - inX * 2, c.height - inY * 2);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      resolve(t);
    };
    img.onerror = () => resolve(null);
  });
  return ornatePromise;
}

function useOrnateFrame(): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    loadOrnateFrame().then((t) => {
      if (active) setTex(t);
    });
    return () => {
      active = false;
    };
  }, []);
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
  /** 走廊内的序号（简介牌 N° 编号用，0 起） */
  index?: number;
  /** 当前被选中（入画俯冲中）：射灯/光池增强 */
  highlight?: boolean;
  /** 径向柔光贴图（地面光池用），由场景传入避免重复生成 */
  glowTex?: THREE.Texture;
}

export function DreamDoor({
  dream,
  position,
  rotationY = 0,
  onClick,
  index = 0,
  highlight = false,
  glowTex,
}: DreamDoorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const ornate = useOrnateFrame();
  const emotionColor =
    getEmotionByWord(dream.emotion.word)?.color ?? "#c9b8e8";
  const imageUrl = dream.artifact.imageUrl;

  // 简介牌贴图：一次性绘制（内容变化时重绘）
  const placard = useMemo(
    () =>
      makePlacardTexture(
        String(index + 1).padStart(2, "0"),
        new Date(dream.createdAt).toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        dream.rawText || "（无题）",
        dream.emotion.word,
        emotionColor,
      ),
    [index, dream.createdAt, dream.rawText, dream.emotion.word, emotionColor],
  );

  // 逐画注目节奏（kimi 式分幕感延伸进走廊）：
  // 相机走近 → 该画获得 0~1「注目度」→ 射灯亮起/光池变亮/标签浮现；
  // 远处的画自动暗下——任何时刻只有身边的画被「点亮」，走廊有了呼吸的节奏。
  const lit = hovered || highlight;
  const glowRef = useRef<THREE.Mesh>(null);
  const placardMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const poolMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const washMatRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    // 注目度：距离 2 以内满格，5.5 之外归零；hover/聚焦时恒为 1
    const dz = Math.abs(state.camera.position.z - position[2]);
    const near = THREE.MathUtils.clamp(1 - (dz - 2.8) / 4.2, 0, 1);
    const attention = Math.max(near * 0.85, lit ? 1 : 0);

    const target = 1 + attention * 0.02 + (lit ? 0.04 : 0);
    g.scale.x = THREE.MathUtils.damp(g.scale.x, target, 8, dt);
    g.scale.y = THREE.MathUtils.damp(g.scale.y, target, 8, dt);
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.05 + attention * 0.3, 6, dt);
    }
    if (placardMatRef.current) {
      placardMatRef.current.opacity = THREE.MathUtils.damp(
        placardMatRef.current.opacity, 0.32 + attention * 0.68, 6, dt);
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
      {/* 真实画框（gpt-image 实物级 · 简约深木+细金线，不抢画面）：
          内窗已抠透明，画作从窗中透出；plane 尺寸按窗占比反推 */}
      {ornate && (
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[DOOR_W / 0.73, DOOR_H / 0.8]} />
          <meshBasicMaterial map={ornate} transparent depthWrite={false} />
        </mesh>
      )}
      {/* 回退金框条（雕花图缺失时） */}
      <group position={[0, 0, 0.05]} visible={!ornate}>
        {[
          { pos: [0, DOOR_H / 2 + 0.11, 0] as const, size: [DOOR_W + 0.44, 0.22, 0.07] as const },
          { pos: [0, -(DOOR_H / 2 + 0.11), 0] as const, size: [DOOR_W + 0.44, 0.22, 0.07] as const },
          { pos: [-(DOOR_W / 2 + 0.11), 0, 0] as const, size: [0.22, DOOR_H, 0.07] as const },
          { pos: [DOOR_W / 2 + 0.11, 0, 0] as const, size: [0.22, DOOR_H, 0.07] as const },
        ].map((bar, i) => (
          <mesh key={i} position={[bar.pos[0], bar.pos[1], bar.pos[2]]}>
            <boxGeometry args={[bar.size[0], bar.size[1], bar.size[2]]} />
            <meshStandardMaterial
              color="#7d6330"
              metalness={0.45}
              roughness={0.55}
              emissive="#4f3d15"
              emissiveIntensity={0.35}
            />
          </mesh>
        ))}
      </group>
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
            color="#e9e2d2"
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 画作简介牌：壁挂米白卡纸（真美术馆语言），统一挂在画作的「入口来向」
          一侧并微微转向观众（斜挂导览牌）——驻足视角下正对可读；
          与画作同为入口——点简介或点画都直接入画进详情。
          注意方位：局部 +x 经墙面旋转后，左墙指走廊深处、右墙指入口，
          故按 rotationY 取反保证两侧牌都朝来向。 */}
      <mesh
        position={[
          (rotationY > 0 ? -1 : 1) * (DOOR_W / 2 + 0.32 + 0.575),
          -0.58,
          0.06,
        ]}
        rotation={[0, (rotationY > 0 ? -1 : 1) * 0.5, 0]}
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
        <planeGeometry args={[1.35, 1.35 / placard.aspect]} />
        <meshBasicMaterial
          ref={placardMatRef}
          map={placard.tex}
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
