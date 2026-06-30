// CardConfig — 梦境卡片分享配置（Task 6）

import type { AestheticPresetName } from "@/lib/types";

export type BorderStyle = "none" | "thin" | "double" | "glow";
export type FontFamilyKey = "display" | "body";

export interface CardConfig {
  /** 美学预设（背景氛围色调） */
  preset: AestheticPresetName;
  /** 边框样式 */
  borderStyle: BorderStyle;
  /** 字体族 */
  fontFamily: FontFamilyKey;
  /** 显示字段（rawText 默认关闭，隐私优先） */
  fields: { rawText: boolean; emotion: boolean; symbols: boolean; date: boolean };
  /** 原文摘录长度（50-200 字） */
  excerptLength: number;
}

/** 默认卡片配置：隐私优先，原文默认不显示 */
export const DEFAULT_CARD_CONFIG: CardConfig = {
  preset: "Ethereal",
  borderStyle: "glow",
  fontFamily: "display",
  fields: { rawText: false, emotion: true, symbols: true, date: true },
  excerptLength: 80,
};
