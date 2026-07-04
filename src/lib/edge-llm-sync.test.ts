// 双边缘函数「逐字同步」守卫
// edge-functions/api/llm.ts（EdgeOne 主）与 api/llm.ts（Vercel 备）共享 SYSTEM_PROMPT /
// extractJSON / normalizeAnalysis，靠手工同步。跨目录抽取共享文件有 EdgeOne 路由/打包风险
// 且无法本地验证部署，故改用此测试守卫：任一处漂移，测试立即失败，提醒同步另一处。

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const edgeone = readFileSync(resolve(process.cwd(), "edge-functions/api/llm.ts"), "utf8");
const vercel = readFileSync(resolve(process.cwd(), "api/llm.ts"), "utf8");

/** 归一化：忽略缩进/空行差异，只比对逻辑内容 */
const norm = (s: string) =>
  s.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");

function extractPrompt(src: string): string | null {
  const m = src.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
  return m ? m[1] : null;
}
function extractFn(src: string, name: string): string | null {
  const m = src.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  return m ? m[0] : null;
}

describe("双边缘函数共享逻辑同步守卫", () => {
  it("两个 llm.ts 均可读到内容", () => {
    expect(edgeone.length).toBeGreaterThan(100);
    expect(vercel.length).toBeGreaterThan(100);
  });

  it("SYSTEM_PROMPT 必须一致（改一处务必同步另一处）", () => {
    const a = extractPrompt(edgeone);
    const b = extractPrompt(vercel);
    expect(a, "EdgeOne 文件里未找到 SYSTEM_PROMPT").not.toBeNull();
    expect(b, "Vercel 文件里未找到 SYSTEM_PROMPT").not.toBeNull();
    expect(norm(a!)).toBe(norm(b!));
  });

  it("extractJSON 实现一致", () => {
    const a = extractFn(edgeone, "extractJSON");
    const b = extractFn(vercel, "extractJSON");
    expect(a).not.toBeNull();
    expect(norm(a!)).toBe(norm(b!));
  });

  it("normalizeAnalysis 实现一致", () => {
    const a = extractFn(edgeone, "normalizeAnalysis");
    const b = extractFn(vercel, "normalizeAnalysis");
    expect(a).not.toBeNull();
    expect(norm(a!)).toBe(norm(b!));
  });
});
