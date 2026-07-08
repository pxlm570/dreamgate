// useProcessedTexture — 需要 canvas 后处理的贴图加载 hooks
// ① usePunchedFrame：gpt-image 画框图中心抠透明窗（羽化），画作/镜面从窗中透出
// ② useKeyedSilhouette：白底黑剪影图 → 亮度转 alpha（白=透明），得到可入景的人影
// 均为「增强非依赖」：加载失败返回 null，调用方回退现有画法。

import { useEffect, useState } from "react";
import * as THREE from "three";

const cache = new Map<string, Promise<THREE.Texture | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function toTexture(c: HTMLCanvasElement): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/**
 * 抠透明窗（fx=左右边框占比，fyTop/fyBottom=上下边框占比，可不对称——立镜有冠饰），羽化 18px。
 * 传 fySpring（拱肩线占比，介于 fyTop 与 1-fyBottom 之间）时窗形为「圆拱门」：
 * 直边到拱肩，拱肩以上为半椭圆拱顶（apex=fyTop）。
 */
export function usePunchedFrame(
  url: string,
  fx: number,
  fyTop: number,
  fyBottom = fyTop,
  fySpring?: number,
): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const key = `punch:${url}:${fx}:${fyTop}:${fyBottom}:${fySpring ?? "rect"}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        loadImage(url)
          .then((img) => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            ctx.globalCompositeOperation = "destination-out";
            try {
              ctx.filter = "blur(18px)";
            } catch {
              /* 无 filter 支持则硬边 */
            }
            ctx.fillStyle = "#fff";
            if (fySpring !== undefined) {
              // 拱门窗：直边（底→拱肩）+ 半椭圆拱顶（拱肩→apex）。
              // canvas 坐标 y 向下，ellipse 从 π 顺时针到 0 经过 3π/2（正上方）
              const x0 = c.width * fx;
              const x1 = c.width * (1 - fx);
              const yB = c.height * (1 - fyBottom);
              const yS = c.height * fySpring;
              const yA = c.height * fyTop;
              ctx.beginPath();
              ctx.moveTo(x0, yB);
              ctx.lineTo(x0, yS);
              ctx.ellipse((x0 + x1) / 2, yS, (x1 - x0) / 2, yS - yA, 0, Math.PI, 0, false);
              ctx.lineTo(x1, yB);
              ctx.closePath();
              ctx.fill();
            } else {
              ctx.fillRect(
                c.width * fx,
                c.height * fyTop,
                c.width * (1 - fx * 2),
                c.height * (1 - fyTop - fyBottom),
              );
            }
            // 外围纯黑底转透明（亮度键控）：gpt-image 的黑背景在非纯黑场景前
            // 会显形成一块黑板；框体自身暗部仅极暗像素受轻微影响，视觉无损
            ctx.globalCompositeOperation = "source-over";
            const data = ctx.getImageData(0, 0, c.width, c.height);
            const px = data.data;
            for (let i = 0; i < px.length; i += 4) {
              const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
              if (lum < 16) {
                px[i + 3] = Math.min(px[i + 3], Math.max(0, Math.round(((lum - 4) / 12) * 255)));
              }
            }
            ctx.putImageData(data, 0, 0);
            return toTexture(c);
          })
          .catch(() => null),
      );
    }
    let active = true;
    cache.get(key)!.then((t) => {
      if (active) setTex(t);
    });
    return () => {
      active = false;
    };
  }, [url, fx, fyTop, fyBottom, fySpring]);
  return tex;
}

/** 白底黑剪影 → 亮度转 alpha（黑=不透明人影，白=透明），并整体染成暗色 */
export function useKeyedSilhouette(url: string, tint = "#0c0b14"): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const key = `key:${url}:${tint}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        loadImage(url)
          .then((img) => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, c.width, c.height);
            const px = data.data;
            const t = new THREE.Color(tint);
            const tr = Math.round(t.r * 255);
            const tg = Math.round(t.g * 255);
            const tb = Math.round(t.b * 255);
            for (let i = 0; i < px.length; i += 4) {
              const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
              px[i + 3] = 255 - lum; // 白→透明，黑→不透明
              px[i] = tr;
              px[i + 1] = tg;
              px[i + 2] = tb;
            }
            ctx.putImageData(data, 0, 0);
            return toTexture(c);
          })
          .catch(() => null),
      );
    }
    let active = true;
    cache.get(key)!.then((t) => {
      if (active) setTex(t);
    });
    return () => {
      active = false;
    };
  }, [url, tint]);
  return tex;
}
