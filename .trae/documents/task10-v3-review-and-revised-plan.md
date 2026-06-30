# Task 10 实施计划（修订版 v3 — 六维审查修订）

> **版本**：v3，在 v2 基础上经六维审查（完整性/逻辑性/可行性/时间/资源/风险）修订。
> **v2 原文**：`.trae/documents/task10-edgeone-deploy-and-seed-svgs.md`（保留作参考）。
> **change-id**：build-dreamgate
> **模式**：部署 + 资源补全 + 路由适配（多文件，含共享文件改动）
> **语言**：中文

---

## 一、本次审查结论

v2 整体质量已较高（v1→v2 修了 11 项），三 Workstream 结构、HashRouter 选择、Sub-Agent 编排均成立且经代码核实。v3 在 v2 基础上再修 **12 项**，集中在四个方面：

1. **验证深度不足**：A5/B6 只验 2D `<img>` 渲染，未验 three.js TextureLoader 实际纹理加载（真实风险点）。
2. **状态语义模糊**：10.1 标 ✅ 但实际仅"配置就绪"，与 10.4/10.5/10.6"待验证"冲突。
3. **可行性假设未核实**：Edge AI 调用 API 形态（`AI.chatCompletions`）、`nodeVersion`、模型名均未运行时验证，且 AI 调用无 try/catch 兜底。
4. **风险章节缺 3 项关键风险**：Edge AI API 形态不符、SVG 纹理未验证、HashRouter 社交预览失效。

v2 保留不变的部分（经核实仍成立）：三 Workstream 结构、HashRouter 选择（优于 rewrites）、tsconfig include 分析、防御性 content 提取、复用 SYSTEM_PROMPT、保留 api/llm.ts 作 Vercel 备用、Sub-Agent 文件隔离编排。

---

## 二、v2→v3 修订要点（12 项）

| # | 维度 | v2 问题 | v3 修订 |
|---|------|---------|---------|
| 1 | 完整性 | A5 验证只看 2D `<img>` 不裂图，未验 three.js TextureLoader 实际纹理加载（走廊门贴图） | A5 新增"3D 纹理验证"步骤：DevTools Network 确认 SVG 请求 200 + Canvas 检查门贴图非黑色 |
| 2 | 完整性 | C1 把 10.1 标 ✅，但 Task 10.1 要求"可在线访问"，实际仅配置就绪 | C1 改为：10.1 标 🟡（配置就绪，待用户部署后转 ✅）；新增"配置就绪"与"部署完成"二级状态语义 |
| 3 | 完整性 | A3 改 seedLibrary.ts 路径但未提头注释（line 5-6 写 `.jpg` + "Task 9 补真图"）将过时 | A3 增补：同步更新头注释 `.jpg`→`.svg`、"Task 9 补"→"Task 10 补" |
| 4 | 完整性 | A1 gen-seeds.mjs 未提 `public/seeds/` 目录创建，目录不存在则 writeFile 失败 | A1 明确：脚本首行 `fs.mkdirSync('public/seeds', {recursive: true})` |
| 5 | 逻辑性 | C1 中 10.1 ✅ 与 10.4/10.5/10.6"待验证"状态语义冲突 | 统一状态语义：✅=完成且验证 / 🟡=代码就绪待部署验证 / ⏳=待启动；10.1/10.4/10.5/10.6 均按此标注 |
| 6 | 逻辑性 | B5 标"可并行于 C"却又列"主 Agent 串行收尾"，自相矛盾 | 明确：B5（`docs/部署指南.md` 新建隔离文件）改由 Sub-Agent 并行于 C；主 Agent 收尾仅 C（共享 spec/记录文件） |
| 7 | 可行性 | B1 假设 `AI.chatCompletions({model,messages,stream})` 调用形态，未运行时验证 | B1 增补：AI 调用包裹 try/catch，形态不符返 502（前端降级）；新增风险项 + 实现时先用最小 ping 验证 |
| 8 | 可行性 | B2 `nodeVersion: "20.18.0"` 未核实 EdgeOne 支持 | B2 改为：优先不指定 nodeVersion（用 EdgeOne 默认），若需指定则 18.x（最稳）；部署指南提示按控制台报错调整 |
| 9 | 风险 | 缺"Edge AI 调用 API 形态与计划假设不符"风险 | 新增风险项（高）：实现时先写 `edge-functions/api/ping.ts` 最小验证 `AI` binding 形态，再写完整 llm.ts |
| 10 | 风险 | 缺"SVG 在 three.js TextureLoader 实际渲染未验证"风险 | 新增风险项（中）：A5 必须验 3D 门纹理；若失败，回退方案——SVG 转 PNG base64 dataURL 喂 TextureLoader |
| 11 | 风险 | 缺"HashRouter 分享链接社交平台预览失效"风险 | 新增风险项（低）：社交平台可能剥离 `#` fragment；缓解——演示用直接访问 + 导出 PNG 卡片代替链接预览 |
| 12 | 完整性 | B5 部署指南用 `! npm i -g edgeone`（`!` 是 Trae IDE 约定，不适合外部 docs） | B5 改为纯命令 `npm i -g edgeone`（docs 读者不一定用 Trae） |

---

## 三、审查发现详情（六维）

### 3.1 完整性

**已核实成立**（经代码验证）：
- `seedDreams.ts` 确为 5 处 imageUrl（line 25/47/69/91/113），seed-5 复用 `dark-fantasy-anxious`，与 v2 A4 一致。
- HashRouter 改造面经全代码库 grep 确认仅 2 处：`App.tsx:2`（BrowserRouter import）+ `shareUtils.ts:72`（`window.location.origin`）。其余 `useNavigate`/`useParams`/`useSearchParams`/`<Link to>` 在 HashRouter 下透明工作（react-router v7）。
- `seedLibrary.ts` 确有 `PRESET_SLUGS`（line 21-26）+ `SEED_LIBRARY` 20 条 `.jpg` 路径。
- `api/llm.ts:212` 确为 `handler(req: Request)`，`:262` `export const onRequest = handler`（签名不匹配）。
- `ai.ts:66` `fetch('/api/llm')`，`:163` catch → ruleParser 降级链路成立。
- `tsconfig.json` include = `["src","api"]`，`edge-functions/` 不被 tsc 编译。

**v3 修订**（4 项，见上表 #1/3/4/12）：3D 纹理验证、头注释同步、mkdir、`!` 前缀。

### 3.2 逻辑性

**已核实成立**：三 Workstream 逻辑清晰；HashRouter 优于 rewrites（EdgeOne rewrites 不支持 SPA fallback）经官方文档核实；防御性 content 提取覆盖 3 形态。

**v3 修订**（2 项，见上表 #5/6）：状态语义统一、B5/C 并行矛盾消除。

### 3.3 可行性

**已核实成立**：
- `react-router-dom ^7.3.0` 仍导出 HashRouter，`<Router><Routes>` 组件式用法兼容。
- `SharePage.tsx:30` `useSearchParams()` 在 HashRouter 下读 hash 中 `?` 后部分，`search.toString()` 仍返回 `d=xxx`，`readShareDataFromQuery` 透明工作。
- vite 无 base、无 code-split（1.5MB/439KB gzip），演示可接受。
- 降级链路：edge function 返 503 → `ai.ts:72` `!res.ok` throw → `:163` catch → ruleParser。

**v3 修订**（2 项，见上表 #7/8）：AI 调用 try/catch 兜底、nodeVersion 谨慎处理。

### 3.4 时间安排

v2 的 "2 轮并行 + 1 轮收尾" 结构合理。v3 补绝对估计：
- 流 A（Sub-Agent）：~3-5 分钟（写脚本 + 跑生成 + 改 2 文件）
- B1+B2（Sub-Agent）：~4-6 分钟（写 edge function + 配置 + ping 验证）
- B3（主 Agent）：~1-2 分钟（2 处精确 Edit）
- 集成验证：~2-3 分钟（tsc + build + dev 手动验）
- C + B5（并行）：~3-5 分钟（文档同步）
- **总计**：~10-15 分钟（并行编排下）

### 3.5 资源分配

**已核实成立**：Sub-Agent 文件隔离（流 A vs B1/B2 无重叠）；共享文件（App.tsx/shareUtils.ts）收归主 Agent（依 §4.8）；npm check/build 由主 Agent 统一跑（避免 dist/ + .tsbuildinfo 并发写冲突）。

**v3 修订**（1 项，见上表 #6）：B5 改 Sub-Agent 并行于 C，进一步压缩收尾时间。

### 3.6 风险评估

v2 的 8 项风险均成立。v3 新增 3 项关键风险（见上表 #9/10/11），风险表扩至 11 项。

---

## 四、修订版完整计划（v3）

### 四-1. Context

（同 v2 第一节，无变化。）

Task 1-9 已完成（tsc 零错误，生产构建通过）。Task 10 部署节点有两个必须解决的缺口：

1. **种子图裂图**：Task 9 种子梦境 `artifact.imageUrl` 指向 `/seeds/*.jpg`，但 `public/seeds/` 为空。首次进入自动加载 5 个示例梦境时画廊门和梦境房间显示裂图，破坏 demo 视觉。
2. **EdgeOne 部署三处不兼容**：
   - 边缘函数目录是 `/edge-functions/`，现有 `api/llm.ts`（Vercel 约定）EdgeOne 不识别；
   - `api/llm.ts:262` `export const onRequest = handler` 把 EdgeOne 的 `context` 当 `Request` 用，运行时崩溃；
   - `edgeone.json` 的 `rewrites` 不支持 SPA 路由重写，BrowserRouter 下 `/share/:id` 直接访问 404。

**用户已确认决策**：SVG 占位图 + EdgeOne Pages + EdgeOne 内置 Edge AI（DeepSeek-V3，零 Key）。

**预期结果**：可一键部署到 EdgeOne Pages，演示零配置跑通 AI 解析，种子梦境有 on-brand 占位图不裂图，分享链接可直接访问。

---

### 四-2. 关键约束（已核实，同 v2 第三节）

- `tsconfig.json` include = `["src","api"]` → 新建 `edge-functions/` 不被 tsc 编译，未类型化 `AI` 全局不破坏 `npm run check`/`build`。
- 全代码库仅 `src/components/Share/shareUtils.ts:72` 一处用 `window.location.origin`（grep 确认），HashRouter 改造面极小。
- `src/lib/ai.ts:66` 运行时 `fetch('/api/llm')`；上游失败 `analyzeDream` throw → `generateArtifact`(`ai.ts:163`) catch → `ruleParser` 降级。降级链路成立。
- `api/llm.ts` 不被前端 import，保留作 Vercel 备用不影响 EdgeOne。
- `react-router-dom ^7.3.0`（v7）仍导出 `HashRouter`，组件式 `<Router><Routes>` 用法兼容；`useSearchParams`/`useNavigate`/`useParams`/`<Link to>` 在 HashRouter 下透明工作（经 grep + SharePage.tsx 核实）。
- EdgeOne 内置 Edge AI（`@tx/deepseek-ai/deepseek-v3-0324`）零 Key，OpenAI 兼容，非流式返回 `{choices:[{message:{content}}]}`（**v3 注**：调用 API 形态需实现时验证，见风险项 R9）。
- vite.config 无 `base`、无 code-split（1.5MB / 439KB gzip，演示可接受）。

---

### 四-3. Workstream A：SVG 种子占位图

#### A1. 编写生成器 `scripts/gen-seeds.mjs`（新建）
ESM Node 脚本，参数化生成 20 张 SVG（4 预设 × 5 情绪键）到 `public/seeds/`。

**v3 增补**：脚本首行确保目录存在：
```js
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('public/seeds', { recursive: true });  // v3 #4：目录不存在则创建
```

**配色**（取自 `seedDreams.ts` 各 dream.color + 视觉 token；注：`aestheticPresets.ts` 仅含 cssFilter，无色值，配色实际来源是 seedDreams.ts 的 color 字段 + index.css token）：
- Ethereal：底 `#0a0a14`，辅 `#C9B8E8`/`#E8E0F5`
- Dark Fantasy：底 `#0d0608`，辅 `#EF476F`/`#6A0572`
- Mystical：底 `#0a0814`，辅 `#5A189A`/`#9D4EDD`
- Psychedelic：底 `#0a0a0f`，辅 `#FFD166`/`#06D6A0`/`#EF476F`
- 情绪 orb 色：excited `#FFD166` / anxious `#EF476F` / tender `#FFAFCC` / sad `#4A90E2` / ethereal `#C9B8E8`

**SVG 结构**（每张 `<svg xmlns="..." width="1024" height="1024" viewBox="0 0 1024 1024">`，**强制 width/height 属性**以兼容 three.js TextureLoader）：
1. 深色底 `<rect width="1024" height="1024">`
2. 预设主色大径向渐变（模糊铺底）
3. 2 辅色 + 1 情绪色径向 orb（`feGaussianBlur stdDeviation≈80`，位置由 `(presetIdx,emotionIdx)` 确定性偏移，每张独特但风格一致）
4. `feTurbulence` 颗粒层（~8% 不透明度）
5. 径向暗角 vignette
6. **无文字**（画廊 cssFilter 会叠加）

**文件名**：`{presetSlug}-{emotionKey}.svg`，slug 取自 `seedLibrary.ts` 的 `PRESET_SLUGS`（ethereal/dark-fantasy/mystical/psychedelic），emotionKey: excited/anxious/tender/sad/ethereal。

**注**：seed-1（焦虑）与 seed-5（恐惧）均映射到 `anxious` 键（`恐惧` 属 high-unpleasant 维度），故共用 `dark-fantasy-anxious.svg`，符合 seedDreams.ts 现状。

#### A2. 运行生成
`node scripts/gen-seeds.mjs` → `public/seeds/` 下 20 个 `.svg`。

#### A3. 更新 `src/lib/seedLibrary.ts`
- `SEED_LIBRARY` 20 条路径 `.jpg`→`.svg`（可 `replace_all` `.jpg`→`.svg`，该文件 `.jpg` 仅出现在种子路径）。
- **v3 增补**（#3）：同步更新头注释 line 5-6：
  - `public/seeds/{presetSlug}-{emotionKey}.jpg` → `.svg`
  - `当前阶段先用占位路径（Task 9 补真图）` → `Task 10 已补 SVG 占位图`

#### A4. 更新 `src/data/seedDreams.ts`
**5 处** `imageUrl` 全改 `.jpg`→`.svg`（`:25` dark-fantasy-anxious、`:47` ethereal-anxious、`:69` mystical-sad、`:91` ethereal-excited、`:113` dark-fantasy-anxious 复用）。可 `replace_all` `.jpg`→`.svg`。

#### A5. 验证（v3 强化）
1. `npm run check` + `npm run build` 通过。
2. `npm run dev` 访问 `/#/gallery` 确认 5 扇门 SVG 图渲染（套预设 cssFilter 后氛围统一，不裂图）。
3. **v3 新增**（#1）：**3D 纹理验证**——DevTools Network 确认 20 个 `.svg` 请求均 200；切到 3D 走廊视图，确认 DreamDoor 门贴图非全黑（three.js TextureLoader 实际加载成功）。若门贴图黑：
   - 先确认 SVG 文件 `width/height` 属性存在（A1 强制）；
   - 仍黑则回退方案（见风险 R10）：SVG 转 PNG base64 dataURL 喂 TextureLoader。

---

### 四-4. Workstream B：EdgeOne 部署适配

#### B1. 新建 `edge-functions/api/llm.ts`（EdgeOne 边缘函数，自包含）
- `export async function onRequest(context)` → `const req = context.request`（修复签名）。
- 复用 `api/llm.ts` 的 `SYSTEM_PROMPT`/`extractJSON`/`normalizeAnalysis`/`json`/CORS（**复制**，因 edge-functions/ 独立打包不能 import 项目模块；**v3 注**：两份 helpers 头部互引注释标明同步关系，防漂移）。
- **AI undefined 守卫**：
  ```js
  if (typeof AI === 'undefined' || !AI?.chatCompletions) {
    return json({ error: 'Edge AI unavailable' }, 503);
  }
  ```
- **Edge AI 调用**（零 Key）+ **v3 增补 try/catch**（#7）：
  ```js
  let resp;
  try {
    resp = await AI.chatCompletions({
      model: '@tx/deepseek-ai/deepseek-v3-0324',
      messages, stream: false, temperature: 0.6, max_tokens: 1024,
    });
  } catch (err) {
    // v3：AI binding 形态不符或调用异常 → 502 触发前端降级
    return json({ error: 'AI_CALL_FAILED', detail: String(err) }, 502);
  }
  ```
- 防御性提取 content（兼容 string / `{choices:[{message:{content}}]}` / `Response.text()` 三种形态）。
- 上游失败返 502 → 前端 `ai.ts` 自动 `ruleParser` 降级。
- 可选 `declare const AI: any;` 提升可读性（不入 tsconfig，不影响构建）。

#### B2. 新建 `edgeone.json`（项目根）
**v3 修订**（#8）：谨慎处理 nodeVersion，优先用 EdgeOne 默认：
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```
- 不指定 `nodeVersion`（用 EdgeOne 默认，最稳）；若控制台报 Node 版本错误，再补 `"nodeVersion": "18"`（18.x 兼容性最广，20.x 待 EdgeOne 确认）。
- 可选缓解（若 EdgeOne 构建环境 npm install ECONNRESET）：新增 `.npmrc` 写 `registry=https://registry.npmmirror.com`。

#### B3. SPA 路由改 HashRouter（**共享文件，主 Agent 执行**）
- `src/App.tsx:2`：`BrowserRouter as Router` → `HashRouter as Router`（仅 import）。
- `src/components/Share/shareUtils.ts:72`：`${origin}/share/...` → `${origin}/#/share/...`。
- `SharePage.tsx` 无需改（`useSearchParams` 在 HashRouter 透明，经核实）。
- `index.html` OG 标签静态，HashRouter 不影响社交预览（**v3 注**：见风险 R11，部分平台可能剥离 `#`）。

#### B4. 保留 `api/llm.ts`（Vercel 备用，不删）
仍受 tsconfig 类型检查且通过；作 Vercel 部署时 SiliconFlow 函数。`.env.example` 的 `SILICONFLOW_API_KEY` 保留（仅 Vercel 用）。两套后端共用同一 `SYSTEM_PROMPT`，保证解析 JSON 格式一致；demo 主用 Edge AI。

#### B5. 新建 `docs/部署指南.md`（**v3 改 Sub-Agent 并行**）
**v3 修订**（#6）：从"主 Agent 串行收尾"改为"Sub-Agent 并行于 C"（隔离新文件，符合 §4.8）。

区分「我已准备」与「用户操作」：
- **我已准备**：`edge-functions/api/llm.ts`、`edgeone.json`、HashRouter 适配、SVG 种子图、`.npmrc`（可选）。
- **用户操作（二选一）**：
  - 控制台（推荐）：EdgeOne Pages → 创建项目 → 导入 Git → 框架 Vite → 构建 `npm run build` → 输出 `dist` → 部署（边缘函数从 `/edge-functions` 自动识别）。
  - CLI（**v3 修订 #12**，去掉 `!` 前缀）：`npm i -g edgeone` → `edgeone pages dev`（本地联调含边缘函数）→ git push 触发构建 或 `edgeone pages deploy`。
- **环境变量**：EdgeOne 无需任何 Key（Edge AI 内置）；可选 `VITE_DEGRADE_*`。
- **限额提示**：Edge AI 50次/天，超限自动降级到本地规则解析（功能不中断，仅解析精度下降）。
- **部署后验证清单**：`/`（镜门）→ `/#/gallery`（种子自动加载+SVG）→ `/#/dream/seed-1` → 生成分享链接 → 新窗口打开只读卡 → `/#/report` → 录入新梦测 AI 解析。
- **v3 增补**：AI binding 形态验证提示——部署后若 `/api/llm` 返 502 `AI_CALL_FAILED`，查 EdgeOne 控制台日志确认 `AI` 全局形态，调整 `AI.chatCompletions` 调用。

#### B6. 验证
`npm run check` + `npm run build` 通过；`npm run dev` 验证 HashRouter 路由 + 分享链接格式。

---

### 四-5. Workstream C：文档与 spec 同步（主 Agent 串行）

#### C1. 更新 `.trae/specs/build-dreamgate/tasks.md`（v3 状态语义统一）
**v3 修订**（#2/#5）：统一状态语义——✅=完成且验证 / 🟡=代码就绪待部署验证 / ⏳=待启动：
- 10.1 EdgeOne 部署配置 → 🟡（配置就绪，待用户部署后转 ✅）
- 10.2 Vercel → 标注「延后（用户选定 EdgeOne 为主）」
- 10.3 资源优化 → 标注「可选 manualChunks；439KB gzip 演示可接受，**P0 缩减待用户确认**」
- 10.4/10.5/10.6 → 🟡（待用户部署后验证）

#### C2. 更新 `docs/开发记录.md` + spec 回写
- 里程碑 M10 状态 + Task 10 详情（EdgeOne + Edge AI + HashRouter + SVG 四项决策）。
- 技术选型表补 Edge AI 决策行；重大问题章节补「EdgeOne 三处不兼容」；变更管理补 HashRouter + Edge AI 两项变更。
- **spec 回写**：在 `spec.md` AI 集成段补注「部署态主用 EdgeOne 内置 Edge AI（DeepSeek-V3，零 Key，OpenAI 兼容）；SiliconFlow 保留为 Vercel 备用后端」，消除 spec 与实现的偏离。
- **v3 增补**：开发记录补本次六维审查 + v3 修订记录到变更管理章节。

---

### 四-6. 风险与缓解（v3 扩至 11 项）

| # | 风险 | 等级 | 缓解 |
|---|------|------|------|
| R1 | Edge AI 50次/天限额，demo 耗尽 | 中 | 超限返 503 → 前端 `ruleParser` 自动降级，功能不中断；部署指南提示 |
| R2 | Edge AI 返回形态非预期 | 低 | 防御性提取（3 形态）+ ruleParser 兜底；已核实 OpenAI 兼容 |
| R3 | `AI` undefined（本地/非 EdgeOne） | 中 | B1 显式守卫返 503；本地 dev 走 ruleParser |
| R4 | SVG TextureLoader 渲染异常 | 中 | A1 强制 `width/height` 属性 |
| R5 | EdgeOne 构建环境 npm install ECONNRESET | 低 | 可选 `.npmrc` npmmirror；EdgeOne 国内环境大概率 OK |
| R6 | 两套边缘函数输出不一致 | 低 | 共用同一 `SYSTEM_PROMPT`；demo 主用 Edge AI |
| R7 | HashRouter URL 含 `/#/` 影响美观 | 低 | 演示可接受；分享链接仍可用 |
| R8 | 本地 dev 测不了 AI 端到端 | 中 | `edgeone pages dev` 联调 或 部署后验证；本地 dev 自动 ruleParser |
| **R9**（v3 新增） | **Edge AI 调用 API 形态（`AI.chatCompletions`）与计划假设不符** | **高** | **实现时先写 `edge-functions/api/ping.ts` 最小验证 `AI` binding 形态（`typeof AI`、`Object.keys(AI)`），确认调用 API 后再写完整 llm.ts；B1 已加 try/catch 返 502 触发降级** |
| **R10**（v3 新增） | **SVG 在 three.js TextureLoader 实际渲染未验证（2D img OK ≠ 3D 纹理 OK）** | **中** | **A5 强制验 3D 门贴图；若失败回退：SVG 转 PNG base64 dataURL 喂 TextureLoader（`texture = new THREE.TextureLoader().load('data:image/png;base64,...')`）** |
| **R11**（v3 新增） | **HashRouter 分享链接社交平台预览失效（部分平台剥离 `#` fragment）** | **低** | **演示用直接访问；社交分享用导出 PNG 卡片（ShareActions 已支持）代替链接预览；OG 标签静态兜底** |

---

### 四-7. 执行编排（v3 调整）

依 §4.8 Sub-Agent 编排经济学教训：

- **第 1 轮并行（Sub-Agent，隔离新文件）**：
  - **Sub-Agent A**（流 A）：`scripts/gen-seeds.mjs` + 运行生成 20 SVG 到 `public/seeds/` + 改 `seedLibrary.ts`（含头注释）+ 改 `seedDreams.ts`。
  - **Sub-Agent B**（B1+B2）：先写 `edge-functions/api/ping.ts` 验证 `AI` binding 形态（R9 缓解）→ 写 `edge-functions/api/llm.ts` + `edgeone.json` + `.npmrc`（可选）。
  - **文件范围**：A 触 `{scripts/, public/seeds/, src/lib/seedLibrary.ts, src/data/seedDreams.ts}`；B 触 `{edge-functions/*, edgeone.json, .npmrc}`。无重叠。
  - **均不运行** `npm run check/build`（主 Agent 统一验证，避免 dist/ + .tsbuildinfo 并发写冲突）。

- **第 2 轮主 Agent 串行（共享文件）**：
  - B3（`App.tsx:2` + `shareUtils.ts:72` — 共享路由根，按 §4.8 收归主 Agent）。
  - 集成验证：`npm run check` + `npm run build` + `npm run dev` 手动验（含 A5 的 3D 纹理验证）。

- **第 3 轮并行收尾**：
  - **Sub-Agent C1**（B5）：新建 `docs/部署指南.md`（隔离新文件）。
  - **主 Agent C2**（C）：改 `tasks.md` + `开发记录.md` + `spec.md`（共享 spec/记录文件，按 §4.8 收归主 Agent）。

- **最终验证**：主 Agent 跑整体 `npm run check` + `npm run build`，汇总交付。

**预估**：~10-15 分钟（3 轮编排，第 1/3 轮并行）。

---

### 四-8. 验证（端到端）

1. `npm run check` → EXIT_CODE=0。
2. `npm run build` → 成功产出 `dist/`，无类型错误；确认 `dist/seeds/` 下有 20 个 `.svg`。
3. `npm run dev` 手动验证（本地，AI 走 ruleParser 降级）：
   - `/` 镜之门 → `/#/gallery`（5 扇门 SVG 图不裂图，种子自动加载）。
   - **v3 强制**：切 3D 走廊视图，DevTools Network 确认 `.svg` 请求 200，DreamDoor 门贴图非全黑（R10 验证）。
   - `/#/dream/seed-1`（SVG 图 + 情绪/符号解析）。
   - 生成分享链接 → 新隐身窗口打开 → 只读卡正常（验证 HashRouter + `?d=`）。
   - `/#/report`（跨梦模式可见）。
4. 用户侧（AI 端到端）：`edgeone pages dev` 本地联调 `/api/llm` → EdgeOne 控制台部署 → 访问 EdgeOne URL 全流程 + AI 解析验证。
5. **v3 新增**：部署后访问 `/api/llm`（POST）确认非 502 `AI_CALL_FAILED`（R9 验证）；若 502，查日志调整 `AI.chatCompletions` 调用形态。

---

### 四-9. 不在本计划范围（延后，含 P0 缩减说明）

（同 v2 第十节，无变化。）

- **Task 10.3 资源优化**：v1 直接延后；v2/v3 提供可选 manualChunks（`three`/`react` 分 vendor chunk），但因 439KB gzip 演示可接受，默认不启用，**标注为 P0 缩减项待用户确认**。
- Task 10.2 Vercel 兜底（用户选 EdgeOne 为主）。
- Bundle code-split / three.js 懒加载（留作后续）。
- 真实 Pollinations 种子图（SVG 占位可后期逐张替换）。
- Lighthouse 审计 / 双端性能验证（用户部署后执行）。
- TRAE Session ID 记录与截图（用户 IDE 侧操作）。

---

## 五、Assumptions & Decisions（假设与决策）

**假设**（需实现时验证）：
1. EdgeOne 内置 Edge AI 的调用 API 是 `AI.chatCompletions({model, messages, stream, ...})`（R9 风险点，实现时先 ping 验证）。
2. Edge AI 模型名 `@tx/deepseek-ai/deepseek-v3-0324` 有效（若无效，查 EdgeOne 控制台可用模型列表替换）。
3. EdgeOne Pages 默认 Node 版本兼容 Vite 6 + React 18 构建（若不兼容，补 `nodeVersion`）。
4. three.js TextureLoader 能加载带 `width/height` 属性的 SVG（R10 风险点，A5 强制验证；回退方案 SVG→PNG dataURL）。

**决策**（已定，不再悬而未决）：
1. SVG 占位图（非真实 Pollinations 图）——用户已确认。
2. EdgeOne Pages 为主部署平台——用户已确认。
3. Edge AI（DeepSeek-V3，零 Key）为主 AI 后端——用户已确认。
4. HashRouter（非 rewrites）——EdgeOne rewrites 不支持 SPA fallback，HashRouter 是唯一可行方案。
5. 保留 `api/llm.ts` 作 Vercel 备用——双后端冗余，零成本保留。
6. B5 部署指南改 Sub-Agent 并行——v3 调整，压缩收尾时间。
7. `edgeone.json` 不指定 nodeVersion——v3 调整，用默认最稳。

---

## 六、Verification Steps（验证步骤摘要）

实施完成后，主 Agent 按以下顺序验证：

1. **类型与构建**：`npm run check` EXIT_CODE=0 + `npm run build` 成功 + `dist/seeds/*.svg` 存在 20 个。
2. **2D 渲染**：`npm run dev` → `/#/gallery` 5 扇门 SVG 不裂图。
3. **3D 纹理**（v3 强制）：3D 走廊视图 DreamDoor 门贴图非全黑（DevTools Network `.svg` 200）。
4. **HashRouter**：生成分享链接含 `/#/share/`，新窗口打开只读卡正常。
5. **降级链路**：本地 dev `/api/llm` 404（vite 不服务 edge-functions）→ 前端 ruleParser 降级，功能不中断。
6. **文档同步**：`tasks.md` Task 10 子项状态正确（🟡/延后/待确认）；`开发记录.md` M10 + 决策 + 变更已补；`spec.md` AI 段已回写 Edge AI。
7. **部署指南**：`docs/部署指南.md` 存在且含控制台/CLI 双方式 + 限额提示 + 验证清单。

**用户侧验证**（部署后）：
8. EdgeOne 控制台部署成功，访问 URL 全流程跑通。
9. `/api/llm` POST 返 200（非 502/503），AI 解析生效（R9 最终验证）。
