// 共享梦池（概念演示 · 本地）纯逻辑层
// 设计（spec 第四重壁垒·去社交化）：匿名投递 + 相似度关联，无点赞无排行。
// 初赛为纯前端演示：池数据内置（src/data/poolDreams.ts），本机投递仅存 localStorage；
// 复赛升级路线（方案 B）：EdgeOne KV 真匿名共享，见 docs/项目总览.md。
// 相似度复用附录 B/C 词库体系：共享符号为主、情绪基调为辅——与跨梦模式识别同源。

import type { Dream } from "./types";

/** 池中的匿名梦（无身份、无图像、无精确时间——匿名化的产物） */
export interface PoolDream {
  id: string;
  /** 梦境文本摘录 */
  text: string;
  /** 情绪词（附录 B 词库） */
  emotion: string;
  /** 符号名数组（附录 C 符号库） */
  symbols: string[];
  /** 相对时间文案（演示数据固定；本机投递为「刚刚」） */
  postedAgo: string;
  /** 是否本机投递 */
  mine?: boolean;
}

/** 一条池中梦与「我的梦」之间的最强共鸣 */
export interface Resonance {
  poolId: string;
  /** 共鸣到我的哪条梦 */
  dreamId: string;
  /** 共享的符号名 */
  sharedSymbols: string[];
  /** 情绪词相同 */
  sameEmotion: boolean;
  /** 共享符号 ×2 + 同情绪 ×1 */
  score: number;
}

/**
 * 计算池中每条梦与「我的梦」的最强共鸣。
 * 评分 = 共享符号数 ×2 + 同情绪词 ×1；0 分不收录；本机投递的不与自己共鸣。
 */
export function findResonances(mine: Dream[], pool: PoolDream[]): Map<string, Resonance> {
  const map = new Map<string, Resonance>();
  for (const p of pool) {
    if (p.mine) continue;
    let best: Resonance | null = null;
    for (const d of mine) {
      const mySymbols = new Set(d.artifact.symbols.map((s) => s.name));
      const shared = p.symbols.filter((s) => mySymbols.has(s));
      const same = !!d.emotion.word && d.emotion.word === p.emotion;
      const score = shared.length * 2 + (same ? 1 : 0);
      if (score > 0 && (!best || score > best.score)) {
        best = { poolId: p.id, dreamId: d.id, sharedSymbols: shared, sameEmotion: same, score };
      }
    }
    if (best) map.set(p.id, best);
  }
  return map;
}

/** 匿名化投递：只保留文本摘录 / 情绪词 / 符号名——不带 id、图像、精确时间 */
export function anonymizeDream(d: Dream): PoolDream {
  return {
    id: `local-${d.id}`,
    text: d.rawText.length > 80 ? `${d.rawText.slice(0, 80)}……` : d.rawText,
    emotion: d.emotion.word,
    symbols: d.artifact.symbols.map((s) => s.name).slice(0, 4),
    postedAgo: "刚刚",
    mine: true,
  };
}
