// ExportButton — 梦境数据导出按钮
// 单梦导出：传 dream
// 全部导出：传 dreams + meta
// 点击生成 JSON Blob 并下载（详见 exportUtils）

import { Download } from "lucide-react";
import { Button } from "@/components/ui";
import { exportDream, exportAll } from "./exportUtils";
import type { Dream, Meta } from "@/lib/types";

export interface ExportButtonProps {
  /** 单梦导出（优先于 dreams/meta） */
  dream?: Dream;
  /** 全部导出 */
  dreams?: Dream[];
  meta?: Meta;
  /** 按钮文案 */
  label?: string;
  className?: string;
}

export function ExportButton({
  dream,
  dreams,
  meta,
  label = "导出 JSON",
  className,
}: ExportButtonProps) {
  const canExport = !!dream || (!!dreams && !!meta);

  const handle = () => {
    if (dream) {
      exportDream(dream);
      return;
    }
    if (dreams && meta) {
      exportAll(dreams, meta);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={handle}
      disabled={!canExport}
    >
      <Download size={14} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
