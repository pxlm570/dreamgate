// PresetTemplates — 降级版 3 套预设静态模板（Task 6.4）
// 触发：VITE_DEGRADE_SHARE_CARD_3D=true 或移动端
// 模板：极简（白底黑字）/ 古典（深色金边）/ 迷幻（彩虹渐变）+ 每模板独立导出

import { useRef, useState } from "react";
import { Download, Image as ImageIcon, Link as LinkIcon, Check } from "lucide-react";
import { Button, Caption } from "@/components/ui";
import { getEmotionByWord } from "@/lib/emotions";
import { presetToKey } from "@/components/Atmosphere";
import { toPngExport, buildShareUrl, copyToClipboard } from "./shareUtils";
import { DEFAULT_CARD_CONFIG } from "./types";
import type { Dream } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TemplateKind = "minimal" | "classical" | "psychedelic";

export interface PresetTemplatesProps {
  dream: Dream;
  onExport?: (template: TemplateKind) => void;
}

interface TemplateMeta { kind: TemplateKind; label: string; desc: string; }

const TEMPLATES: TemplateMeta[] = [
  { kind: "minimal", label: "极简", desc: "白底黑字，安静凝练" },
  { kind: "classical", label: "古典", desc: "深色金边，仪式感" },
  { kind: "psychedelic", label: "迷幻", desc: "彩虹渐变，张扬" },
];

const TEMPLATE_TEXT_CLASS: Record<TemplateKind, string> = {
  minimal: "text-zinc-900",
  classical: "text-amber-100",
  psychedelic: "text-white",
};

const TEMPLATE_BG: Record<TemplateKind, string> = {
  minimal: "linear-gradient(180deg, #fafafa 0%, #e4e4e7 100%)",
  classical: "linear-gradient(180deg, #18181b 0%, #09090b 100%)",
  psychedelic:
    "linear-gradient(135deg, #ff6b9d 0%, #9d4edd 35%, #4ec9b0 70%, #ffd166 100%)",
};

export function PresetTemplates({ dream, onExport }: PresetTemplatesProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(buildShareUrl(dream, DEFAULT_CARD_CONFIG));
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <Caption as="p" className="text-center text-xs text-dreamgate-text-muted">
          选择一个预设模板导出，或直接复制分享链接
        </Caption>
        {/* 移动端/降级模式也能复制分享链接（与设备无关的传播路径） */}
        <Button variant="primary" size="sm" onClick={handleCopyLink} className="min-w-[200px]">
          {linkCopied ? <Check size={14} /> : <LinkIcon size={14} />}
          {linkCopied ? "已复制分享链接" : "复制分享链接"}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.kind} meta={tpl} dream={dream} onExport={onExport} />
        ))}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  meta: TemplateMeta;
  dream: Dream;
  onExport?: (t: TemplateKind) => void;
}

function TemplateCard({ meta, dream, onExport }: TemplateCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emotionColor = getEmotionByWord(dream.emotion.word)?.color ?? "#c9b8e8";
  const filterClass = `preset-${presetToKey[dream.aestheticPreset]}`;
  const isMinimal = meta.kind === "minimal";

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const dataUrl = await toPngExport(cardRef.current);
      const link = document.createElement("a");
      const dateStr = new Date(dream.createdAt).toISOString().slice(0, 10);
      link.download = `dreamgate-${meta.kind}-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
      onExport?.(meta.kind);
    } catch (err) {
      console.error("[PresetTemplates] export failed:", err);
      setError("图像跨域限制，请截图保存");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={cardRef}
        className={cn(
          "relative aspect-[2/3] w-full overflow-hidden rounded-xl",
          meta.kind === "classical" && "border-2 border-amber-200/40",
          TEMPLATE_TEXT_CLASS[meta.kind],
        )}
        style={{ background: TEMPLATE_BG[meta.kind] }}
      >
        {/* 图像（上半） */}
        <div className="relative h-1/2 w-full overflow-hidden">
          {dream.artifact.imageUrl ? (
            <img src={dream.artifact.imageUrl} alt="梦境" crossOrigin="anonymous" className={cn("h-full w-full object-cover", filterClass)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center opacity-30">
              <ImageIcon size={28} />
            </div>
          )}
        </div>
        {/* 文字（下半） */}
        <div className="flex h-1/2 flex-col gap-2 p-4 font-display">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: emotionColor, boxShadow: `0 0 8px ${emotionColor}` }} />
            <span className="text-base" style={{ color: isMinimal ? "#18181b" : emotionColor }}>
              {dream.emotion.word}
            </span>
          </div>
          {dream.artifact.symbols.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dream.artifact.symbols.slice(0, 3).map((s, i) => (
                <span key={`${s.name}-${i}`} className={cn("rounded-full px-1.5 py-0.5 text-[10px] opacity-70", isMinimal ? "bg-black/10" : "bg-white/15")}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto text-[10px] opacity-60">
            {new Date(dream.createdAt).toLocaleDateString("zh-CN")}
          </div>
        </div>
        {/* 底部情绪色条 */}
        <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: `linear-gradient(90deg, ${emotionColor}, transparent)` }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="font-display text-base text-dreamgate-text-primary">{meta.label}</div>
        <Caption as="p" className="text-[11px]">{meta.desc}</Caption>
        <Button variant="ghost" size="sm" disabled={exporting} onClick={handleExport}>
          <Download size={12} />
          {exporting ? "导出中..." : "导出 PNG"}
        </Button>
        {error && <p className="text-[10px] text-amber-200/80">{error}</p>}
      </div>
    </div>
  );
}
