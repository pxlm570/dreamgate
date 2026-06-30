/**
 * 规则关键词降级解析（离线保底用）
 * 当大模型解析不可用时，基于情绪词库与符号库做关键词匹配。
 */
import type { DreamSymbol, Emotion, EmotionTone } from './types';
import { EMOTIONS, DEFAULT_EMOTION } from './emotions';
import { matchSymbols } from './symbols';

/** 强度归一化区间 */
const INTENSITY_MIN = 0.3;
const INTENSITY_MAX = 0.8;

/**
 * 基于情绪词库的关键词在文本中匹配，返回 { word, intensity, tone }。
 * 扫描 EMOTIONS 中每个情绪的关联词，统计匹配数，取最高匹配的情绪，
 * 强度按匹配数归一化到 0.3-0.8。无匹配时返回默认 {出神, 0.4, neutral}。
 */
export function parseEmotionByRules(text: string): Emotion {
  if (!text || !text.trim()) {
    return { ...DEFAULT_EMOTION };
  }

  let bestWord = '';
  let bestHits = 0;
  let bestTone: EmotionTone = 'neutral';

  for (const entry of EMOTIONS) {
    let hits = 0;
    for (const kw of entry.keywords) {
      if (text.includes(kw)) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestWord = entry.word;
      bestTone = entry.tone;
    }
  }

  if (bestHits === 0) {
    return { ...DEFAULT_EMOTION };
  }

  // 命中数越多强度越高，归一化到 0.3-0.8
  // 1 命中 -> 0.3，每多 1 命中 +0.1，封顶 0.8
  const intensity = Math.min(
    INTENSITY_MAX,
    INTENSITY_MIN + (bestHits - 1) * 0.1,
  );

  return { word: bestWord, intensity, tone: bestTone };
}

/**
 * 调用 symbols.ts 的 matchSymbols，返回 symbols 数组。
 * probability 基于匹配强度估算 0.4-0.7。
 */
export function parseSymbolsByRules(text: string): DreamSymbol[] {
  const matched = matchSymbols(text);
  // matchSymbols 已给出概率（0.5-0.7），这里再压低到 0.4 起以体现"概率"语义
  return matched.map((s) => ({
    name: s.name,
    probability: Math.max(0.4, Math.min(0.7, s.probability)),
    note: s.note,
  }));
}

/**
 * 拼装一段中文解析文本。
 * 说明这是基于关键词的初步解析，建议联网获取 AI 深度解析。
 */
export function generateRuleAnalysis(
  text: string,
  emotion: Emotion,
  symbols: DreamSymbol[],
): string {
  const symbolPart =
    symbols.length > 0
      ? symbols
          .map(
            (s) =>
              `「${s.name}」（可能性约 ${Math.round(s.probability * 100)}%）：${s.note}`,
          )
          .join('；')
      : '未识别到明显符号';

  const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;

  return [
    '【离线规则解析 · 初步结果】',
    `梦境片段：「${preview}」`,
    `主导情绪：${emotion.word}（强度 ${emotion.intensity.toFixed(2)}，基调 ${emotion.tone}）`,
    `符号概率地图：${symbolPart}。`,
    '以上为基于关键词的初步解析，仅为可能性而非断言，需结合自身语境理解。',
    '建议联网后获取 AI 深度解析以获得更细致的洞察。',
    '本解析仅供娱乐与自省，非医疗诊断。',
  ].join('\n');
}
