import { describe, it, expect } from "vitest";
import { mapEmotionToKey, getSeedImage } from "./seedLibrary";

describe("mapEmotionToKey", () => {
  it("maps each dimension to its bucket", () => {
    expect(mapEmotionToKey("兴奋")).toBe("excited"); // high-pleasant
    expect(mapEmotionToKey("焦虑")).toBe("anxious"); // high-unpleasant
    expect(mapEmotionToKey("温柔")).toBe("tender"); // low-pleasant
    expect(mapEmotionToKey("悲伤")).toBe("sad"); // low-unpleasant
  });

  it("honors the ethereal overrides (出神/宁静/释然)", () => {
    expect(mapEmotionToKey("出神")).toBe("ethereal");
    expect(mapEmotionToKey("宁静")).toBe("ethereal");
    expect(mapEmotionToKey("释然")).toBe("ethereal");
  });

  it("falls back to ethereal for an unknown word", () => {
    expect(mapEmotionToKey("不存在的情绪")).toBe("ethereal");
  });
});

describe("getSeedImage", () => {
  it("returns the matching preset+emotion path", () => {
    expect(getSeedImage("Dark Fantasy", "焦虑")).toBe(
      "/seeds/dark-fantasy-anxious.svg",
    );
    expect(getSeedImage("Psychedelic", "兴奋")).toBe(
      "/seeds/psychedelic-excited.svg",
    );
  });

  it("uses the ethereal bucket for 出神", () => {
    expect(getSeedImage("Ethereal", "出神")).toBe("/seeds/ethereal-ethereal.svg");
  });
});
