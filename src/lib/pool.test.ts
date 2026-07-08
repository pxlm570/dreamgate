// 共享梦池纯逻辑单测：共鸣评分 / 排除自投 / 匿名化
import { describe, it, expect } from "vitest";
import { findResonances, anonymizeDream, type PoolDream } from "./pool";
import type { Dream } from "./types";

function makeDream(overrides: Partial<Dream> & { id: string }): Dream {
  return {
    createdAt: Date.now(),
    rawText: "我梦见水漫过台阶",
    emotion: { word: "宁静", intensity: 0.6, tone: "positive" as Dream["emotion"]["tone"] },
    aestheticPreset: "ethereal" as Dream["aestheticPreset"],
    artifact: {
      imageUrl: "/seeds/ethereal-ethereal.svg",
      imageSource: "seed" as Dream["artifact"]["imageSource"],
      emotionAnalysis: "",
      symbols: [
        { name: "水", probability: 0.8, note: "" },
        { name: "高处", probability: 0.5, note: "" },
      ],
      analysisSource: "rule" as Dream["artifact"]["analysisSource"],
    },
    ...overrides,
  };
}

const pool: PoolDream[] = [
  { id: "p1", text: "水", emotion: "宁静", symbols: ["水", "高处"], postedAgo: "3 天前" },
  { id: "p2", text: "飞", emotion: "欢欣", symbols: ["飞行"], postedAgo: "1 天前" },
  { id: "p3", text: "门", emotion: "宁静", symbols: ["门"], postedAgo: "2 天前" },
  { id: "p4", text: "我投的", emotion: "宁静", symbols: ["水"], postedAgo: "刚刚", mine: true },
];

describe("findResonances", () => {
  it("共享符号 ×2 + 同情绪 ×1，取最强共鸣", () => {
    const mine = [makeDream({ id: "d1" })];
    const res = findResonances(mine, pool);
    const r1 = res.get("p1")!;
    expect(r1.sharedSymbols).toEqual(["水", "高处"]);
    expect(r1.sameEmotion).toBe(true);
    expect(r1.score).toBe(5); // 2 符号 ×2 + 同情绪 1
  });

  it("零分（无共享符号且情绪不同）不收录", () => {
    const mine = [makeDream({ id: "d1" })];
    const res = findResonances(mine, pool);
    expect(res.has("p2")).toBe(false);
  });

  it("仅同情绪也算弱共鸣（score=1）", () => {
    const mine = [makeDream({ id: "d1" })];
    const res = findResonances(mine, pool);
    expect(res.get("p3")?.score).toBe(1);
    expect(res.get("p3")?.sharedSymbols).toEqual([]);
  });

  it("本机投递的池梦不与自己共鸣", () => {
    const mine = [makeDream({ id: "d1" })];
    const res = findResonances(mine, pool);
    expect(res.has("p4")).toBe(false);
  });

  it("多条我的梦取评分最高的一条", () => {
    const strong = makeDream({ id: "d2" });
    const weak = makeDream({
      id: "d3",
      emotion: { word: "宁静", intensity: 0.5, tone: "positive" as Dream["emotion"]["tone"] },
    });
    weak.artifact = { ...weak.artifact, symbols: [] };
    const res = findResonances([weak, strong], pool);
    expect(res.get("p1")?.dreamId).toBe("d2");
  });
});

describe("anonymizeDream", () => {
  it("只保留摘录/情绪/符号名，长文截断，标记 mine", () => {
    const d = makeDream({ id: "d9", rawText: "很".repeat(100) });
    const p = anonymizeDream(d);
    expect(p.id).toBe("local-d9");
    expect(p.text.length).toBeLessThanOrEqual(82);
    expect(p.text.endsWith("……")).toBe(true);
    expect(p.symbols).toEqual(["水", "高处"]);
    expect(p.emotion).toBe("宁静");
    expect(p.mine).toBe(true);
    expect(p.postedAgo).toBe("刚刚");
  });

  it("短文不截断", () => {
    const d = makeDream({ id: "d10" });
    expect(anonymizeDream(d).text).toBe("我梦见水漫过台阶");
  });
});
