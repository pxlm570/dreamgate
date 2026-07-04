import { describe, it, expect } from "vitest";
import {
  encodeShareData,
  decodeShareData,
  buildShareUrl,
  summaryToDream,
} from "./shareUtils";
import { DEFAULT_CARD_CONFIG } from "./types";
import type { Dream } from "@/lib/types";

const seedDream: Dream = {
  id: "d1",
  createdAt: 1_782_600_000_000,
  rawText: "我站在深海边，海水墨蓝，缓缓上涨，脚下的沙被冲走，想后退却无法移动。",
  emotion: { word: "焦虑", intensity: 0.75, tone: "negative" },
  aestheticPreset: "Dark Fantasy",
  artifact: {
    imageUrl: "/seeds/dark-fantasy-anxious.svg",
    imageSource: "seed",
    emotionAnalysis: "",
    symbols: [
      { name: "水", probability: 0.92, note: "" },
      { name: "灯塔", probability: 0.78, note: "" },
      { name: "无法移动", probability: 0.85, note: "" },
    ],
    analysisSource: "ai",
  },
};

describe("shareUtils encode/decode", () => {
  it("roundtrips Chinese content losslessly", () => {
    const enc = encodeShareData(seedDream, DEFAULT_CARD_CONFIG);
    const decoded = decodeShareData(enc);
    expect(decoded).not.toBeNull();
    expect(decoded!.summary.r).toContain("深海边");
    expect(decoded!.summary.e.w).toBe("焦虑");
    expect(decoded!.summary.p).toBe("Dark Fantasy");
  });

  it("produces URL-safe base64 (no + / =)", () => {
    const enc = encodeShareData(seedDream, DEFAULT_CARD_CONFIG);
    expect(enc).not.toMatch(/[+/=]/);
  });

  it("caps symbols to 2 to keep the link short", () => {
    const enc = encodeShareData(seedDream, DEFAULT_CARD_CONFIG);
    expect(decodeShareData(enc)!.summary.s.length).toBe(2);
  });

  it("returns null on corrupt or empty input instead of throwing", () => {
    expect(decodeShareData("!!!not-valid!!!")).toBeNull();
    expect(decodeShareData("")).toBeNull();
  });

  it("builds a hash-router share URL carrying ?d=", () => {
    const url = buildShareUrl(seedDream, DEFAULT_CARD_CONFIG);
    expect(url).toContain("#/share/d1?d=");
    // ?d= 之后应为 URL-safe，不含会被截断/转义的字符
    const d = url.split("?d=")[1];
    expect(d).not.toMatch(/[+/=]/);
  });
});

describe("summaryToDream image-source inference", () => {
  it("labels a /seeds/ path as a seed image", () => {
    const enc = encodeShareData(seedDream, DEFAULT_CARD_CONFIG);
    const d = summaryToDream(decodeShareData(enc)!.summary, "x");
    expect(d.artifact.imageSource).toBe("seed");
  });

  it("never embeds a data URL (gpt-image base64) into the share link", () => {
    const dataDream: Dream = {
      ...seedDream,
      artifact: {
        ...seedDream.artifact,
        imageUrl: `data:image/png;base64,${"A".repeat(500_000)}`, // 模拟 ~0.5MB base64
        imageSource: "ai",
      },
    };
    const enc = encodeShareData(dataDream, DEFAULT_CARD_CONFIG);
    // 链接必须仍然短小（未把 base64 塞进去），且退回种子氛围图
    expect(enc.length).toBeLessThan(2000);
    const d = decodeShareData(enc)!;
    expect(d.summary.img.startsWith("/seeds/")).toBe(true);
  });

  it("carries and labels a Pollinations URL as an ai image", () => {
    const aiDream: Dream = {
      ...seedDream,
      artifact: {
        ...seedDream.artifact,
        imageUrl: "https://image.pollinations.ai/prompt/foo?model=flux",
        imageSource: "ai",
      },
    };
    const enc = encodeShareData(aiDream, DEFAULT_CARD_CONFIG);
    const d = summaryToDream(decodeShareData(enc)!.summary, "x");
    expect(d.artifact.imageSource).toBe("ai");
    expect(d.artifact.imageUrl).toContain("pollinations");
  });
});
