// degradation.ts 单测 —— 运行时降级触发器
// runtimeState 是模块级单例，同文件内测试按声明顺序执行、状态累积。
// 测试设计据此保证确定性：mobile2_5D 首次→幂等；desktop3D 用于 unsub 验证；
// shareCard3D 留给"首次 emit"测试（前面未触发）。

import { describe, it, expect } from "vitest";
import {
  triggerDegradation,
  DEGRADATION_FLAGS,
  subscribe,
  getSnapshot,
} from "./degradation";

describe("triggerDegradation", () => {
  it("调用合法 key 后对应标志变为 true", () => {
    triggerDegradation("mobile2_5D");
    expect(getSnapshot().mobile2_5D).toBe(true);
  });

  it("重复触发同一 key 幂等：不再 emit listeners", () => {
    // mobile2_5D 已由上一测试触发为 true
    triggerDegradation("mobile2_5D");
    expect(getSnapshot().mobile2_5D).toBe(true);

    let emitted = false;
    const unsub = subscribe(() => {
      emitted = true;
    });
    triggerDegradation("mobile2_5D"); // 已 true，应跳过 emit
    expect(emitted).toBe(false);
    unsub();
  });

  it("subscribe 返回的 unsub 能取消订阅", () => {
    let emitted = false;
    const unsub = subscribe(() => {
      emitted = true;
    });
    unsub();
    triggerDegradation("desktop3D"); // 即使首次触发，已 unsub 不应收到
    expect(emitted).toBe(false);
  });

  it("首次触发新 key 时 emit listeners", () => {
    // shareCard3D 前面测试未触发，此处为首次
    let emitted = false;
    const unsub = subscribe(() => {
      emitted = true;
    });
    triggerDegradation("shareCard3D");
    expect(emitted).toBe(true);
    expect(getSnapshot().shareCard3D).toBe(true);
    unsub();
  });
});

describe("DEGRADATION_FLAGS", () => {
  it("包含全部 4 个降级键且为 boolean 类型", () => {
    expect(typeof DEGRADATION_FLAGS.mobile2_5D).toBe("boolean");
    expect(typeof DEGRADATION_FLAGS.shareCard3D).toBe("boolean");
    expect(typeof DEGRADATION_FLAGS.fogShader).toBe("boolean");
    expect(typeof DEGRADATION_FLAGS.desktop3D).toBe("boolean");
  });
});

describe("getSnapshot", () => {
  it("返回包含全部 4 个键的状态对象", () => {
    const s = getSnapshot();
    expect(s).toHaveProperty("mobile2_5D");
    expect(s).toHaveProperty("shareCard3D");
    expect(s).toHaveProperty("fogShader");
    expect(s).toHaveProperty("desktop3D");
  });
});
