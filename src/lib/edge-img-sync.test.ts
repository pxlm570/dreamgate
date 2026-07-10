// 双边缘函数 img.ts「逐字同步」守卫
// edge-functions/api/img.ts（EdgeOne）与 api/img.ts（Vercel）逻辑相同（纯 fetch OpenAI，
// 无 AI binding），靠手工同步。任一处漂移，测试立即失败，提醒同步另一处。
// 仿 edge-llm-sync.test.ts 模式。

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const edgeone = readFileSync(resolve(process.cwd(), "edge-functions/api/img.ts"), "utf8");
const vercel = readFileSync(resolve(process.cwd(), "api/img.ts"), "utf8");

/** 归一化：忽略缩进/空行差异，只比对逻辑内容 */
const norm = (s: string) =>
  s.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");

describe("双边缘函数 img.ts 同步守卫", () => {
  it("两个 img.ts 均可读到内容", () => {
    expect(edgeone.length).toBeGreaterThan(100);
    expect(vercel.length).toBeGreaterThan(100);
  });

  it("两份 img.ts 归一化后必须一致（改一处务必同步另一处）", () => {
    expect(norm(edgeone)).toBe(norm(vercel));
  });

  it("两份均导出 onRequest（EdgeOne 兼容）与 default handler", () => {
    expect(edgeone).toContain("onRequest");
    expect(vercel).toContain("onRequest");
    expect(edgeone).toContain("export default handler");
    expect(vercel).toContain("export default handler");
  });
});
