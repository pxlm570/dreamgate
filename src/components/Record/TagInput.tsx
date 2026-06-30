// TagInput — 标签输入
// 输入框 + 回车添加 + chip 列表 + 点击 chip 删除；去重 + 去空白；上限 20 个

import { useState, type KeyboardEvent } from "react";
import { X, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  value: string[];
  onChange?: (tags: string[]) => void;
  max?: number;
}

export function TagInput({ value, onChange, max = 20 }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    if (value.length >= max) return;
    onChange?.([...value, t]);
    setDraft("");
  };

  const remove = (t: string) => {
    onChange?.(value.filter((x) => x !== t));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-[28px] flex-wrap items-center gap-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full border border-dreamgate-ethereal/30 bg-dreamgate-ethereal/10 px-3 py-1 text-sm text-dreamgate-ethereal"
          >
            <Hash size={11} />
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="ml-0.5 text-dreamgate-ethereal/60 hover:text-dreamgate-ethereal"
              aria-label={`删除标签 ${t}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        placeholder={value.length === 0 ? "回车添加标签（可选）" : "继续添加…"}
        className={cn(
          "w-full border-b border-white/10 bg-transparent py-2 font-body text-base text-dreamgate-text-primary",
          "placeholder:text-zinc-500 focus:border-dreamgate-ethereal focus:outline-none",
        )}
      />
    </div>
  );
}
