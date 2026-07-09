/**
 * 跨梦模式识别引擎（纯逻辑，无 React 依赖）
 *
 * 这是 DreamGate 区别于通用大模型「单次解析」的核心能力：
 * 从用户「全部」梦境里提炼纵向模式——重复符号 + 关联情绪 + 对比张力 + 基调趋势，
 * 回答「过去 N 天，你梦到 X 共 M 次，常伴随 Y 情绪」这类单次对话给不出的洞察。
 *
 * 设计原则：
 * - 不读取硬编码的演示模式表，而是从真实 Dream 数据现算，对真实用户同样生效
 *   （种子演示数据也不例外——种子的跨梦模式同样由本引擎现算得出）。
 * - 解读以「可能性」呈现而非断言，延续 spec 的概率地图与免责立场。
 */
import type { Dream, EmotionTone } from './types';
import { getEmotionByWord } from './emotions';
import { SYMBOLS, getSymbolByName } from './symbols';

const DAY = 86_400_000;

/** 关联情绪计数 */
export interface EmotionTally {
  word: string;
  count: number;
  tone: EmotionTone;
  /** 情绪代表色 hex */
  color: string;
}

/** 单个重复符号构成的跨梦模式 */
export interface SymbolPattern {
  /** 规范化后的符号名 */
  symbol: string;
  /** 出现的梦境数（每个梦最多计一次） */
  count: number;
  /** 命中的梦境 id */
  dreamIds: string[];
  /** 关联情绪，按出现次数降序 */
  emotions: EmotionTally[];
  /** 主导基调 */
  dominantTone: EmotionTone;
  /** 主导基调代表色（取关联情绪里出现最多者的颜色） */
  accent: string;
  /** 这些梦境跨越的天数 */
  spanDays: number;
  /** 符号库解读（若命中标准符号） */
  interpretation?: string;
  /** 生成的一句洞察 */
  insight: string;
}

/** 对比张力组（同一主题、情绪相反） */
export interface ContrastPair {
  a: string;
  b: string;
  aEmotion?: string;
  bEmotion?: string;
  aColor: string;
  bColor: string;
  note: string;
}

/** 整份跨梦报告 */
export interface PatternReport {
  totalDreams: number;
  /** 记录跨度天数（首末梦境之间） */
  spanDays: number;
  /** 重复符号模式（count >= 2），按 count 降序 */
  symbolPatterns: SymbolPattern[];
  /** 对比张力组 */
  contrasts: ContrastPair[];
  /** 基调计数 */
  toneCount: { positive: number; negative: number; neutral: number; mixed: number };
  /** 负面基调占比 0-1 */
  negativeRatio: number;
  /** 是否已有足够数据形成洞察 */
  hasInsight: boolean;
}

/** 同主题、情绪相反的对比组（用于揭示心理张力） */
const OPPOSITES: { a: string; b: string; note: string }[] = [
  {
    a: '飞行',
    b: '坠落',
    note: '上升与坠落同时出现——对自由的渴望，与对失控的恐惧，构成一组心理两极。',
  },
  {
    a: '光',
    b: '暗',
    note: '光与暗交替浮现——希望与未知在潜意识里彼此拉扯。',
  },
  {
    a: '门',
    b: '迷路',
    note: '机遇之门与迷失方向并存——你或许正站在某个抉择的路口。',
  },
];

/**
 * 把自由形态的符号名规范化到符号库标准名。
 * 规则：先精确匹配 name；否则若 raw 含某标准符号的关键词，归入该标准符号；都不中则原样返回。
 */
export function normalizeSymbolName(raw: string): string {
  if (!raw) return raw;
  if (getSymbolByName(raw)) return raw;
  for (const sym of SYMBOLS) {
    for (const kw of sym.keywords) {
      if (raw.includes(kw)) return sym.name;
    }
  }
  return raw;
}

/**
 * 收集单个梦的符号名集合（去重并规范化）。
 * artifact.symbols 为主要信号；tags 仅在能映射到「标准符号」时纳入，避免引入噪声。
 */
function dreamSymbolNames(dream: Dream): string[] {
  const set = new Set<string>();
  for (const s of dream.artifact?.symbols ?? []) {
    if (s?.name) set.add(normalizeSymbolName(s.name));
  }
  for (const t of dream.tags ?? []) {
    const n = normalizeSymbolName(t);
    if (getSymbolByName(n)) set.add(n);
  }
  return [...set];
}

/** 生成一句符合「概率而非断言」立场的洞察文案 */
function buildInsight(
  symbol: string,
  count: number,
  spanDays: number,
  topEmotion: string | undefined,
  interpretation: string | undefined,
): string {
  const lead = `过去 ${spanDays} 天里，「${symbol}」在 ${count} 场梦中反复浮现`;
  const emo = topEmotion ? `，常与「${topEmotion}」相伴` : '';
  const interp = interpretation ? `。${interpretation}` : '';
  return `${lead}${emo}${interp}。反复出现的意象往往值得留意——以上为可能性而非断言，请结合你自身的语境理解。`;
}

interface SymbolAgg {
  dreamIds: Set<string>;
  emotions: Map<string, number>;
  tones: Map<EmotionTone, number>;
  times: number[];
}

/** 主分析入口：从全部梦境计算跨梦模式报告 */
export function analyzePatterns(dreams: Dream[]): PatternReport {
  const totalDreams = dreams.length;
  const empty: PatternReport = {
    totalDreams,
    spanDays: 0,
    symbolPatterns: [],
    contrasts: [],
    toneCount: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
    negativeRatio: 0,
    hasInsight: false,
  };
  if (totalDreams === 0) return empty;

  const times = dreams.map((d) => d.createdAt);
  const spanDays = Math.max(1, Math.ceil((Math.max(...times) - Math.min(...times)) / DAY));

  // —— 基调计数 ——
  const toneCount = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  for (const d of dreams) {
    const t = (d.emotion?.tone ?? 'neutral') as EmotionTone;
    toneCount[t] += 1;
  }
  const negativeRatio = toneCount.negative / totalDreams;

  // —— 符号聚合 ——
  const map = new Map<string, SymbolAgg>();
  for (const d of dreams) {
    const names = dreamSymbolNames(d);
    const word = d.emotion?.word ?? '';
    const tone = (d.emotion?.tone ?? 'neutral') as EmotionTone;
    for (const name of names) {
      let agg = map.get(name);
      if (!agg) {
        agg = { dreamIds: new Set(), emotions: new Map(), tones: new Map(), times: [] };
        map.set(name, agg);
      }
      if (!agg.dreamIds.has(d.id)) {
        agg.dreamIds.add(d.id);
        agg.times.push(d.createdAt);
        if (word) agg.emotions.set(word, (agg.emotions.get(word) ?? 0) + 1);
        agg.tones.set(tone, (agg.tones.get(tone) ?? 0) + 1);
      }
    }
  }

  // —— 构建重复符号模式（count >= 2）——
  const symbolPatterns: SymbolPattern[] = [];
  for (const [symbol, agg] of map) {
    const count = agg.dreamIds.size;
    if (count < 2) continue;

    const emotions: EmotionTally[] = [...agg.emotions.entries()]
      .map(([w, c]) => {
        const e = getEmotionByWord(w);
        return { word: w, count: c, tone: (e?.tone ?? 'neutral') as EmotionTone, color: e?.color ?? '#c9b8e8' };
      })
      .sort((a, b) => b.count - a.count);

    const dominantTone =
      ([...agg.tones.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral') as EmotionTone;
    const accent = emotions[0]?.color ?? '#c9b8e8';
    const sSpan = Math.max(1, Math.ceil((Math.max(...agg.times) - Math.min(...agg.times)) / DAY));
    const interpretation = getSymbolByName(symbol)?.interpretations?.[0]?.meaning;
    const insight = buildInsight(symbol, count, sSpan, emotions[0]?.word, interpretation);

    symbolPatterns.push({
      symbol,
      count,
      dreamIds: [...agg.dreamIds],
      emotions,
      dominantTone,
      accent,
      spanDays: sSpan,
      interpretation,
      insight,
    });
  }
  symbolPatterns.sort((a, b) => b.count - a.count || b.emotions.length - a.emotions.length);

  // —— 对比张力组 ——
  const topEmotionOf = (s: string): string | undefined => {
    const a = map.get(s);
    if (!a) return undefined;
    return [...a.emotions.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  };
  const colorOfEmotion = (w: string | undefined): string =>
    (w ? getEmotionByWord(w)?.color : undefined) ?? '#c9b8e8';

  const contrasts: ContrastPair[] = [];
  for (const o of OPPOSITES) {
    if (map.has(o.a) && map.has(o.b)) {
      const aEmotion = topEmotionOf(o.a);
      const bEmotion = topEmotionOf(o.b);
      contrasts.push({
        a: o.a,
        b: o.b,
        aEmotion,
        bEmotion,
        aColor: colorOfEmotion(aEmotion),
        bColor: colorOfEmotion(bEmotion),
        note: o.note,
      });
    }
  }

  const hasInsight = symbolPatterns.length > 0 || contrasts.length > 0;
  return { totalDreams, spanDays, symbolPatterns, contrasts, toneCount, negativeRatio, hasInsight };
}
