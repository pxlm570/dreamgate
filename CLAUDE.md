# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目

**梦阈 · DreamGate** — 本地优先的「个人潜意识档案馆」Web 应用（TRAE AI 创造力大赛参赛作品）。用户记录梦境 → AI 生成风格统一的图像 + 情绪/符号解析 → 在 3D 走廊画廊中浏览 → 导出分享卡片 → 追踪情绪 streak 与跨梦模式。所有数据存在浏览器 IndexedDB 中，**没有后端数据库**。代码注释与 UI 文案均为中文。

## 常用命令

```bash
npm run dev        # Vite 开发服务器（HMR）；同时提供 dev-only 的 /api/img 中间件
npm run build      # tsc -b（类型检查）&& vite build → dist/
npm run check      # tsc -b --noEmit — 仅类型检查
npm run lint       # eslint .
npm run test       # vitest run — 单元测试（jsdom 环境，匹配 src/**/*.test.ts）
npm run test:watch # vitest 监听模式
npx vitest run src/lib/patterns.test.ts   # 运行单个测试文件
npm run preview    # 预览生产构建
```

验证改动：`npm run check` + `npm run test` + `npm run lint`，再在 `npm run dev` 里手动确认。`build` 先跑 `tsc -b`，所以 `check` 不干净构建必失败。`npm install` 走 npmmirror 镜像源（`.npmrc`）。vitest 必须在仓库根目录运行——`edge-llm-sync.test.ts` 用 `process.cwd()` 解析文件路径。

技术栈：Vite 6 · React 18 · TypeScript 5.8（`strict: false`）· three.js / @react-three/fiber + drei · GSAP + Framer Motion + Lenis · Tailwind 3 · Zustand 5 · idb · Vitest 4（jsdom）。导入别名 `@/*` → `src/*`（经 `vite-tsconfig-paths`）。

### 资产生成脚本（可选；需在 gitignored 的 `.env` 里配 `OPENAI_API_KEY`）

AI 图像在开发期烘焙成静态资产——零运行时成本。产物已提交进仓库，一般不需要重跑：

- `node scripts/gen-seeds.mjs` — `public/seeds/` 的 20 张 SVG 种子占位图（无需 Key）
- `node scripts/gen-seed-images.mjs` — 5 张高清演示梦境 PNG → `public/seeds-gen/`
- `node scripts/gen-scene-textures.mjs` / `gen-env-textures.mjs` — 3D 场景天幕与可平铺材质 → `public/textures/`
- `node scripts/gen-gate-concepts.mjs` — 美术定稿概念图 → `docs/concepts/`（文档资产，不进运行时包）

## 架构

### 分层 — `src/lib/*` 保持无 React
`src/lib/*` 是纯逻辑层（types、情绪/符号/美学库、AI 客户端、db、规则解析、跨梦模式、降级），**不得 import React 或组件**。单测以 `*.test.ts` 与被测模块同目录放置。`src/lib/types.ts` 的数据模型是唯一事实来源，且**跨边缘函数边界共享**——`/api/llm` 返回的 `DreamAnalysis` 形状必须与 `lib/ai.ts` 校验的一致。

### 状态一律走 Zustand store，绝不直连 DB
组件读状态、调 `useDreamStore`（`src/store/useDreamStore.ts`）的 action。每个写操作 action 同时写 IndexedDB **和** 更新 store 状态（如 `addDream` → `db.addDream` 再 `set`）。组件绝不直接调用 `src/lib/db.ts`——必须经过 store，保证内存副本一致。数据库为 `dreamgate-db` v1，三个 store：`dreams` / `meta`（单记录，key 为 `'meta'`）/ `inspirations`。

### 多级 AI 兜底（核心韧性设计）
生成流程永不硬失败。横跨 `lib/ai.ts`、`lib/seedLibrary.ts`、`lib/ruleParser.ts` 和 `components/Generation/GenerationOrchestrator.tsx`：
- **图像**（从高到低）：gpt-image 经 `/api/img` 代理——仅当 `VITE_USE_GPT_IMAGE=true` 时尝试 → Pollinations.ai flux URL（同步构造、无 Key，预加载带 9 秒硬超时）→ `public/seeds/*.svg` 占位图（4 预设 × 5 情绪 = 20 张）。编排器用 **Set 记录失败 URL**（`erroredUrlsRef`——用布尔标记会误杀「Pollinations 预览超时后才成功返回的 gpt-image data URL」），并按 dream id 去重进行中的生成（`inFlightRef`，防 StrictMode 双跑浪费 LLM 额度）。
- **解析**：`POST /api/llm`（大模型）→ 任何失败回退关键词规则解析（`ruleParser`）。
- **离线**（`navigator.onLine`）或**拒绝 AI**（同意弹窗）：完全跳过网络，构建纯本地 artifact。
每个 artifact 都带来源标记（`imageSource`、`analysisSource`、`imageFallback`、`analysisFallback`、`offline`），UI 据此展示实际发生了什么。

### 边缘函数 — EdgeOne 主、Vercel 备，同步由测试守卫
同一 `/api/llm` 契约的两份实现：
- `edge-functions/api/llm.ts` — **主**，EdgeOne Pages。调用注入的全局 `AI` binding（Edge AI / DeepSeek-V3），零 API Key，约 50 次/天。导出 `onRequest(context)`，读 `context.request`。
- `api/llm.ts` — **备**，Vercel。经 `fetch` 调 SiliconFlow（Qwen2.5-7B），需要 `SILICONFLOW_API_KEY` 环境变量。导出 `default handler(req)` + `onRequest` 别名。

共享辅助函数（`SYSTEM_PROMPT`、`extractJSON`、`normalizeAnalysis`）在两文件间**逐字复制**。**改一处必须同步另一处**——`src/lib/edge-llm-sync.test.ts` 会读取两个文件比对，任何漂移即测试失败，`npm run test` 能兜住漏同步。`edge-functions/api/ping.ts` 用于部署后探测 AI binding 形状。

`/api/img`（gpt-image 代理）拓扑不同：dev 环境由 `vite.config.ts` 内置中间件提供（从 gitignored 的 `.env` 读 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_IMAGE_MODEL`）；生产环境由 `api/img.ts` 提供（双兼容：Vercel `default handler` + EdgeOne `onRequest`，不依赖 AI binding）。该文件目前**没有镜像到 `edge-functions/api/`**，所以 EdgeOne 部署没有 `/api/img`，前端会静默回退 Pollinations——若要在 EdgeOne 启用 gpt-image，把文件复制过去即可。所有环境变量见 `.env.example`。

### 路由 — HashRouter + 路由级懒加载
`src/App.tsx` 用 `HashRouter` 而非 `BrowserRouter`，因为 EdgeOne Pages 不支持 SPA fallback 重写。所有 URL 形如 `/#/path`；分享链接必须带 `/#/` 前缀（见 `components/Share/shareUtils.ts`，其同时把梦境编码为 `?d=` base64 参数供只读查看）。`src/pages/` 的七个页面组件（gate `/`、gallery、record、`dream/:id`、`share/:id`、report、pool）**全部经 `React.lazy` + `Suspense` 懒加载**，three.js 只在用到它的页面加载；`vite.config.ts` 另按库拆 vendor chunk（`vendor-three` / `vendor-motion` / `vendor-scroll` / `vendor-react`）。

### 双层降级系统
`src/lib/degradation.ts` 暴露四个开关（`mobile2_5D`、`shareCard3D`、`fogShader`、`desktop3D`）：
- **编译期**：`VITE_DEGRADE_*` 环境变量（构建时读一次）——设置它们可强制产出降级版构建。
- **运行时**：`triggerDegradation(key)` 实时翻转开关且**不可逆**（保交付偏置）；组件经 `useDegradation()` hook（`useSyncExternalStore`）订阅。
此外 `GalleryPage` 在运行时根据 WebGL 可用性、`innerWidth < 768`、`navigator.hardwareConcurrency < 4` 自动选 3D 或 2.5D——与上述开关相互独立。用户的模式选择持久化在 `localStorage`（`dg-gallery-mode`）。

### 跨梦模式识别 — 差异化卖点
`src/lib/patterns.ts`（`analyzePatterns`）对全部已存梦境做纵向分析；`components/Tracking/CrossDreamInsights.tsx` 将其渲染为 `ReportPage` 的中心叙事区。这份「一次性 LLM 给不出的洞察」是本项目区别于通用聊天机器人的核心卖点——改 Report/Tracking 相关代码时务必保住它。

### 可选纹理 — 绝不做硬依赖
`public/textures/*.png` 是 gpt-image 生成的场景资产（画廊墙面/地板材质、门厅天幕、走廊迷雾）。3D 组件经 `src/hooks/useOptionalTexture.ts` 加载，文件缺失时回退程序化材质——删掉纹理必须优雅降级，绝不能让场景崩溃。

### 种子演示数据
`src/data/seedDreams.ts` 存 5 个精选示例梦境（含跨梦模式：水 ×3 + 飞翔/坠落对比，供报告页使用）；其 `imageUrl` 指向 `public/seeds-gen/` 的预生成 PNG。`GalleryPage` 只在画廊为空时自动加载**一次**，由 `localStorage` key `dreamgate-seeds-auto-loaded` 守卫，用户清空全部梦境后不会被重新播种。

## 约定

- **主题**：使用 `tailwind.config.js` 中定义的 `dreamgate-*` Tailwind 颜色 token 和 `font-display` / `font-body` / `font-mono` 字体族，不要写裸 hex/字体。4 个美学预设各映射一个代表色（ethereal/darkfantasy/mystical/psychedelic）。
- **组件目录**：`src/components/<Feature>/` 下各有 `index.ts` barrel；按 feature 经 barrel 导入（`@/components/Gallery`）。
- **可复现种子**：图像 seed 由 `dream.id` 确定性推导（编排器里的 `hashSeed`），重新生成同一梦境得到相同图像。
- `.trae/` 目录存原始 spec/任务/清单；`docs/开发记录.md` 是开发日志（06-30 后停更，历史参考），`docs/项目总览.md` 是当前项目总览，`docs/部署指南.md` 是 EdgeOne 部署指南，`docs/项目质量提升计划.md` 是质量提升计划。
