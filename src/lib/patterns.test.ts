import { describe, it, expect } from "vitest";
import { analyzePatterns, normalizeSymbolName } from "./patterns";
import type { Dream, EmotionTone } from "./types";

function dream(
  id: string,
  symbols: string[],
  word: string,
  tone: EmotionTone,
  day: number,
): Dream {
  return {
    id,
    createdAt: day * 86_400_000,
    rawText: "",
    emotion: { word, intensity: 0.6, tone },
    aestheticPreset: "Ethereal",
    artifact: {
      imageUrl: "",
      imageSource: "seed",
      emotionAnalysis: "",
      symbols: symbols.map((n) => ({ name: n, probability: 0.8, note: "" })),
      analysisSource: "rule",
    },
  };
}

describe("analyzePatterns", () => {
  it("returns an empty report for no dreams", () => {
    const r = analyzePatterns([]);
    expect(r.totalDreams).toBe(0);
    expect(r.hasInsight).toBe(false);
    expect(r.symbolPatterns).toEqual([]);
    expect(r.contrasts).toEqual([]);
  });

  it("detects a recurring symbol with associated emotions and dominant tone", () => {
    const dreams = [
      dream("1", ["水", "门"], "焦虑", "negative", 0),
      dream("2", ["水"], "焦虑", "negative", 1),
      dream("3", ["水"], "无力", "negative", 3),
    ];
    const r = analyzePatterns(dreams);
    const water = r.symbolPatterns.find((p) => p.symbol === "水");
    expect(water).toBeTruthy();
    expect(water!.count).toBe(3);
    expect(water!.dominantTone).toBe("negative");
    const words = water!.emotions.map((e) => e.word);
    expect(words).toContain("焦虑");
    expect(words).toContain("无力");
    // 焦虑 出现 2 次，应排在关联情绪最前
    expect(water!.emotions[0].word).toBe("焦虑");
    expect(r.hasInsight).toBe(true);
  });

  it("excludes symbols that appear in only one dream", () => {
    const r = analyzePatterns([
      dream("1", ["水", "门"], "焦虑", "negative", 0),
      dream("2", ["水"], "焦虑", "negative", 1),
    ]);
    expect(r.symbolPatterns.find((p) => p.symbol === "门")).toBeUndefined();
    expect(r.symbolPatterns.find((p) => p.symbol === "水")).toBeTruthy();
  });

  it("detects the 飞行 ↔ 坠落 contrast tension", () => {
    const r = analyzePatterns([
      dream("1", ["飞行"], "欢欣", "positive", 0),
      dream("2", ["坠落"], "恐惧", "negative", 1),
    ]);
    const c = r.contrasts.find((x) => x.a === "飞行" && x.b === "坠落");
    expect(c).toBeTruthy();
    expect(c!.aEmotion).toBe("欢欣");
    expect(c!.bEmotion).toBe("恐惧");
    expect(r.hasInsight).toBe(true);
  });

  it("computes tone counts and negative ratio", () => {
    const r = analyzePatterns([
      dream("1", ["水"], "焦虑", "negative", 0),
      dream("2", ["水"], "焦虑", "negative", 1),
      dream("3", ["水"], "欢欣", "positive", 2),
    ]);
    expect(r.toneCount.negative).toBe(2);
    expect(r.toneCount.positive).toBe(1);
    expect(r.negativeRatio).toBeCloseTo(2 / 3);
  });
});

describe("normalizeSymbolName", () => {
  it("maps a free-form keyword to its canonical symbol", () => {
    expect(normalizeSymbolName("海")).toBe("水");
    expect(normalizeSymbolName("飞翔")).toBe("飞行");
  });
  it("leaves a canonical name unchanged", () => {
    expect(normalizeSymbolName("水")).toBe("水");
  });
  it("leaves an unknown token (no keyword substring) unchanged", () => {
    expect(normalizeSymbolName("彩虹糖果")).toBe("彩虹糖果");
    expect(normalizeSymbolName("qwerty")).toBe("qwerty");
  });
});
