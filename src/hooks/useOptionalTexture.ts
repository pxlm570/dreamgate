// useOptionalTexture — 可选贴图加载（实体材质用）
// 加载成功返回 Texture；加载中/失败返回 null，调用方回退纯色材质——
// 纹理是「增强」而非「依赖」，缺图时场景依然成立（延续三层兜底哲学）。
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function useOptionalTexture(
  url: string,
  repeatX = 1,
  repeatY = 1,
): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  // 跟踪当前已加载纹理，供 deps 变化时释放上一张、卸载时释放当前张的 GPU 内存。
  // R3F 不自动 dispose 传给 material 的纹理（只 dispose material 本身与 geometry）。
  const loadedRef = useRef<THREE.Texture | null>(null);

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
        if (active) {
          // deps 变化时释放上一张已不再使用的纹理 GPU 内存（新纹理已 setTex 替换引用）
          const prev = loadedRef.current;
          loadedRef.current = t;
          setTex(t);
          if (prev && prev !== t) prev.dispose();
        } else {
          t.dispose();
        }
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

  // 卸载时释放当前纹理 GPU 内存（与 [url,...] effect 的 cleanup 协同：
  // 后者置 active=false 阻止在途回调写 state，本 effect 释放已加载的纹理）
  useEffect(() => {
    return () => {
      loadedRef.current?.dispose();
      loadedRef.current = null;
    };
  }, []);

  return tex;
}
