// DreamDoor — 单扇梦境门 3D 组件
// 圆角矩形面板（图像纹理 / 纯色 fallback）+ 情绪色门框 + pointLight + hover 高亮 + drei Html 标签

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { Dream } from "@/lib/types";
import { getEmotionByWord } from "@/lib/emotions";

const DOOR_W = 2;
const DOOR_H = 3;

/** 纯色 fallback 面板（imageUrl 为空或加载失败时） */
function DoorPanelPlain({ color, label }: { color: string; label?: string }) {
  return (
    <mesh>
      <planeGeometry args={[DOOR_W, DOOR_H]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.18}
        roughness={0.6}
      />
      {label && (
        <Html position={[0, 0, 0.02]} center distanceFactor={6} pointerEvents="none">
          <span className="font-mono text-xs text-white/70 tracking-widest">
            {label}
          </span>
        </Html>
      )}
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

  if (!texture) return <DoorPanelPlain color={fallbackColor} label="生成中" />;
  return (
    <mesh>
      <planeGeometry args={[DOOR_W, DOOR_H]} />
      <meshStandardMaterial map={texture} toneMapped={false} roughness={0.55} />
    </mesh>
  );
}

export interface DreamDoorProps {
  dream: Dream;
  position: [number, number, number];
  /** 绕 Y 轴旋转，使门朝向走廊内侧 */
  rotationY?: number;
  onClick: (dream: Dream) => void;
}

export function DreamDoor({
  dream,
  position,
  rotationY = 0,
  onClick,
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

  // hover 时门微微放大 + 整体辉光强度跟随（每帧 lerp 平滑过渡）
  const glowRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const target = hovered ? 1.06 : 1;
    g.scale.x = THREE.MathUtils.lerp(g.scale.x, target, 0.15);
    g.scale.y = THREE.MathUtils.lerp(g.scale.y, target, 0.15);
    // 外层辉光 mesh 的 opacity 跟随 hover
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = hovered ? 0.35 : 0.08;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.12);
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

      {/* 门框 */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[DOOR_W + 0.28, DOOR_H + 0.28, 0.12]} />
        <meshStandardMaterial
          color="#08080f"
          metalness={0.75}
          roughness={0.3}
          emissive={emotionColor}
          emissiveIntensity={hovered ? 0.85 : 0.22}
        />
      </mesh>

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
          <DoorPanelPlain color={emotionColor} label="生成中" />
        )}
      </group>

      {/* 情绪氛围灯：hover 时更强、更远 */}
      <pointLight
        color={emotionColor}
        intensity={hovered ? 2.2 : 0.7}
        distance={hovered ? 9 : 6}
        position={[0, 0, 1.3]}
      />

      {/* 下方 HTML 标签：标题 + 情绪词，hover 时从模糊到清晰 */}
      <Html
        position={[0, -DOOR_H / 2 - 0.6, 0.4]}
        center
        distanceFactor={8}
        pointerEvents="none"
        zIndexRange={[10, 0]}
        style={{
          opacity: hovered ? 1 : 0.5,
          filter: hovered ? "blur(0px)" : "blur(2px)",
          transform: hovered ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 0.4s ease, filter 0.4s ease, transform 0.4s ease",
        }}
      >
        <div className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/55 px-3 py-1.5 backdrop-blur-md">
          <span className="whitespace-nowrap font-display text-sm text-white text-glow-soft">
            {title || "（无题）"}
          </span>
          <span
            className="flex items-center gap-1.5 font-mono text-[10px]"
            style={{ color: emotionColor }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: emotionColor,
                boxShadow: `0 0 8px ${emotionColor}`,
              }}
            />
            {dream.emotion.word}
          </span>
        </div>
      </Html>
    </group>
  );
}
