// exportUtils — 梦境数据导出工具
// 生成 JSON Blob 并通过 <a download> 触发浏览器下载
// 单梦导出：{ exportedAt, version, dream }
// 全部导出：{ exportedAt, version, dreams, meta }

import type { Dream, Meta } from "@/lib/types";

const EXPORT_VERSION = 1;

function download(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** 导出单条梦境为 JSON 文件 */
export function exportDream(dream: Dream): void {
  download(`dreamgate-dream-${dream.id}.json`, {
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    dream,
  });
}

/** 导出全部梦境与 meta 为 JSON 文件 */
export function exportAll(dreams: Dream[], meta: Meta): void {
  download(`dreamgate-export-${dateStamp()}.json`, {
    exportedAt: new Date().toISOString(),
    version: EXPORT_VERSION,
    dreams,
    meta,
  });
}
