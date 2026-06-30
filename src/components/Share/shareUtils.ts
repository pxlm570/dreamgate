// shareUtils — 梦境卡片分享工具函数（Task 6.3）
// 编码/解码 share data；构造分享链接；html-to-image 导出 PNG
// 分享链接包含梦境摘要 + 卡片配置（base64），无后端也能只读查看

import { toPng } from "html-to-image";
import type { Dream, AestheticPresetName, EmotionTone } from "@/lib/types";
import type { CardConfig } from "./types";

/** 分享链接携带的梦境摘要（紧凑键名省 URL 长度） */
export interface ShareDataSummary {
  /** 原文摘录 */
  r: string;
  /** 情绪：词/强度/基调 */
  e: { w: string; i: number; t: EmotionTone };
  /** 符号列表（取前 3） */
  s: { n: string; p: number }[];
  /** 创建时间戳 */
  d: number;
  /** 美学预设 */
  p: AestheticPresetName;
  /** 图像 URL（仅 seed 图，避免 Pollinations 长链 + CORS） */
  img: string;
  /** 卡片配置 */
  c: CardConfig;
}

/** 编码：dream + config → base64 字符串 */
export function encodeShareData(dream: Dream, config: CardConfig): string {
  const shareData: ShareDataSummary = {
    r: dream.rawText.slice(0, config.excerptLength),
    e: {
      w: dream.emotion.word,
      i: dream.emotion.intensity,
      t: dream.emotion.tone,
    },
    s: dream.artifact.symbols.slice(0, 3).map((s) => ({
      n: s.name,
      p: s.probability,
    })),
    d: dream.createdAt,
    p: dream.aestheticPreset,
    img: dream.artifact.imageSource === "seed" ? dream.artifact.imageUrl : "",
    c: config,
  };
  // encodeURIComponent 处理中文，btoa 转 base64
  return btoa(encodeURIComponent(JSON.stringify(shareData)));
}

/** 解码：base64 → { summary, config }，失败返回 null */
export function decodeShareData(encoded: string): {
  summary: ShareDataSummary;
  config: CardConfig;
} | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const data = JSON.parse(json) as ShareDataSummary;
    if (!data || !data.c) return null;
    return { summary: data, config: data.c };
  } catch {
    return null;
  }
}

/**
 * 构造分享链接：`/share/${dream.id}?d=${encoded}`
 * 注意：App.tsx 路由是 `/share/:id`，必须带 id 段；
 * 接收方若 IndexedDB 无此 dream，则用 ?d= 摘要兜底只读渲染。
 */
export function buildShareUrl(dream: Dream, config: CardConfig): string {
  const encoded = encodeShareData(dream, config);
  // encodeURIComponent 防止 base64 中的 + 被解析为空格
  return `${window.location.origin}/#/share/${dream.id}?d=${encodeURIComponent(
    encoded,
  )}`;
}

/** 从 URL ?d= 参数解析分享数据，无则 null */
export function readShareDataFromQuery(
  search: string,
): { summary: ShareDataSummary; config: CardConfig } | null {
  const params = new URLSearchParams(search);
  const d = params.get("d");
  if (!d) return null;
  return decodeShareData(d);
}

/** 把摘要还原成轻量虚拟 Dream（只读查看页用） */
export function summaryToDream(
  summary: ShareDataSummary,
  id: string = "shared",
): Dream {
  return {
    id,
    createdAt: summary.d,
    rawText: summary.r,
    emotion: {
      word: summary.e.w,
      intensity: summary.e.i,
      tone: summary.e.t,
    },
    aestheticPreset: summary.p,
    artifact: {
      imageUrl: summary.img,
      imageSource: summary.img ? "seed" : "ai",
      emotionAnalysis: "",
      symbols: summary.s.map((s) => ({
        name: s.n,
        probability: s.p,
        note: "",
      })),
      analysisSource: "rule",
    },
  };
}

/** 导出节点为 PNG dataUrl（pixelRatio: 2 → 1024×1536 竖图） */
export async function toPngExport(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    skipFonts: false,
  });
}
