// RecordForm — 梦境录入主表单
// 原文 textarea + 情绪 + 颜色 + 标签 + 美学预设 + 语音转写 + 保存
// 状态用 useState 局部管理；保存调用 store.addDream（已自动同步 IndexedDB）
// 低摩擦：仅原文 1 字即可保存，元数据全可选；artifact 用占位空对象，等 Task 4 回填

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { useDreamStore } from "@/store/useDreamStore";
import { DEFAULT_EMOTION, getEmotionByWord } from "@/lib/emotions";
import { getPresetByName } from "@/lib/aestheticPresets";
import type { AestheticPresetName, Artifact, Dream } from "@/lib/types";
import { EmotionPicker } from "./EmotionPicker";
import { AestheticPicker } from "./AestheticPicker";
import { TagInput } from "./TagInput";
import { ColorPicker } from "./ColorPicker";
import { VoiceCapture } from "./VoiceCapture";

export interface RecordFormProps {
  onSaved?: (id: string) => void;
}

const EMPTY_ARTIFACT: Artifact = {
  imageUrl: "",
  imageSource: "ai",
  emotionAnalysis: "",
  symbols: [],
  analysisSource: "rule",
};

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RecordForm({ onSaved }: RecordFormProps) {
  const meta = useDreamStore((s) => s.meta);
  const addDream = useDreamStore((s) => s.addDream);

  const [rawText, setRawText] = useState("");
  const [emotionWord, setEmotionWord] = useState<string | undefined>(undefined);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [preset, setPreset] = useState<AestheticPresetName>(
    () => getPresetByName(meta.aestheticPreset)?.name ?? "Ethereal",
  );
  const [saving, setSaving] = useState(false);

  const hasText = rawText.trim().length > 0;
  const canSave = hasText && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const entry = emotionWord ? getEmotionByWord(emotionWord) : undefined;
      const emotion = entry
        ? { word: entry.word, intensity: 0.6, tone: entry.tone }
        : { ...DEFAULT_EMOTION };
      const dream: Dream = {
        id: genId(),
        createdAt: Date.now(),
        rawText: rawText.trim(),
        emotion,
        color,
        tags: tags.length ? tags : undefined,
        aestheticPreset: preset,
        artifact: EMPTY_ARTIFACT,
        shared: false,
      };
      await addDream(dream);
      onSaved?.(dream.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-7"
    >
      <motion.div variants={fieldVariants}>
        <SectionLabel>梦境原文</SectionLabel>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="把刚做的梦记下来……不必完整，碎片也行。"
          className="min-h-[200px] w-full resize-y border-b border-white/10 bg-transparent py-3 font-body text-lg leading-relaxed text-dreamgate-text-primary placeholder:text-zinc-500 focus:border-dreamgate-ethereal focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <VoiceCapture onTranscript={(t) => setRawText((p) => p + t)} />
        </div>
      </motion.div>

      <motion.div variants={fieldVariants}>
        <SectionLabel>情绪</SectionLabel>
        <EmotionPicker value={emotionWord} onChange={setEmotionWord} />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <SectionLabel>颜色（可选）</SectionLabel>
        <ColorPicker value={color} onChange={setColor} />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <SectionLabel>标签（可选）</SectionLabel>
        <TagInput value={tags} onChange={setTags} />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <SectionLabel>美学预设</SectionLabel>
        <AestheticPicker value={preset} onChange={setPreset} />
      </motion.div>

      <motion.div variants={fieldVariants}>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canSave}
          onClick={handleSave}
        >
          <Sparkles size={18} />
          {saving ? "正在记下…" : "记下这场梦"}
        </Button>
        {!hasText && (
          <p className="mt-2 text-center text-xs text-dreamgate-text-muted">
            至少记下一个字，便能暂存。情绪、颜色、标签都不阻塞保存。
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-dreamgate-text-muted">
      {children}
    </div>
  );
}
