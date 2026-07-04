import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// 单元测试配置：jsdom 环境（分享编解码用到 btoa/atob/document），@ 别名走 tsconfig
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
