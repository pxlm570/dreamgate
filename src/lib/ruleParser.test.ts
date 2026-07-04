import { describe, it, expect } from "vitest";
import { parseEmotionByRules, parseSymbolsByRules } from "./ruleParser";

describe("parseEmotionByRules", () => {
  it("returns the default 出神/neutral for empty text", () => {
    const e = parseEmotionByRules("");
    expect(e.word).toBe("出神");
    expect(e.tone).toBe("neutral");
  });

  it("matches fear keywords and reports a negative tone", () => {
    const e = parseEmotionByRules("我感到很害怕，非常恐惧");
    expect(e.word).toBe("恐惧");
    expect(e.tone).toBe("negative");
  });

  it("keeps intensity within 0.3–0.8 and rises with more hits", () => {
    const one = parseEmotionByRules("有点担心");
    const many = parseEmotionByRules("焦虑 担心 不安 紧张 心慌");
    expect(one.intensity).toBeGreaterThanOrEqual(0.3);
    expect(many.intensity).toBeLessThanOrEqual(0.8);
    expect(many.intensity).toBeGreaterThanOrEqual(one.intensity);
  });

  it("falls back to default when no keyword matches", () => {
    const e = parseEmotionByRules("abcdefg 12345");
    expect(e.word).toBe("出神");
  });
});

describe("parseSymbolsByRules", () => {
  it("clamps every symbol probability into 0.4–0.7", () => {
    const syms = parseSymbolsByRules("梦里有很多水，我还在飞，然后从高处坠落");
    expect(syms.length).toBeGreaterThan(0);
    for (const s of syms) {
      expect(s.probability).toBeGreaterThanOrEqual(0.4);
      expect(s.probability).toBeLessThanOrEqual(0.7);
    }
  });

  it("returns an empty array for empty text", () => {
    expect(parseSymbolsByRules("")).toEqual([]);
  });
});
