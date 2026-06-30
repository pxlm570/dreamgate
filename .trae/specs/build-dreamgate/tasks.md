# Tasks — DreamGate

> 初赛 MVP 聚焦 P0 闭环，全量 3D + 双端并重，AI 零成本国内可用接入（Pollinations + SiliconFlow + 种子库）。
> 实现阶段使用 `web-dev` skill，无依赖任务可并行委派 Sub-Agent。
> **TRAE 合规**：每 Task 开独立 TRAE 对话，双击头像复制 Session ID 记录到 `trae-sessions.md`，关键步骤截图存 `docs/screenshots/`。
> **赛道**：生活娱乐（Demo 帖与报名帖标签一致）。
> **第 12 天（7.11）降级自检**：保 P0 闭环优先。

## P0 — 初赛 MVP（16 天必做）

- [ ] Task 0: 报名与 TRAE 合规基建（先行，并行启动）
  - [x] 0.1 撰写报名创意提案帖文案（生活娱乐赛道，描述 DreamGate 创意/痛点/价值）→ `docs/报名创意提案帖文案.md`
  - [ ] 0.2 用户发到 TRAE 社区报名专区，等审核通过（**待用户操作**）
  - [x] 0.3 创建 `trae-sessions.md`（记录每 Task Session ID）+ `docs/screenshots/` 目录
  - [x] 0.4 确认 TRAE IDE + web-dev skill 可用

- [x] Task 1: 项目初始化与基础架构
  - [x] 1.1 Vite + React + TypeScript 脚手架与目录结构
  - [x] 1.2 安装依赖：three、@react-three/fiber、@react-three/drei、gsap+ScrollTrigger、lenis、tailwindcss、framer-motion、zustand、idb、html-to-image
  - [x] 1.3 边缘函数代理层（腾讯云 EdgeOne Pages Edge Functions）：`/api/llm`（SiliconFlow Qwen2.5-7B，藏 Key）+ `/api/img`（可选图像代理）→ `api/llm.ts`
  - [x] 1.4 AI 接入封装：Pollinations 图像直连（prompt 模板 + 美学预设关键词 + seed）+ SiliconFlow 解析调用 → `src/lib/ai.ts`
  - [x] 1.5 预生成美学种子库（4 预设 × 5 情绪 = 20 张占位图，按预设×情绪检索，存 `public/seeds/`）→ `src/lib/seedLibrary.ts`（路径占位，真图 Task 9 补）
  - [x] 1.6 IndexedDB 存储层（按附录 A schema：dreams/meta/inspirations CRUD）→ `src/lib/db.ts`
  - [x] 1.7 情绪词库（附录 B ~24 词）+ 符号库（附录 C ~20 符号）+ 美学预设规范（附录 D）常量 → `emotions.ts`/`symbols.ts`/`aestheticPresets.ts`
  - [x] 1.8 全局状态（Zustand）与路由：开场 → 画廊 → 录入 → 报告 → 梦池 → 分享 → `src/store/useDreamStore.ts` + `src/App.tsx`
  - [x] 1.9 全局视觉系统：深色基调、字体、配色 token、雾/粒子公共组件、CSS 色调滤镜 → `index.css`/`tailwind.config.js`/`index.html`/`Atmosphere/*`/`ui/*`
  - [x] 1.10 离线保底：AI 全失败检测 + 种子库占位 + 规则关键词解析降级 + UI"离线模式"标注 → `src/lib/ai.ts` + `ruleParser.ts`
  - [x] 1.11 降级开关配置（env/全局 flag）：移动端2.5D开关 / 3D分享卡开关 / 雾效着色器开关 → `src/lib/degradation.ts` + `.env.example`

- [x] Task 2: 沉浸式镜之门开场（全量 3D）
  - [x] 2.1 Three.js 镜面 + 环境雾效 + 微光粒子场景
  - [x] 2.2 "踏入梦境"提示与点击/滚动触发
  - [x] 2.3 碎镜转场动画（GSAP 时间线 + 碎片物理）
  - [x] 2.4 相机穿过镜框转场到主界面
  - [x] 2.5 性能降级：WebGL 不可用时降级为 CSS 碎片转场
  - [ ] 2.6 截图存 `docs/screenshots/task2-mirror-gate.png`（**待用户截图**：访问 http://localhost:5173/ 截取镜之门 → 画廊转场）

- [x] Task 3: 低摩擦梦境录入
  - [x] 3.1 录入面板 UI（大文本框 + 细粒度情绪选择器[映射附录B] + 颜色 + 标签）
  - [x] 3.2 Web Speech API 语音转写（不支持则隐藏）
  - [x] 3.3 IndexedDB 即时保存（原文先存，AI 失败不丢）
  - [x] 3.4 元数据可选不阻塞保存
  - [ ] 3.5 截图存 `docs/screenshots/task3-record.png`（**待用户截图**：访问 http://localhost:5173/record 截取录入面板）

- [x] Task 4: AI 梦境藏品生成
  - [x] 4.1 首次美学预设选择引导（Ethereal/Dark Fantasy/Mystical/Psychedelic，按附录D）
  - [x] 4.2 Prompt 模板拼装器（[Subject]+[Action]+[Environment]+[Preset]+[Atmosphere] + dreamlike 关键词 + seed）
  - [x] 4.3 调用 Pollinations flux 生成梦境插画 + CSS 色调滤镜统一画廊
  - [x] 4.4 SiliconFlow 情绪解析（细粒度情绪词映射附录B + 强度 + 基调）经 `/api/llm`
  - [x] 4.5 SiliconFlow 符号概率地图解读（映射附录C + 可能性 framing + 免责）
  - [x] 4.6 异步渐进式呈现（图先/解析后）
  - [x] 4.7 失败兜底：图像→种子库匹配；解析→规则关键词降级（仍映射附录B/C）
  - [ ] 4.8 截图存 `docs/screenshots/task4-first-artifact.png`（**待用户截图**：录入梦境后到 /dream/:id 截取生成过程）

- [x] Task 5: 3D 走廊画廊（全量 3D + 双端 + 降级开关）
  - [x] 5.1 桌面端走廊场景 + 相机滚动路径（Lenis + GSAP ScrollTrigger scrub）
  - [x] 5.2 梦境门动态生成（按 IndexedDB 数据）+ 情绪氛围灯光
  - [x] 5.3 门前高亮 + 标题/情绪标签展示
  - [x] 5.4 进入梦境房间沉浸视图（大图 + 解析 + 氛围粒子）— Task 4 DreamRoomPage 已实现
  - [x] 5.5 雾效着色器（按梦境情绪调色，可被降级开关关闭改 CSS 渐变雾）
  - [x] 5.6 移动端 2.5D 视差画廊降级（CSS 3D + GSAP + 粒子，30fps+）
  - [x] 5.7 空状态引导录入
  - [x] 5.8 降级开关：桌面端也可一键降 2.5D（第12天自检用）
  - [ ] 5.9 截图存 `docs/screenshots/task5-corridor.png`（**待用户截图**）

- [x] Task 6: 梦境卡片分享（3D 可定制 + 降级开关）
  - [x] 6.1 3D 可定制卡片编辑器（边框/字体/背景氛围）
  - [x] 6.2 实时预览 + 图片导出（html-to-image）
  - [x] 6.3 带参分享链接生成 + 只读查看页
  - [x] 6.4 降级开关：3 套预设静态模板卡片（第12天自检用，仍可导出图+链接）

- [x] Task 7: 情绪追踪与 streak
  - [x] 7.1 streak 计数逻辑（断签不惩罚 + 补卡）
  - [x] 7.2 情绪日历热力图（按情绪着色）
  - [x] 7.3 情绪分布可视化

- [x] Task 8: 隐私与 AI 同意
  - [x] 8.1 首次 AI 生成同意弹窗（说明数据外发 + 可拒绝纯本地）— Task 4 AiConsentDialog 已实现
  - [x] 8.2 一键导出 JSON
  - [x] 8.3 全站免责声明（娱乐/自省，非医疗诊断）

- [x] Task 9: 演示种子数据（含跨梦模式）
  - [x] 9.1 预置 5 个精选示例梦境（含已生成藏品：图+情绪+符号解析）→ `src/data/seedDreams.ts`
  - [x] 9.2 故意设计跨梦模式（3 个梦均含「水」符号 + 焦虑/无力负面情绪；另设飞翔/坠落对比组）以触发潜意识报告演示 → `SEED_PATTERNS`
  - [x] 9.3 首次进入加载示例，画廊即丰满 → `GalleryPage` useEffect 自动加载 + localStorage 守卫
  - [x] 9.4 「清空示例梦境」按钮 → `SeedDataPanel`（带二次确认）

- [-] Task 10: 部署上线可体验（国内托管优先）
  - [-] 10.1 腾讯云 EdgeOne Pages 静态构建 + 边缘函数部署，可在线访问 — 🟡 配置就绪（edge-functions/api/llm.ts + ping.ts + edgeone.json + .npmrc + HashRouter + 20 SVG 种子图），待用户部署后转 ✅
  - [ ] 10.2 Vercel 兜底备选部署（双链接备份）— 延后（用户选定 EdgeOne 为主；api/llm.ts SiliconFlow 版保留备用）
  - [ ] 10.3 资源优化（模型/纹理按需加载、图像懒加载）— 可选 manualChunks；439KB gzip 演示可接受，**P0 缩减待用户确认**
  - [-] 10.4 桌面端 + 移动端双端验证（3D 与 2.5D 路径）— 🟡 待用户部署后验证
  - [-] 10.5 性能审计（Lighthouse，桌面 3D 30fps+、移动 2.5D 30fps+）— 🟡 待用户部署后验证
  - [-] 10.6 国内访问连通性验证（EdgeOne 主链接 + Vercel 备链接）— 🟡 待用户部署后验证

- [ ] Task 11: 第 12 天降级自检
  - [ ] 11.1 评估 P0 核心（镜门/录入/AI藏品/画廊/分享/部署）稳定性
  - [ ] 11.2 不达标项触发降级开关（移动2.5D/3D分享卡/雾效着色器）
  - [ ] 11.3 记录取舍决策到 `docs/degradation-decisions.md`

- [ ] Task 12: 初赛 Demo 帖准备
  - [ ] 12.1 录制演示视频/GIF（镜门→录入→生成→画廊→分享→报告核心流，双端各一版）
  - [ ] 12.2 撰写 Demo 帖文案（创意来源、AI 价值、TRAE 实践过程叙述、≥3 Session ID、≥3 截图、可体验链接、降级取舍说明）
  - [ ] 12.3 发帖到 TRAE 社区初赛专区（带 `生活娱乐` 标签 + 报名帖链接）

## P1 — 初赛加分（时间允许）

- [ ] Task 13: 潜意识周报/月报
  - [ ] 13.1 累积 ≥3 条触发周报逻辑
  - [ ] 13.2 主题聚类 + 重复符号 + 情绪强度变化 + 模式识别
  - [ ] 13.3 反思提示 + 免责声明 UI
  - [ ] 13.4 演示种子数据支撑报告演示（依赖 Task 9 跨梦模式）
- [ ] Task 14: 共享梦池
  - [ ] 14.1 轻量后端（Supabase）匿名投递表
  - [ ] 14.2 仅上传图+情绪+符号标签（不上传原文）
  - [ ] 14.3 相似度关联（情绪+符号+色调）展示，无点赞无排行
- [ ] Task 15: 创作素材库
  - [ ] 15.1 灵感板收藏 + 备注
  - [ ] 15.2 按情绪/符号/色调/相似图检索

## P2 — 复赛

- [ ] Task 16: 完整社区、原型检测高阶解读（荣格 Shadow/Anima）、多框架解读切换、后端持久化与账号体系、升级豆包/火山引擎真实图像 API

# Task Dependencies

- Task 0 先行（报名 + 合规基建），与 Task 1 并行
- Task 2–9 均依赖 Task 1
- Task 4 依赖 Task 3（录入触发生成）
- Task 5 依赖 Task 4（画廊展示藏品）
- Task 6、7、8 依赖 Task 4
- Task 9 依赖 Task 1、4（示例需含藏品格式）
- Task 10 依赖 Task 2–9 完成
- Task 11 依赖 Task 2–10（第 12 天自检）
- Task 12 依赖 Task 10、11
- Task 13 依赖 Task 4、7、9（跨梦模式）
- Task 14 依赖 Task 4
- Task 15 依赖 Task 4

## 可并行编排
- 前期：Task 0 ∥ Task 1；之后 Task 2（镜门）∥ Task 3（录入）∥ Task 7（追踪 UI）∥ Task 9（种子数据）可并行
- 中期：Task 4 完成后，Task 5（画廊）∥ Task 6（分享）∥ Task 8（隐私）可并行
- P1 三任务（13/14/15）彼此独立，可并行

## TRAE 合规留痕要求（贯穿全程）
- 每 Task 开独立 TRAE 对话，首条说明 Task 编号与目标
- 完成后双击会话头像复制 Session ID → 记录到 `trae-sessions.md`（格式：`| Task X | session-id | 日期 | 关键产出 |`）
- 关键里程碑截图存 `docs/screenshots/`（至少：镜门/首张AI藏品/3D走廊/分享卡/部署成功，≥5 张）
- 最终 Demo 帖附 ≥3 Session ID + ≥3 截图 + TRAE 实践过程叙述
