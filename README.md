<div align="center">

# 梦阈 · DreamGate

### 将转瞬即逝的梦境，沉淀为可逛、可追踪、可分享的个人潜意识档案馆

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-000000?logo=three.js&logoColor=white)](https://threejs.org)
[![TRAE 大赛](https://img.shields.io/badge/TRAE%20AI%20创造力大赛-参赛作品-FF6B35)](https://www.trae.ai)

**镜之门 → 梦境录入 → AI 藏品生成 → 3D 走廊画廊 → 卡片分享 → 情绪追踪**

</div>

---

## 📖 项目简介

**梦阈 DreamGate** 是一款面向自我探索者的「个人潜意识档案馆」Web App。它将碎片化、易遗忘的梦境转化为可累积、可检索、可解析的视觉化档案，建立通用 AI 无法替代的**四重壁垒**：

- 🧱 **累积性** — 数据越用越有价值，梦境档案随时间沉淀
- 🎨 **一致性** — AI 统一美学风格锁定，画廊视觉协调
- 🌊 **沉浸性** — 3D 走廊画廊 + 雾效粒子，可逛可游
- 🔗 **社区性** — 去社交化共享梦池，相似度关联

> 区别于通用大模型的「一次性解析」，DreamGate 提供纵向跨梦模式识别与沉浸式浏览体验。

---

## ✨ 核心功能

| # | 功能 | 说明 | 降级策略 |
|---|------|------|----------|
| 1 | **镜之门开场** | Three.js 碎镜传送门转场，镜面碎裂 + 雾气扩散 + 相机推进 | WebGL 不可用 → CSS 碎片转场 |
| 2 | **低摩擦梦境录入** | 文字 / 语音 60 秒捕获 + 情绪/颜色/标签元数据 | 语音不支持 → 隐藏按钮 |
| 3 | **AI 梦境藏品生成** | Pollinations 统一美学图像 + Edge AI 情绪/符号解析 | 图像失败 → 种子库占位；解析失败 → 规则降级 |
| 4 | **3D 走廊画廊** | R3F 滚动驱动相机漂移 + 梦境门 + 情绪色光 | 移动端 → 2.5D 视差画廊 |
| 5 | **梦境卡片分享** | 3D 可定制卡片编辑器 + html-to-image 导出 + 分享链接 | 工期不达标 → 3 套预设模板 |
| 6 | **情绪追踪** | streak 连续天数 + 30 天热力图 + 4 维度分布 | — |
| 7 | **隐私本地优先** | IndexedDB 存储 + AI 显式同意 + JSON 一键导出 | — |
| 8 | **演示种子数据** | 5 个精选示例梦境（含跨梦模式：水 ×3 + 飞翔/坠落对比） | 可一键清空 |

---

## 🛠 技术栈

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 构建工具 | Vite | 6.x | 极速 HMR + TS 原生支持 + 生产构建优化 |
| 框架 | React + TypeScript | 18 + 5.8 | 类型安全 + 生态丰富 + 组件化 |
| 3D 渲染 | @react-three/fiber + drei + three | 8.17 / 9.114 / 0.169 | 声明式 3D + React 集成 + 高级材质 |
| 动画 | GSAP + Framer Motion | 3.12 / 11.11 | ScrollTrigger 滚动驱动 + 组件动画 |
| 平滑滚动 | Lenis | 1.1.18 | 轻量 + 与 GSAP ScrollTrigger 联动 |
| 样式 | TailwindCSS | 3.4 | 原子化 CSS + 暗色主题友好 |
| 状态 | Zustand | 5.0 | 轻量 + 无 Provider + IndexedDB 同步简单 |
| 存储 | IndexedDB (idb) | 8.0 | 纯前端 + 大容量 + 结构化存储 |
| 图像导出 | html-to-image | 1.11 | DOM 转 PNG + 分享卡导出 |
| AI 图像 | Pollinations.ai flux | — | 零成本 + 无 Key + URL 直连 |
| AI 解析 | EdgeOne Edge AI (DeepSeek-V3) | — | 零 Key + OpenAI 兼容 + 50 次/天 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9（或 pnpm / yarn 等价）

### 安装与本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/pxlm570/dreamgate.git
cd dreamgate

# 2. 安装依赖（国内推荐用淘宝镜像加速）
npm install --registry=https://registry.npmmirror.com

# 3. 启动开发服务器
npm run dev
```

访问 **http://localhost:5173** 即可体验。

### 生产构建与预览

```bash
# 构建生产版本（tsc 类型检查 + vite build）
npm run build

# 本地预览生产构建产物
npm run preview
```

访问 **http://localhost:4173**（vite preview 默认端口）。

### 常用脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器（HMR 热更新） |
| `npm run build` | 生产构建（tsc + vite build） |
| `npm run preview` | 预览生产构建 |
| `npm run check` | TypeScript 类型检查（不产出文件） |
| `npm run lint` | ESLint 代码检查 |

---

## 📁 项目结构

```
dreamgate/
├── src/
│   ├── components/
│   │   ├── Gate/           # 镜之门 3D 开场（MirrorGate + 碎镜转场）
│   │   ├── Record/         # 梦境录入（表单 + 语音 + 情绪选择器）
│   │   ├── Generation/     # AI 藏品生成（编排 + 同意 + 渐进式呈现）
│   │   ├── Gallery/        # 3D 走廊画廊（CorridorScene + DreamDoor + 2.5D 降级）
│   │   ├── Share/          # 卡片分享（3D 编辑器 + 导出 + 分享链接）
│   │   ├── Tracking/       # 情绪追踪（streak + 热力图 + 分布图）
│   │   ├── Privacy/        # 隐私与导出（免责页脚 + modal + JSON 导出）
│   │   ├── SeedData/       # 演示种子数据面板
│   │   ├── Atmosphere/     # 氛围层（雾 + 粒子 + 颗粒overlay）
│   │   └── ui/             # 基础 UI（Button + Backdrop + Typography）
│   ├── lib/                # 纯逻辑层（types/emotions/symbols/ai/db/ruleParser...）
│   ├── store/              # Zustand 全局状态（useDreamStore）
│   ├── pages/              # 7 个路由页面
│   ├── data/               # 种子梦境数据（5 个示例 + 跨梦模式）
│   └── App.tsx             # HashRouter 路由根
├── edge-functions/api/     # EdgeOne 边缘函数（llm.ts + ping.ts）
├── api/llm.ts              # Vercel 备用边缘函数（SiliconFlow）
├── public/seeds/           # 20 张 SVG 种子占位图（4 预设 × 5 情绪）
├── scripts/gen-seeds.mjs   # SVG 种子图生成脚本
├── docs/                   # 开发文档（部署指南 + 开发记录 + 报名文案）
└── edgeone.json            # EdgeOne Pages 构建配置
```

### 架构要点

1. **纯逻辑层与 UI 层分离** — `src/lib/*` 无 React 依赖，确保逻辑稳定可测
2. **Zustand + IndexedDB 自动同步** — UI 只操作 store，store 内部写 IndexedDB
3. **AI 接入三层兜底** — Pollinations/Edge AI → 种子库/ruleParser → 默认值
4. **降级开关双层设计** — 编译期 `VITE_DEGRADE_*` + 运行时不可逆触发

---

## 🌐 部署

### EdgeOne Pages（主，国内 CDN 加速）

详见 **[docs/部署指南.md](docs/部署指南.md)**。核心步骤：

1. 推送代码到 GitHub
2. EdgeOne Pages 控制台导入仓库
3. 自动识别 Vite + edge-functions，零 Key 部署
4. 获取 `xxx.edgeone.app` 域名

### Vercel（备，国际访问兜底）

1. 导入 GitHub 仓库到 Vercel
2. 配置环境变量 `SILICONFLOW_API_KEY`（[硅基流动](https://siliconflow.cn)免费获取）
3. Vercel 自动识别 `api/` 为 Serverless Functions

---

## 📋 TRAE 大赛合规留痕

本项目全程使用 **TRAE IDE + web-dev skill** 编写，分阶段对话留痕：

| 留痕文件 | 说明 |
|----------|------|
| [trae-sessions.md](trae-sessions.md) | TRAE 对话 Session ID 记录 |
| [docs/开发记录.md](docs/开发记录.md) | 10 个 Task 完整开发记录与决策 |
| [.trae/specs/build-dreamgate/spec.md](.trae/specs/build-dreamgate/spec.md) | 产品 Spec 文档（v3） |
| [.trae/specs/build-dreamgate/tasks.md](.trae/specs/build-dreamgate/tasks.md) | 任务清单与状态 |
| [docs/screenshots/](docs/screenshots/) | 关键里程碑截图 |

---

## 🔒 隐私与数据

- **本地优先**：所有梦境数据存储在浏览器 IndexedDB，不上传服务器
- **AI 显式同意**：首次触发 AI 生成时弹窗说明，可拒绝则纯本地保存
- **一键导出**：支持单梦 / 全部梦境 JSON 导出
- **免责声明**：娱乐与自省用途，非医疗诊断

---

## 📄 License

MIT © 2026 DreamGate

---

<div align="center">

**梦境是潜意识的入口。在梦阈，每一次沉睡都是一次归档。**

</div>
