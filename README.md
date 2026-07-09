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
| 1 | **镜之门开场** | 白大理石拱门立于镜湖，碎镜后门内即真实走廊——相机推过门洞直入美术馆（单一持久 Canvas，零遮罩真连续转场） | WebGL 不可用 → CSS 拱门转场 |
| 2 | **低摩擦梦境录入** | 文字 / 语音 60 秒捕获 + 情绪/颜色/标签元数据 | 语音不支持 → 隐藏按钮 |
| 3 | **AI 梦境藏品生成** | gpt-image / Pollinations 统一美学油画 + 大模型情绪/符号解析，暗房显影仪式呈现 | 图像失败 → 种子库占位；解析失败 → 规则降级 |
| 4 | **3D 走廊画廊** | 逐画驻足运镜 + 美术馆式简介牌 + 入画俯冲进详情 + 跨梦模式识别 | 持续掉帧 → 2.5D 视差画廊 |
| 5 | **梦境卡片分享** | 卡片导出 + 只读分享链接（梦境编码进 URL，接收端无需安装） | — |
| 6 | **潜意识报告** | 跨梦模式识别（重复意象/关联情绪/对比张力）+ streak + 热力图 + 维度分布 | — |
| 7 | **共享梦池** | 匿名漂流瓶 + 符号/情绪相似度共鸣 + 本地投递（概念演示 · 数据仅存本机） | — |
| 8 | **隐私本地优先** | IndexedDB 存储 + AI 显式同意 + JSON 一键导出 | — |
| 9 | **演示种子数据** | 9 个精选示例梦境（跨梦模式：水 ×4 走向和解 + 门 ×3 + 飞翔/坠落对比） | 可一键清空 |

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
| AI 图像 | gpt-image（可选）→ Pollinations.ai flux | — | 前者需部署代理+Key，后者零成本无 Key |
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

启动后按终端提示的本地地址访问即可体验。

### 生产构建与预览

```bash
# 构建生产版本（tsc 类型检查 + vite build）
npm run build

# 本地预览生产构建产物
npm run preview
```

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
│   │   ├── Gate/           # 镜之门场景（拱门+镜湖+碎镜时间线，GateScene 可挂进单世界 Canvas）
│   │   ├── Record/         # 梦境录入（表单 + 语音 + 情绪选择器）
│   │   ├── Generation/     # AI 藏品生成（编排 + 同意 + 暗房显影仪式）
│   │   ├── Gallery/        # 3D 走廊场景（CorridorWorld + DreamDoor 简介牌 + 2.5D 降级）
│   │   ├── Share/          # 卡片分享（3D 编辑器 + 导出 + 分享链接）
│   │   ├── Tracking/       # 情绪追踪 + 跨梦模式（streak + 热力图 + CrossDreamInsights）
│   │   ├── Privacy/        # 隐私与导出（免责页脚 + modal + JSON 导出）
│   │   ├── SeedData/       # 演示种子数据面板
│   │   ├── Atmosphere/     # 氛围层（雾 + 粒子 + 颗粒overlay）
│   │   └── ui/             # 基础 UI（Button + Backdrop + Typography）
│   ├── lib/                # 纯逻辑层（types/emotions/symbols/ai/db/ruleParser/pool...）
│   ├── store/              # Zustand 全局状态（useDreamStore）
│   ├── pages/              # 路由页面（WorldPage 单一持久 Canvas 承载"/"与"/gallery"）
│   ├── data/               # 种子梦境数据（9 个示例 + 跨梦模式；poolDreams 梦池演示数据）
│   └── App.tsx             # HashRouter 路由根
├── edge-functions/api/     # EdgeOne 边缘函数（llm.ts + ping.ts）
├── api/llm.ts              # Vercel 备用边缘函数（SiliconFlow）
├── public/seeds-gen/       # gpt-image 生成的高清种子梦境油画
├── public/textures/        # 场景实体材质（拱门/墙面/地板/天花板/氛围图）
├── docs/                   # 开发文档（部署指南 + 开发记录 + 报名文案）
└── edgeone.json            # EdgeOne Pages 构建配置
```

### 架构要点

1. **纯逻辑层与 UI 层分离** — `src/lib/*` 无 React 依赖，确保逻辑稳定可测
2. **Zustand + IndexedDB 自动同步** — UI 只操作 store，store 内部写 IndexedDB
3. **AI 接入三层兜底** — gpt-image/Pollinations → 种子库/ruleParser → 默认值
4. **降级开关双层设计** — 编译期 `VITE_DEGRADE_*` + 运行时不可逆触发
5. **单一持久 Canvas** — 镜之门与 3D 走廊共享同一 WebGL 上下文，转场是场景组显隐+相机接力，无上下文重建

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
