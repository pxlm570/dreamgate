// useOptionalTexture — 可选贴图加载（实体材质用）
// 加载成功返回 Texture；加载中/失败返回 null，调用方回退纯色材质——
// 纹理是「增强」而非「依赖」，缺图时场景依然成立（延续三层兜底哲学）。
import { useEffect, useState } from "react";
import * as THREE from "three";

export function useOptionalTexture(
  url: string,
  repeatX = 1,
  repeatY = 1,
): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        // 镜像平铺：AI 生成的纹理并非严格无缝，镜像可掩盖接缝
        t.wrapS = THREE.MirroredRepeatWrapping;
        t.wrapT = THREE.MirroredRepeatWrapping;
        t.repeat.set(repeatX, repeatY);
        t.anisotropy = 8;
        if (active) setTex(t);
        else t.dispose();
      },
      undefined,
      () => {
        if (active) setTex(null);
      },
    );
    return () => {
      active = false;
    };
  }, [url, repeatX, repeatY]);

  return tex;
}
