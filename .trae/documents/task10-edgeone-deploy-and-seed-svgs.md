# Task 10 实施计划（修订版 v2）

> **版本**：v2，取代被否决的 v1。v1 原文已存于会话历史。
> **change-id**：build-dreamgate
> **模式**：部署 + 资源补全 + 路由适配（多文件，含共享文件改动）
> **语言**：中文

***

## 一、Context（为什么做）

Task 1-9 已完成（tsc 零错误，生产构建通过）。到达 Task 10 部署节点时发现两个必须解决的缺口：

1. **种子图裂图**：Task 9 种子梦境 `artifact.imageUrl` 指向 `/seeds/*.jpg`，但 `public/seeds/` 为空。首次进入自动加载 5 个示例梦境时画廊门和梦境房间显示裂图，破坏 demo 视觉。
2. **EdgeOne 部署三处不兼容**（经官方文档核实）：

   * 边缘函数目录是 `/edge-functions/`，现有 `api/llm.ts`（Vercel 约定）EdgeOne 不识别；

   * `api/llm.ts:262` `export const onRequest = handler` 把 EdgeOne 的 `context` 当 `Request` 用（handler 签名是 `(req: Request)`），运行时崩溃；

   * `edgeone.json` 的 `rewrites` 不支持 SPA 路由重写，BrowserRouter 下 `/share/:id` 直接访问 404。

**用户已确认决策**：SVG 占位图 + EdgeOne Pages + EdgeOne 内置 Edge AI（DeepSeek-V3，零 Key）。

**预期结果**：可一键部署到 EdgeOne Pages，演示零配置跑通 AI 解析，种子梦境有 on-brand 占位图不裂图，分享链接可直接访问。

***

## 二、审查发现与 v1→v2 修订要点

v1 被否决后经全面审查（完整性/逻辑/可行性/时间/资源/风险六维），修订如下：

| #  | 维度    | v1 问题                                                                                                     | v2 修订                                                                      |
| -- | ----- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1  | 完整性   | A4 写"4处 imageUrl"，实为 **5 处**（`seedDreams.ts:25/47/69/91/113`，seed-5 复用 dark-fantasy-anxious.jpg）→ 按字面执行漏改 | A4 改为"5 处全改"，并允许 `replace_all` 把两文件内 `.jpg`→`.svg`                         |
| 2  | 完整性   | SVG 仅隐含 1024×1024，未强制 `<svg>` 根 `width/height` 属性 → three.js TextureLoader 仅 viewBox 可能渲染 0×0/300×150     | A1 明确强制 `width="1024" height="1024" viewBox="0 0 1024 1024"`               |
| 3  | 完整性   | 缺 `AI` undefined 守卫 → 本地 dev/非 EdgeOne 环境 `globalThis.AI` 不存在即抛                                           | B1 加 `if (typeof AI === 'undefined' \|\| !AI?.chatCompletions) return 503` |
| 4  | 完整性   | 未提 Edge AI 50次/天 限额 → demo 易耗尽                                                                            | 新增风险项 + 部署指南注明，依赖 ruleParser 兜底                                            |
| 5  | 完整性   | AI 后端偏离 spec（spec 写 SiliconFlow，计划改 Edge AI）未回写                                                           | C 新增 spec/tasks/开发记录 回写步骤                                                  |
| 6  | 完整性   | 验证步骤 1-3 用 `npm run dev` 但测不了 /api/llm（vite 不服务 edge-functions）未澄清                                        | 验证章节区分：本地 dev 走 ruleParser 降级；AI 端到端用 `edgeone pages dev` 或部署后             |
| 7  | 完整性   | Task 10.3（资源优化）是 P0 子任务却标"延后"                                                                             | 提供可选 manualChunks 快速赢；明确标注 P0 缩减待用户确认                                      |
| 8  | 逻辑    | 保留两套边缘函数（SiliconFlow + Edge AI），两模型输出可能不一致                                                                | 注明 demo 主用 Edge AI；helpers 复用同一 SYSTEM\_PROMPT 保证解析格式一致                    |
| 9  | 可行性   | EdgeOne 构建环境 npm install 可能 ECONNRESET（dev 记录遇过）                                                          | B2 增补 `.npmrc`（npmmirror）作为可选缓解；部署指南提示                                     |
| 10 | 时间/资源 | 无并行标注；未提 Sub-Agent 编排；B3 改共享文件未按 §4.8 教训分工                                                                | 新增「执行编排」章节：A ∥ B1/B2 可 Sub-Agent；B3（共享文件）主 Agent；C 串行收尾                    |
| 11 | 风险    | **完全缺失**风险章节                                                                                              | 新增专门「风险与缓解」章节                                                              |

v1 成立且保留的部分：三 Workstream 结构、HashRouter 选择（优于 rewrites）、tsconfig include 分析、防御性 content 提取、复用 SYSTEM\_PROMPT、保留 api/llm.ts 作 Vercel 备用。

***

## 三、关键约束（已核实）

* `tsconfig.json` include = `["src","api"]` → 新建 `edge-functions/` 不被 tsc 编译，未类型化 `AI` 全局不破坏 `npm run check`/`build`。

* 全代码库仅 `src/components/Share/shareUtils.ts:72` 一处用 `window.location.origin`，HashRouter 改造面极小。

* `src/lib/ai.ts:66` 运行时 `fetch('/api/llm')`；上游失败 `analyzeDream` throw → `generateArtifact`(`ai.ts:163`) catch → `ruleParser` 降级。降级链路成立。

* `api/llm.ts` 不被前端 import，保留作 Vercel 备用不影响 EdgeOne。

* `react-router-dom ^7.3.0`（v7）仍导出 `HashRouter`，组件式 `<Router><Routes>` 用法兼容；`useSearchParams` 在 HashRouter 下读 hash 中 `?` 后部分，透明工作。

* EdgeOne 内置 Edge AI（`@tx/deepseek-ai/deepseek-v3-0324`）零 Key，OpenAI 兼容，非流式返回 `{choices:[{message:{content}}]}`（经官方文档 + WebSearch 核实）。

* vite.config 无 `base`、无 code-split（1.5MB / 439KB gzip，演示可接受）。

***

## 四、Workstream A：SVG 种子占位图

### A1. 编写生成器 `scripts/gen-seeds.mjs`（新建）

ESM Node 脚本，参数化生成 20 张 SVG（4 预设 × 5 情绪键）到 `public/seeds/`。

**配色**（复用 `src/lib/aestheticPresets.ts` + 视觉 token）：

* Ethereal：底 `#0a0a14`，辅 `#C9B8E8`/`#E8E0F5`

* Dark Fantasy：底 `#0d0608`，辅 `#EF476F`/`#6A0572`

* Mystical：底 `#0a0814`，辅 `#5A189A`/`#9D4EDD`

* Psychedelic：底 `#0a0a0f`，辅 `#FFD166`/`#06D6A0`/`#EF476F`

* 情绪 orb 色：excited `#FFD166` / anxious `#EF476F` / tender `#FFAFCC` / sad `#4A90E2` / ethereal `#C9B8E8`

**SVG 结构**（每张 `<svg xmlns="..." width="1024" height="1024" viewBox="0 0 1024 1024">`，**强制 width/height 属性**以兼容 three.js TextureLoader）：

1. 深色底 `<rect width="1024" height="1024">`
2. 预设主色大径向渐变（模糊铺底）
3. 2 辅色 + 1 情绪色径向 orb（`feGaussianBlur stdDeviation≈80`，位置由 `(presetIdx,emotionIdx)` 确定性偏移，每张独特但风格一致）
4. `feTurbulence` 颗粒层（\~8% 不透明度）
5. 径向暗角 vignette
6. **无文字**（画廊 cssFilter 会叠加）

**文件名**：`{presetSlug}-{emotionKey}.svg`，slug 取自 `seedLibrary.ts` 的 `PRESET_SLUGS`（ethereal/dark-fantasy/mystical/psychedelic），emotionKey: excited/anxious/tender/sad/ethereal。

### A2. 运行生成

`node scripts/gen-seeds.mjs` → `public/seeds/` 下 20 个 `.svg`。

### A3. 更新 `src/lib/seedLibrary.ts`

`SEED_LIBRARY` 20 条路径 `.jpg`→`.svg`（可 `replace_all` `.jpg`→`.svg`，该文件 `.jpg` 仅出现在种子路径）。

### A4. 更新 `src/data/seedDreams.ts`

**5 处** `imageUrl` 全改 `.jpg`→`.svg`（`:25` dark-fantasy-anxious、`:47` ethereal-anxious、`:69` mystical-sad、`:91` ethereal-excited、`:113` dark-fantasy-anxious 复用）。可 `replace_all` `.jpg`→`.svg`。

### A5. 验证

`npm run check` + `npm run build` 通过；`npm run dev` 访问画廊确认 5 扇门 SVG 图渲染（套预设 cssFilter 后氛围统一，不裂图）。

***

## 五、Workstream B：EdgeOne 部署适配

### B1. 新建 `edge-functions/api/llm.ts`（EdgeOne 边缘函数，自包含）

* `export async function onRequest(context)` → `const req = context.request`（修复签名）。

* 复用 `api/llm.ts` 的 `SYSTEM_PROMPT`/`extractJSON`/`normalizeAnalysis`/`json`/CORS（复制，因 edge-functions/ 独立打包不能 import 项目模块）。

* **AI undefined 守卫**（v2 新增）：

  ```js
  if (typeof AI === 'undefined' || !AI?.chatCompletions) {
    return json({ error: 'Edge AI unavailable' }, 503);
  }
  ```

* **Edge AI 调用**（零 Key）：

  ```js
  const resp = await AI.chatCompletions({
    model: '@tx/deepseek-ai/deepseek-v3-0324',
    messages, stream: false, temperature: 0.6, max_tokens: 1024,
  });
  ```

* 防御性提取 content（兼容 string / `{choices:[{message:{content}}]}` / `Response.text()` 三种形态）。

* 上游失败返 502 → 前端 `ai.ts` 自动 `ruleParser` 降级。

* 可选 `declare const AI: any;` 提升可读性（不入 tsconfig，不影响构建）。

### B2. 新建 `edgeone.json`（项目根）

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "nodeVersion": "20.18.0"
}
```

可选缓解（若 EdgeOne 构建环境 npm install ECONNRESET）：新增 `.npmrc` 写 `registry=https://registry.npmmirror.com`。

### B3. SPA 路由改 HashRouter（**共享文件，主 Agent 执行**）

* `src/App.tsx:2`：`BrowserRouter as Router` → `HashRouter as Router`（仅 import）。

* `src/components/Share/shareUtils.ts:72`：`${origin}/share/...` → `${origin}/#/share/...`。

* `SharePage.tsx` 无需改（`useSearchParams` 在 HashRouter 透明）。

* `index.html` OG 标签静态，HashRouter 不影响社交预览。

### B4. 保留 `api/llm.ts`（Vercel 备用，不删）

仍受 tsconfig 类型检查且通过；作 Vercel 部署时 SiliconFlow 函数。`.env.example` 的 `SILICONFLOW_API_KEY` 保留（仅 Vercel 用）。**注**：两套后端共用同一 `SYSTEM_PROMPT`，保证解析 JSON 格式一致；demo 主用 Edge AI。

### B5. 新建 `docs/部署指南.md`

区分「我已准备」与「用户操作」：

* **我已准备**：`edge-functions/api/llm.ts`、`edgeone.json`、HashRouter 适配、SVG 种子图、`.npmrc`（可选）。

* **用户操作（二选一）**：

  * 控制台（推荐）：EdgeOne Pages → 创建项目 → 导入 Git → 框架 Vite → 构建 `npm run build` → 输出 `dist` → Node 20 → 部署（边缘函数从 `/edge-functions` 自动识别）。

  * CLI：`! npm i -g edgeone` → `! edgeone pages dev`（本地联调含边缘函数）→ git push 触发构建 或 `! edgeone pages deploy`。

* **环境变量**：EdgeOne 无需任何 Key（Edge AI 内置）；可选 `VITE_DEGRADE_*`。

* **限额提示**：Edge AI 50次/天，超限自动降级到本地规则解析（功能不中断，仅解析精度下降）。

* **部署后验证清单**：`/`（镜门）→ `/#/gallery`（种子自动加载+SVG）→ `/#/dream/seed-1` → 生成分享链接 → 新窗口打开只读卡 → `/#/report` → 录入新梦测 AI 解析。

### B6. 验证

`npm run check` + `npm run build` 通过；`npm run dev` 验证 HashRouter 路由 + 分享链接格式。

***

## 六、Workstream C：文档与 spec 同步

### C1. 更新 `.trae/specs/build-dreamgate/tasks.md`

* 10.1 EdgeOne 部署配置 → ✅（配置就绪，待用户部署）。

* 10.2 Vercel → 标注「延后（用户选定 EdgeOne 为主）」。

* 10.3 资源优化 → 标注「可选 manualChunks；439KB gzip 演示可接受，**P0 缩减待用户确认**」。

* 10.4/10.5/10.6 → 标注「待用户部署后验证」。

### C2. 更新 `docs/开发记录.md` + spec 回写

* 里程碑 M10 状态 + Task 10 详情（EdgeOne + Edge AI + HashRouter + SVG 四项决策）。

* 技术选型表补 Edge AI 决策行；重大问题章节补「EdgeOne 三处不兼容」；变更管理补 HashRouter + Edge AI 两项变更。

* **spec 回写**：在 `spec.md` AI 集成段补注「部署态主用 EdgeOne 内置 Edge AI（DeepSeek-V3，零 Key，OpenAI 兼容）；SiliconFlow 保留为 Vercel 备用后端」，消除 spec 与实现的偏离。

***

## 七、风险与缓解（v2 新增）

| 风险                                  | 等级 | 缓解                                                  |
| ----------------------------------- | -- | --------------------------------------------------- |
| Edge AI 50次/天限额，demo 耗尽             | 中  | 超限返 503 → 前端 `ruleParser` 自动降级，功能不中断；部署指南提示         |
| Edge AI 返回形态非预期                     | 低  | 防御性提取（3 形态）+ ruleParser 兜底；已核实 OpenAI 兼容            |
| `AI` undefined（本地/非 EdgeOne）        | 中  | B1 显式守卫返 503；本地 dev 走 ruleParser                    |
| SVG TextureLoader 渲染异常              | 中  | A1 强制 `width/height` 属性                             |
| EdgeOne 构建环境 npm install ECONNRESET | 低  | 可选 `.npmrc` npmmirror；EdgeOne 国内环境大概率 OK            |
| 两套边缘函数输出不一致                         | 低  | 共用同一 `SYSTEM_PROMPT`；demo 主用 Edge AI                |
| HashRouter URL 含 `/#/` 影响美观         | 低  | 演示可接受；分享链接仍可用                                       |
| 本地 dev 测不了 AI 端到端                   | 中  | `edgeone pages dev` 联调 或 部署后验证；本地 dev 自动 ruleParser |

***

## 八、执行编排（时间与资源，v2 新增）

依 §4.8 Sub-Agent 编排经济学教训：

* **可并行（Sub-Agent，隔离新文件）**：

  * 流 A（`scripts/gen-seeds.mjs` + `public/seeds/*` + `seedLibrary.ts` + `seedDreams.ts`）— seedLibrary/seedDreams 非共享（仅 Task 9 触过），Sub-Agent 可做。

  * B1（`edge-functions/api/llm.ts` 新建）+ B2（`edgeone.json` 新建）— 隔离新文件，Sub-Agent 可做。

* **主 Agent 串行（共享文件，按 §4.8 收归主 Agent）**：

  * B3（`App.tsx` + `shareUtils.ts` — 共享路由根）。

* **串行收尾（依赖 A+B 完成）**：

  * C（tasks.md + 开发记录.md + spec.md 回写）。

  * B5（`docs/部署指南.md`）可并行于 C。

* **验证**：A5/B6 各自 tsc+build；C 完成后整体验证。

预估：A ≈ 1 轮 Sub-Agent；B1+B2 ≈ 1 轮 Sub-Agent；B3 + C + B5 主 Agent 收尾。整体可在主 Agent 编排下 2 轮并行 + 1 轮收尾完成。

***

## 九、验证（端到端）

1. `npm run check` → EXIT\_CODE=0。
2. `npm run build` → 成功产出 `dist/`，无类型错误。
3. `npm run dev` 手动验证（本地，AI 走 ruleParser 降级）：

   * `/` 镜之门 → `/#/gallery`（5 扇门 SVG 图不裂图，种子自动加载）。

   * `/#/dream/seed-1`（SVG 图 + 情绪/符号解析）。

   * 生成分享链接 → 新隐身窗口打开 → 只读卡正常（验证 HashRouter + `?d=`）。

   * `/#/report`（跨梦模式可见）。
4. 用户侧（AI 端到端）：`edgeone pages dev` 本地联调 `/api/llm` → EdgeOne 控制台部署 → 访问 EdgeOne URL 全流程 + AI 解析验证。

***

## 十、不在本计划范围（延后，含 P0 缩减说明）

* **Task 10.3 资源优化**：v1 直接延后；v2 提供可选 manualChunks（`three`/`react` 分 vendor chunk），但因 439KB gzip 演示可接受，默认不启用，**标注为 P0 缩减项待用户确认**。

* Task 10.2 Vercel 兜底（用户选 EdgeOne 为主）。

* Bundle code-split / three.js 懒加载（留作后续）。

* 真实 Pollinations 种子图（SVG 占位可后期逐张替换）。

* Lighthouse 审计 / 双端性能验证（用户部署后执行）。

* TRAE Session ID 记录与截图（用户 IDE 侧操作）。

