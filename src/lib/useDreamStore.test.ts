// useDreamStore 单测：覆盖 loadDreams 成功/失败降级、addDream/updateDream/deleteDream/setMeta 状态转移。
// vi.mock 拦截 IndexedDB 层，用 useDreamStore.setState 在每个测试前重置单例状态。
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getAllDreams: vi.fn(),
  getMeta: vi.fn(),
  addDream: vi.fn(),
  updateDream: vi.fn(),
  deleteDream: vi.fn(),
  clearAllDreams: vi.fn(),
  setMeta: vi.fn(),
}));

import * as db from "@/lib/db";
import { useDreamStore } from "@/store/useDreamStore";
import type { Dream, Meta } from "@/lib/types";

const TEST_DREAM_1: Dream = {
  id: "dream-1",
  createdAt: 1700000000000,
  rawText: "我在一片雾中行走",
  emotion: { word: "迷茫", intensity: 0.6, tone: "negative" },
  aestheticPreset: "Ethereal",
  artifact: {
    imageUrl: "/seeds/ethereal-1.png",
    imageSource: "seed",
    emotionAnalysis: "雾象征未知",
    symbols: [{ name: "雾", probability: 0.8, note: "未知与迷茫" }],
    analysisSource: "rule",
  },
};

const TEST_DREAM_2: Dream = {
  id: "dream-2",
  createdAt: 1700000001000,
  rawText: "我飞过山巅",
  emotion: { word: "自由", intensity: 0.8, tone: "positive" },
  aestheticPreset: "Mystical",
  artifact: {
    imageUrl: "",
    imageSource: "ai",
    emotionAnalysis: "",
    symbols: [],
    analysisSource: "ai",
  },
};

const TEST_META: Meta = {
  aestheticPreset: "Ethereal",
  aiConsent: true,
  streak: { count: 3, lastDate: "2026-07-13" },
  onboarded: true,
};

/** 每个测试前重置 store 单例状态与 db mock 实现 */
beforeEach(() => {
  useDreamStore.setState({
    dreams: [],
    meta: {
      aestheticPreset: "Ethereal",
      aiConsent: false,
      streak: { count: 0, lastDate: "" },
      onboarded: false,
    },
    currentView: "gate",
    selectedDreamId: null,
    isGenerating: false,
    offlineMode: false,
    loaded: false,
    storageUnavailable: false,
  });
  vi.mocked(db.getAllDreams).mockReset();
  vi.mocked(db.getMeta).mockReset();
  vi.mocked(db.addDream).mockReset();
  vi.mocked(db.updateDream).mockReset();
  vi.mocked(db.deleteDream).mockReset();
  vi.mocked(db.setMeta).mockReset();
});

describe("useDreamStore.loadDreams", () => {
  it("成功：置 dreams/meta/loaded=true/storageUnavailable=false", async () => {
    vi.mocked(db.getAllDreams).mockResolvedValue([TEST_DREAM_1, TEST_DREAM_2]);
    vi.mocked(db.getMeta).mockResolvedValue(TEST_META);

    await useDreamStore.getState().loadDreams();

    const s = useDreamStore.getState();
    expect(s.dreams).toEqual([TEST_DREAM_1, TEST_DREAM_2]);
    expect(s.meta).toEqual(TEST_META);
    expect(s.loaded).toBe(true);
    expect(s.storageUnavailable).toBe(false);
  });

  it("失败（IndexedDB 不可用）：保交付降级——loaded=true/storageUnavailable=true/空数据", async () => {
    vi.mocked(db.getAllDreams).mockRejectedValue(new Error("IDB blocked"));
    vi.mocked(db.getMeta).mockResolvedValue(TEST_META);

    await useDreamStore.getState().loadDreams();

    const s = useDreamStore.getState();
    // 关键：loaded 必须为 true，否则 WorldPage 卡在 !loaded 永久白屏（隐身窗口即翻车）
    expect(s.loaded).toBe(true);
    expect(s.storageUnavailable).toBe(true);
    expect(s.dreams).toEqual([]);
  });
});

describe("useDreamStore.addDream", () => {
  it("末尾追加新梦境并写入 db", async () => {
    useDreamStore.setState({ dreams: [TEST_DREAM_1], loaded: true });
    vi.mocked(db.addDream).mockResolvedValue(undefined);

    await useDreamStore.getState().addDream(TEST_DREAM_2);

    const s = useDreamStore.getState();
    expect(s.dreams).toEqual([TEST_DREAM_1, TEST_DREAM_2]);
    expect(vi.mocked(db.addDream)).toHaveBeenCalledWith(TEST_DREAM_2);
  });
});

describe("useDreamStore.updateDream", () => {
  it("按 id 替换既有梦境", async () => {
    useDreamStore.setState({ dreams: [TEST_DREAM_1, TEST_DREAM_2] });
    vi.mocked(db.updateDream).mockResolvedValue(undefined);
    const updated: Dream = { ...TEST_DREAM_1, rawText: "改后的文本" };

    await useDreamStore.getState().updateDream(updated);

    const s = useDreamStore.getState();
    expect(s.dreams[0]).toEqual(updated);
    expect(s.dreams[1]).toBe(TEST_DREAM_2);
    expect(vi.mocked(db.updateDream)).toHaveBeenCalledWith(updated);
  });
});

describe("useDreamStore.deleteDream", () => {
  it("移除指定 id 的梦境", async () => {
    useDreamStore.setState({ dreams: [TEST_DREAM_1, TEST_DREAM_2] });
    vi.mocked(db.deleteDream).mockResolvedValue(undefined);

    await useDreamStore.getState().deleteDream("dream-1");

    const s = useDreamStore.getState();
    expect(s.dreams).toEqual([TEST_DREAM_2]);
    expect(vi.mocked(db.deleteDream)).toHaveBeenCalledWith("dream-1");
  });

  it("删除的恰是 selectedDreamId 时清空选中", async () => {
    useDreamStore.setState({
      dreams: [TEST_DREAM_1, TEST_DREAM_2],
      selectedDreamId: "dream-1",
    });
    vi.mocked(db.deleteDream).mockResolvedValue(undefined);

    await useDreamStore.getState().deleteDream("dream-1");

    expect(useDreamStore.getState().selectedDreamId).toBeNull();
  });

  it("删除非选中梦时 selectedDreamId 保持不变", async () => {
    useDreamStore.setState({
      dreams: [TEST_DREAM_1, TEST_DREAM_2],
      selectedDreamId: "dream-2",
    });
    vi.mocked(db.deleteDream).mockResolvedValue(undefined);

    await useDreamStore.getState().deleteDream("dream-1");

    expect(useDreamStore.getState().selectedDreamId).toBe("dream-2");
  });
});

describe("useDreamStore.setMeta", () => {
  it("替换 meta 并写入 db", async () => {
    vi.mocked(db.setMeta).mockResolvedValue(undefined);

    await useDreamStore.getState().setMeta(TEST_META);

    expect(useDreamStore.getState().meta).toEqual(TEST_META);
    expect(vi.mocked(db.setMeta)).toHaveBeenCalledWith(TEST_META);
  });
});
