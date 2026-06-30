// ShareActions — 导出 PNG + 复制分享链接（Task 6.2/6.3）
// 导出：html-to-image toPng → 下载 1024×1536 竖图（pixelRatio 2）
// 链接：编码 dream 摘要 + config 到 URL query string
// CORS 兜底：catch 时提示用户截图保存

import { useState, type RefObject } from "react";
import { Download, Link as LinkIcon, Check, AlertCircle } from "lucide-react";
import { Button, Caption } from "@/components/ui";
import type { Dream } from "@/lib/types";
import { buildShareUrl, toPngExport } from "./shareUtils";
import type { CardConfig } from "./types";

export interface ShareActionsProps {
  cardRef: RefObject<HTMLDivElement | null>;
  dream: Dream;
  config: CardConfig;
}

export function ShareActions({ cardRef, dream, config }: ShareActionsProps) {
  const [exporting, setExporting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const dataUrl = await toPngExport(cardRef.current);
      const link = document.createElement("a");
      const dateStr = new Date(dream.createdAt).toISOString().slice(0, 10);
      link.download = `dreamgate-${dream.emotion.word}-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[ShareActions] export failed:", err);
      setError("图像跨域限制，请截图保存");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = async () => {
    setError(null);
    try {
      const url = buildShareUrl(dream, config);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // 兜底：临时 textarea + execCommand
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("[ShareActions] copy link failed:", err);
      setError("复制链接失败，请手动复制");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="primary"
        onClick={handleExport}
        disabled={exporting}
        className="w-full"
      >
        <Download size={16} />
        {exporting ? "导出中..." : "导出梦境卡片"}
      </Button>
      <Button
        variant="ghost"
        onClick={handleCopyLink}
        className="w-full"
      >
        {linkCopied ? <Check size={14} /> : <LinkIcon size={14} />}
        {linkCopied ? "已复制分享链接" : "复制分享链接"}
      </Button>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2">
          <AlertCircle
            size={12}
            className="mt-0.5 shrink-0 text-amber-200/80"
          />
          <Caption
            as="p"
            className="text-[11px] leading-relaxed text-amber-200/80"
          >
            {error}
          </Caption>
        </div>
      )}
      <p className="text-center text-[11px] text-dreamgate-text-muted">
        分享链接包含梦境摘要 + 卡片配置，可直接打开查看
      </p>
    </div>
  );
}
