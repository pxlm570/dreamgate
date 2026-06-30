// CardEditor — 卡片编辑器控制面板（Task 6.1）
// 控件：美学预设(4) / 边框(4) / 字体(display/body) / 字段勾选(4) / 摘录长度 slider
// 隐私：原文摘录默认关闭 + 标注"隐私字段"

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Type, Square, Palette, ListChecks, AlignLeft } from "lucide-react";
import { Caption } from "@/components/ui";
import { AESTHETIC_PRESETS } from "@/lib/aestheticPresets";
import { cn } from "@/lib/utils";
import type { CardConfig, BorderStyle, FontFamilyKey } from "./types";

export interface CardEditorProps {
  config: CardConfig;
  onChange: (config: CardConfig) => void;
}

const BORDER_OPTIONS: { value: BorderStyle; label: string }[] = [
  { value: "none", label: "无" },
  { value: "thin", label: "细线" },
  { value: "double", label: "双线" },
  { value: "glow", label: "光晕" },
];

const FONT_OPTIONS: { value: FontFamilyKey; label: string }[] = [
  { value: "display", label: "优雅衬线" },
  { value: "body", label: "正文衬线" },
];

const FIELD_OPTIONS: {
  key: keyof CardConfig["fields"];
  label: string;
  isPrivate?: boolean;
}[] = [
  { key: "rawText", label: "原文摘录", isPrivate: true },
  { key: "emotion", label: "主导情绪" },
  { key: "symbols", label: "符号列表" },
  { key: "date", label: "记录日期" },
];

export function CardEditor({ config, onChange }: CardEditorProps) {
  const update = (patch: Partial<CardConfig>) => onChange({ ...config, ...patch });
  const toggleField = (key: keyof CardConfig["fields"]) =>
    onChange({
      ...config,
      fields: { ...config.fields, [key]: !config.fields[key] },
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6 rounded-xl border border-white/8 bg-dreamgate-elevated/60 p-6 backdrop-blur-md"
    >
      {/* 美学预设 */}
      <section>
        <SectionTitle icon={<Palette size={12} />}>背景氛围</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {AESTHETIC_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => update({ preset: p.name })}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-xs transition-all",
                config.preset === p.name
                  ? "border-dreamgate-ethereal/60 bg-dreamgate-ethereal/10 text-dreamgate-text-primary"
                  : "border-white/10 text-dreamgate-text-secondary hover:border-white/25",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* 边框样式 */}
      <section>
        <SectionTitle icon={<Square size={12} />}>边框样式</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {BORDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ borderStyle: opt.value })}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-[11px] transition-all",
                config.borderStyle === opt.value
                  ? "border-dreamgate-ethereal/60 bg-dreamgate-ethereal/10 text-dreamgate-text-primary"
                  : "border-white/10 text-dreamgate-text-secondary hover:border-white/25",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* 字体 */}
      <section>
        <SectionTitle icon={<Type size={12} />}>字体</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ fontFamily: opt.value })}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-all",
                opt.value === "display" ? "font-display" : "font-body",
                config.fontFamily === opt.value
                  ? "border-dreamgate-ethereal/60 bg-dreamgate-ethereal/10 text-dreamgate-text-primary"
                  : "border-white/10 text-dreamgate-text-secondary hover:border-white/25",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* 字段勾选 */}
      <section>
        <SectionTitle icon={<ListChecks size={12} />}>显示字段</SectionTitle>
        <div className="flex flex-col gap-2">
          {FIELD_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/8 px-3 py-2 hover:border-white/20"
            >
              <input
                type="checkbox"
                checked={config.fields[opt.key]}
                onChange={() => toggleField(opt.key)}
                className="h-3.5 w-3.5 accent-dreamgate-ethereal"
              />
              <span className="text-xs text-dreamgate-text-secondary">
                {opt.label}
              </span>
              {opt.isPrivate && (
                <Caption className="ml-auto text-[10px] text-amber-200/60">
                  隐私字段
                </Caption>
              )}
            </label>
          ))}
        </div>
      </section>

      {/* 摘录长度（仅当 rawText 启用时显示） */}
      {config.fields.rawText && (
        <section>
          <SectionTitle
            icon={<AlignLeft size={12} />}
            trailing={`${config.excerptLength} 字`}
          >
            摘录长度
          </SectionTitle>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={config.excerptLength}
            onChange={(e) => update({ excerptLength: Number(e.target.value) })}
            className="w-full accent-dreamgate-ethereal"
          />
        </section>
      )}
    </motion.div>
  );
}

function SectionTitle({
  icon,
  children,
  trailing,
}: {
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-dreamgate-text-muted">
      {icon}
      <span>{children}</span>
      {trailing && (
        <span className="ml-auto text-[11px] normal-case tracking-normal text-dreamgate-text-muted">
          {trailing}
        </span>
      )}
    </div>
  );
}
