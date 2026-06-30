// Share 组件 barrel 导出（Task 6：梦境卡片分享）

export { ShareCard } from "./ShareCard";
export type { ShareCardProps } from "./ShareCard";
export { CardEditor } from "./CardEditor";
export type { CardEditorProps } from "./CardEditor";
export { ShareActions } from "./ShareActions";
export type { ShareActionsProps } from "./ShareActions";
export { PresetTemplates } from "./PresetTemplates";
export type { PresetTemplatesProps, TemplateKind } from "./PresetTemplates";

export type { CardConfig, BorderStyle, FontFamilyKey } from "./types";
export { DEFAULT_CARD_CONFIG } from "./types";

export {
  encodeShareData,
  decodeShareData,
  buildShareUrl,
  readShareDataFromQuery,
  summaryToDream,
  toPngExport,
  type ShareDataSummary,
} from "./shareUtils";
