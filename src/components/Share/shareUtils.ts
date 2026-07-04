// shareUtils — 梦境卡片分享工具函数（Task 6.3）
// 编码/解码 share data；构造分享链接；html-to-image 导出 PNG
// 分享链接包含梦境摘要 + 卡片配置（base64），无后端也能只读查看

import { toPng } from "html-to-image";
import type { Dream, AestheticPresetName, EmotionTone } from "@/lib/types";
import { getSeedImage } from "@/lib/seedLibrary";
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
  /** 图像 URL（seed 路径或 Pollinations 公开 URL，让接收端也能看到藏品） */
  img: string;
  /** 卡片配置 */
  c: CardConfig;
}

/** base64 → URL-safe（去掉 +、/、= 这些会被 URL/IM 转义或截断的字符） */
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/** URL-safe → 标准 base64（补回 padding） */
function fromUrlSafe(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64;
}

/** UTF-8 字符串 → base64（按字节编码，比 encodeURIComponent+btoa 紧凑约 3×，显著缩短分享链接） */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
/** base64 → UTF-8 字符串 */
function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** 编码：dream + config → URL-safe base64 字符串 */
export function encodeShareData(dream: Dream, config: CardConfig): string {
  const shareData: ShareDataSummary = {
    // 摘录硬上限 80 字，控制链接长度，避免社交平台截断
    r: dream.rawText.slice(0, Math.min(config.excerptLength ?? 80, 80)),
    e: {
      w: dream.emotion.word,
      i: dream.emotion.intensity,
      t: dream.emotion.tone,
    },
    s: dream.artifact.symbols.slice(0, 2).map((s) => ({
      n: s.name,
      p: s.probability,
    })),
    d: dream.createdAt,
    p: dream.aestheticPreset,
    // 携带图片让接收端也能看到藏品：http(s) URL / 种子路径直接带；
    // data URL（gpt-image base64，动辄 2MB）绝不能进链接 → 退回同情绪种子氛围图
    img: dream.artifact.imageUrl?.startsWith("data:")
      ? getSeedImage(dream.aestheticPreset, dream.emotion.word)
      : (dream.artifact.imageUrl ?? ""),
    c: config,
  };
  // UTF-8 字节 → base64 → URL-safe：紧凑编码，避免双重百分号编码导致超长/解析失败
  return toUrlSafe(utf8ToBase64(JSON.stringify(shareData)));
}

/** 解码：base64 → { summary, config }，失败返回 null */
export function decodeShareData(encoded: string): {
  summary: ShareDataSummary;
  config: CardConfig;
} | null {
  try {
    const json = base64ToUtf8(fromUrlSafe(encoded));
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
  // URL-safe base64 自身即 URL 安全字符（- _），无需再 encodeURIComponent，避免双重编码超长
  return `${window.location.origin}/#/share/${dream.id}?d=${encoded}`;
}

/** 复制文本到剪贴板（clipboard API + execCommand 兜底），返回是否成功 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落到 execCommand 兜底 */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
      imageSource: summary.img.startsWith("/seeds/") ? "seed" : "ai",
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
