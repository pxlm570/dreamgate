/**
 * DreamGate 数据模型（spec 附录 A）
 * 使用 union 类型而非 enum，便于序列化与跨边界传递。
 */

/** 情绪基调 */
export type EmotionTone = 'positive' | 'neutral' | 'negative' | 'mixed';

/** 情绪维度（4 维，对应附录 B） */
export type EmotionDimension =
  | 'high-pleasant' // 高涨-愉悦
  | 'high-unpleasant' // 高涨-不悦
  | 'low-pleasant' // 低落-愉悦
  | 'low-unpleasant'; // 低落-不悦

/** 美学预设名（附录 D） */
export type AestheticPresetName = 'Ethereal' | 'Dark Fantasy' | 'Mystical' | 'Psychedelic';

/** 图像来源 */
export type ImageSource = 'ai' | 'seed' | 'upload';

/** 解析来源 */
export type AnalysisSource = 'ai' | 'rule';

/** 情绪对象（Dream 内嵌） */
export interface Emotion {
  /** 情绪词，映射附录 B 词库 */
  word: string;
  /** 强度 0-1 */
  intensity: number;
  /** 基调 */
  tone: EmotionTone;
}

/** 情绪词库条目（附录 B） */
export interface EmotionEntry {
  word: string;
  tone: EmotionTone;
  dimension: EmotionDimension;
  /** 代表色 hex，用于热力图与画廊氛围灯 */
  color: string;
  /** 关联词数组，用于规则关键词降级解析 */
  keywords: string[];
}

/** 符号条目（附录 C 符号库） */
export interface SymbolEntry {
  name: string;
  /** 触发关键词数组，用于规则匹配 */
  keywords: string[];
  /** 可能的解读数组（概率框架说明，非断言） */
  interpretations: { meaning: string; probability: string }[];
}

/** 梦境中识别到的符号（带概率） */
export interface DreamSymbol {
  name: string;
  /** 概率 0-1 */
  probability: number;
  /** 解读说明 */
  note: string;
}

/** 美学预设规范条目（附录 D） */
export interface AestheticPresetEntry {
  name: AestheticPresetName;
  /** prompt 关键词 */
  promptKeywords: string[];
  /** CSS filter 属性值 */
  cssFilter: string;
  /** 适配的情绪词数组 */
  emotionFit: string[];
}

/** 藏品（梦境生成结果） */
export interface Artifact {
  /** Pollinations URL 或 seed 库路径 */
  imageUrl: string;
  imageSource: ImageSource;
  /** AI / 规则 解析文本 */
  emotionAnalysis: string;
  /** 符号概率地图 */
  symbols: DreamSymbol[];
  analysisSource: AnalysisSource;
}

/** IndexedDB store: dreams */
export interface Dream {
  /** uuid */
  id: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 原文 */
  rawText: string;
  emotion: Emotion;
  /** 用户选色 hex */
  color?: string;
  tags?: string[];
  aestheticPreset: AestheticPresetName;
  artifact: Artifact;
  /** 是否已投递梦池 */
  shared?: boolean;
}

/** 连续记梦 streak */
export interface Streak {
  count: number;
  /** YYYY-MM-DD */
  lastDate: string;
}

/** IndexedDB store: meta（单条，key='meta'） */
export interface Meta {
  /** 锁定的美学预设 */
  aestheticPreset: string;
  /** AI 同意 */
  aiConsent: boolean;
  streak: Streak;
  /** 是否完成引导 */
  onboarded: boolean;
}

/** IndexedDB store: inspirations (P1) */
export interface Inspiration {
  dreamId: string;
  note?: string;
  addedAt: number;
}

/** 视图路由值（与 URL 路由协同） */
export type ViewRoute =
  | 'gate'
  | 'gallery'
  | 'record'
  | 'report'
  | 'pool'
  | 'share';

/** AI 解析返回结构（/api/llm 与 ai.ts 共用） */
export interface DreamAnalysis {
  emotionAnalysis: string;
  emotion: Emotion;
  symbols: DreamSymbol[];
}
