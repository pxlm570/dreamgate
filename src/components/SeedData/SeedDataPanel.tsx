// SeedDataPanel — 种子数据管理面板（Task 9）
// 两个动作：「加载示例梦境」（loadSeeds）+「清空全部」（clearAll，二次确认）
// 用于 EmptyGallery 空状态与 GalleryPage 首次自动加载后的手动入口

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button, Caption } from "@/components/ui";
import { useDreamStore } from "@/store/useDreamStore";
import { loadSeeds, SEED_DREAMS } from "@/data/seedDreams";

export interface SeedDataPanelProps {
  /** 加载完成后回调 */
  onLoaded?: () => void;
  /** 清空完成后回调 */
  onCleared?: () => void;
}

export function SeedDataPanel({ onLoaded, onCleared }: SeedDataPanelProps) {
  const dreams = useDreamStore((s) => s.dreams);
  const clearAll = useDreamStore((s) => s.clearAll);
  const [loading, setLoading] = useState(false);

  const seedIds = new Set(SEED_DREAMS.map((d) => d.id));
  const hasSeeds = dreams.some((d) => seedIds.has(d.id));

  const handleLoad = async () => {
    setLoading(true);
    try {
      await loadSeeds();
      onLoaded?.();
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (typeof window !== "undefined" && !window.confirm("确定清空全部梦境？此操作不可撤销。")) {
      return;
    }
    await clearAll();
    onCleared?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center gap-3"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleLoad}
          disabled={loading || hasSeeds}
          title={hasSeeds ? "示例梦境已加载" : "加载 5 场精选示例梦境"}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {loading ? "加载中…" : hasSeeds ? "示例已加载" : "加载示例梦境"}
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={handleClear}
          disabled={dreams.length === 0 || loading}
          className="border-red-400/30 text-red-300/90 hover:border-red-400/50 hover:bg-red-500/10"
        >
          <Trash2 size={16} />
          清空全部
        </Button>
      </div>
      <Caption as="p" className="text-[11px] text-dreamgate-text-muted">
        5 场精选示例 · 含「水 + 负面情绪」跨梦模式演示
      </Caption>
    </motion.div>
  );
}
