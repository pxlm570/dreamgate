/**
 * Zustand 全局状态
 * 持有 dreams / meta / 视图状态，并封装与 IndexedDB 的同步动作。
 * 视图路由用 react-router-dom 的 URL 路由 + 此处的 currentView 协同。
 */
import { create } from 'zustand';
import type { Dream, Meta, ViewRoute } from '@/lib/types';
import * as db from '@/lib/db';

/** 默认 meta（首次进入） */
const DEFAULT_META: Meta = {
  aestheticPreset: 'Ethereal',
  aiConsent: false,
  streak: { count: 0, lastDate: '' },
  onboarded: false,
};

interface DreamStoreState {
  // —— 状态 ——
  dreams: Dream[];
  meta: Meta;
  currentView: ViewRoute;
  selectedDreamId: string | null;
  isGenerating: boolean;
  offlineMode: boolean;
  /** 是否已完成首次加载 */
  loaded: boolean;

  // —— 动作 ——
  /** 从 IndexedDB 加载全部梦境与 meta */
  loadDreams: () => Promise<void>;
  /** 新增梦境（同步写入 db） */
  addDream: (dream: Dream) => Promise<void>;
  /** 更新梦境 */
  updateDream: (dream: Dream) => Promise<void>;
  /** 删除单条梦境 */
  deleteDream: (id: string) => Promise<void>;
  /** 清空全部梦境 */
  clearAll: () => Promise<void>;
  /** 设置 meta（同步写入 db） */
  setMeta: (meta: Meta) => Promise<void>;
  /** 设置当前视图（与 URL 路由协同） */
  setView: (view: ViewRoute) => void;
  /** 设置当前选中的梦境 id */
  setSelectedDream: (id: string | null) => void;
  /** 设置生成中状态 */
  setGenerating: (v: boolean) => void;
  /** 设置离线模式 */
  setOffline: (v: boolean) => void;
}

export const useDreamStore = create<DreamStoreState>((set, get) => ({
  dreams: [],
  meta: DEFAULT_META,
  currentView: 'gate',
  selectedDreamId: null,
  isGenerating: false,
  offlineMode: false,
  loaded: false,

  loadDreams: async () => {
    const [dreams, meta] = await Promise.all([
      db.getAllDreams(),
      db.getMeta(),
    ]);
    set({
      dreams,
      meta: meta ?? DEFAULT_META,
      loaded: true,
    });
  },

  addDream: async (dream) => {
    await db.addDream(dream);
    set({ dreams: [...get().dreams, dream] });
  },

  updateDream: async (dream) => {
    await db.updateDream(dream);
    set({
      dreams: get().dreams.map((d) => (d.id === dream.id ? dream : d)),
    });
  },

  deleteDream: async (id) => {
    await db.deleteDream(id);
    set({
      dreams: get().dreams.filter((d) => d.id !== id),
      selectedDreamId: get().selectedDreamId === id ? null : get().selectedDreamId,
    });
  },

  clearAll: async () => {
    await db.clearAllDreams();
    set({ dreams: [], selectedDreamId: null });
  },

  setMeta: async (meta) => {
    await db.setMeta(meta);
    set({ meta });
  },

  setView: (view) => set({ currentView: view }),

  setSelectedDream: (id) => set({ selectedDreamId: id }),

  setGenerating: (v) => set({ isGenerating: v }),

  setOffline: (v) => set({ offlineMode: v }),
}));
