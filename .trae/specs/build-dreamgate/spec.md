# 梦境档案馆 DreamGate Spec

> 面向 TRAE AI 创造力大赛（初赛 16 天产出可运行 Demo → 复赛完整产品）
> change-id: build-dreamgate
> 创建日期：2026-06-29
> 最近更新：2026-06-29 v3（纳入 赛道=生活娱乐 / 国内托管 / 分阶段对话留痕 / 降级开关 / 数据模型 / 情绪词库 / 符号库 / 美学预设规范 / 用户流程 / 离线保底）

## Why

梦境是潜意识的入口，但转瞬即逝且个体难留痕。通用大模型（豆包/Kimi）只能对单个梦做**一次性解析**，无法累积个人潜意识档案、无法跨梦识别模式、无法提供沉浸浏览体验——即"一句提示词就能替代"的伪需求陷阱。现有梦境 App 要么是图表堆砌无沉浸感，要么纯日记无 AI 深度。

DreamGate 用「AI 统一美学梦境图生成 + 情绪/符号解析 + 3D 沉浸走廊画廊 + 纵向模式识别 + 去社交化共享梦池」，把梦境做成可逛、可追踪、可分享的个人潜意识档案馆，建立通用 AI 无法替代的**累积 + 一致性 + 社区 + 沉浸**四重壁垒。

**赛道归属**：生活娱乐（面向日常生活中的真实需求，探索更便捷、有趣、有温度的生活方式）。Demo 帖与报名帖赛道标签必须一致 = `生活娱乐`。

## What Changes

- 新建 DreamGate Web 应用（个人潜意识档案馆，URL 形态，桌面/移动同站点不同浏览器）
- **沉浸式开场**：Three.js「镜之门」碎镜传送门转场（借鉴 noomo ValenTime）
- **低摩擦梦境录入**：文字/语音 60 秒捕获 + 可选情绪/颜色/标签元数据（借鉴 Daylio/Awoken）
- **AI 梦境藏品生成**：统一美学风格锁定 + 梦境插画 + 情绪解析 + 符号概率地图解读（借鉴 Dream by WOMBO 风格锁定 + Hypnos 概率地图框架）
- **3D 走廊画廊（全量 3D）**：滚动驱动相机漂移，每个梦一个氛围房间，雾效+粒子（借鉴 noomo 走廊房间 + TSL 雾效）；移动端降级 2.5D 视差画廊
- **潜意识报告**：周报/月报，情绪轨迹 + 重复符号 + 模式识别（借鉴 Somni 周报 + Hypnos 纵向洞察）
- **共享梦池**：匿名分享 + 相似度关联，无点赞无排行（借鉴 Cosmos/Are.na 去社交化）
- **梦境卡片分享**：3D 可定制梦境卡 + 一键生成分享链接/图片裂变（借鉴 noomo 3D 心定制器）
- **情绪追踪**：streak + 日历热力图 + 细粒度情绪词（借鉴 Daylio streak + How We Feel 情绪颗粒度）
- **隐私本地优先**：IndexedDB 起步 + AI 解析前显式同意 + 一键导出
- **创作素材库**：梦境图转写作/设计灵感板（P1，差异化实用功能）
- **演示种子数据**：首次进入预置 5 个精选示例梦境（含跨梦模式以演示报告），可一键清空
- **TRAE 合规（硬性要求）**：分阶段对话留痕，全程 TRAE IDE + `web-dev` skill 编写，保留 ≥3 Session ID + ≥3 开发截图
- **降级开关**：第 12 天自检，核心不稳则自动降级移动端 2.5D / 3D 分享卡 / 雾效着色器，保 P0 闭环
- **离线保底**：AI 接入全失败时仍可纯本地记录 + 种子库占位 + 规则解析

## Impact

- 全新项目，无既有代码影响
- **前端技术栈**：React(Vite+TS) + @react-three/fiber + @react-three/drei + three + GSAP ScrollTrigger + Lenis + TailwindCSS + Framer Motion + Zustand + IndexedDB(idb) + html-to-image
- **后端代理**：边缘函数（腾讯云 EdgeOne Pages Edge Functions / 或 Vercel Functions 兜底），`/api/llm` 大模型代理藏 Key
- **AI 接入（初赛零成本 + 国内可用方案）**：
  - 图像：**Pollinations.ai**（flux 模型，URL 式免费无 Key，前端直连；国内不稳时种子库兜底）+ prompt 固化美学 + CSS 色调滤镜统一画廊一致性
  - 大模型：**SiliconFlow 免费模型**（Qwen2.5-7B-Instruct，国内可访问，有免费额度）经边缘函数代理；备选 DeepSeek API（便宜）；升级火山引擎豆包
  - **部署态主用 EdgeOne 内置 Edge AI**（DeepSeek-V3，`@tx/deepseek-ai/deepseek-v3-0324`，零 Key，OpenAI 兼容，50次/天限额，超限 ruleParser 降级）；SiliconFlow 保留为 Vercel 备用后端。Task 10 部署适配回写。
  - 兜底：**预生成美学种子库**（4 预设 × 5 情绪 = 20 张 **SVG 占位图**，Task 10 补）+ **规则关键词解析**降级
  - 升级路径：仅换边缘函数内部实现为豆包/火山引擎 API Key，前端不动
- **部署（国内托管优先）**：腾讯云 EdgeOne Pages（静态 + 边缘函数，国内 CDN 快）为主；Vercel 作为兜底备选（双链接备份）
- **TRAE 合规流程**：分阶段对话留痕——每个 Task 一个独立 TRAE 对话，双击会话头像复制 Session ID 记录到 `trae-sessions.md`，关键步骤截图存 `docs/screenshots/`
- **范围控制**：初赛 P0 闭环，P1 加分，P2 复赛深化；第 12 天降级自检

## ADDED Requirements

### Requirement: 沉浸式镜之门开场
系统 SHALL 提供一个 Three.js 实现的开场「镜之门」体验作为应用入口，用户进入时看到一面镜子，点击/滚动后镜子碎裂成碎片并转场进入梦境档案馆主界面，营造「现实↔梦境」的门槛隐喻。

#### Scenario: 首次进入
- **WHEN** 用户首次打开应用
- **THEN** 显示居中的镜之门，伴随环境雾效与微光粒子，呈现"踏入梦境"提示
- **WHEN** 用户点击或开始滚动
- **THEN** 镜子碎裂动画播放（碎片飞散+雾气扩散），相机穿过镜框转场到主界面

#### Scenario: 性能与降级
- **WHEN** 设备不支持 WebGL 或性能不足
- **THEN** 降级到 CSS 碎片转场，保证流畅

### Requirement: 低摩擦梦境录入
系统 SHALL 提供低摩擦梦境录入流程，支持文字和语音输入，60 秒内可完成一条梦境记录并自动触发 AI 生成，可选元数据不阻塞保存。

#### Scenario: 文字录入
- **WHEN** 用户点击「记录梦境」
- **THEN** 展开录入面板：大文本框 + 情绪选择器（细粒度情绪词，见情绪词库）+ 颜色选择 + 标签
- **WHEN** 用户输入文字后点击生成（即使元数据未填）
- **THEN** 保存草稿并触发 AI 梦境藏品生成流程

#### Scenario: 语音录入
- **WHEN** 用户点击语音按钮
- **THEN** 调用浏览器 Web Speech API 识别转写为文字，填充文本框（不支持时隐藏按钮）

#### Scenario: 数据安全保存
- **WHEN** 录入完成
- **THEN** 梦境原文立即写入 IndexedDB，即使 AI 生成失败原文不丢失

### Requirement: AI 梦境藏品生成
系统 SHALL 为每条梦境生成一件「藏品」，包含统一美学风格的梦境插画、情绪解析、符号概率地图解读，异步返回并渐进式呈现。图像生成走 Pollinations 前端直连 + 种子库兜底，大模型解析走边缘函数代理（SiliconFlow）。

#### Scenario: 统一美学风格
- **WHEN** 用户首次使用
- **THEN** 引导选择一个「梦境美学预设」（Ethereal / Dark Fantasy / Mystical / Psychedelic，规范见美学预设规范），此后所有梦境图遵循该风格
- **WHEN** 生成梦境插画
- **THEN** 使用固定 prompt 模板 `[Subject]+[Action]+[Environment]+[Style Preset 关键词]+[Atmosphere: dreamlike/ethereal/floating]` 调用 Pollinations flux，并叠加 CSS 色调滤镜保证画廊一致性（dreamlike 氛围优先于写实）

#### Scenario: 情绪解析
- **WHEN** AI 解析梦境（SiliconFlow 经 `/api/llm` 代理）
- **THEN** 返回细粒度情绪词（映射到情绪词库）+ 情绪强度(0-1) + 情绪基调标签
- **AND** 情绪基调权重高于符号解读

#### Scenario: 符号概率地图
- **WHEN** AI 识别梦境符号
- **THEN** 以「可能性」而非「断言」呈现，标注"概率地图，需结合自身语境"，避免过度声称；符号映射到符号库

#### Scenario: 生成失败兜底
- **WHEN** 图像生成失败或超时
- **THEN** 从预生成美学种子库按「美学预设×情绪」匹配占位插画 + 仍返回解析文本，并允许重试
- **WHEN** 大模型解析失败
- **THEN** 基于规则的情绪关键词提取作降级解析（映射情绪词库）

### Requirement: 3D 走廊画廊浏览（全量 3D + 双端 + 降级开关）
系统 SHALL 提供滚动驱动的 3D 走廊画廊，桌面端全量 Three.js 实现，相机沿走廊漂移经过多个梦境「房间」，每个房间展示一件藏品，房间氛围依梦境情绪自动调节；移动端降级为 2.5D 视差画廊。**第 12 天自检：若全量 3D 性能/工期不达标，触发降级开关**。

#### Scenario: 桌面端画廊浏览
- **WHEN** 用户在桌面端进入画廊
- **THEN** Three.js 相机沿走廊前行，滚动控制推进，两侧门 = 梦境入口
- **WHEN** 用户滚动到某梦境门前
- **THEN** 该门发光高亮，显示梦境标题 + 情绪标签
- **WHEN** 用户点击门或继续深入
- **THEN** 进入该梦境的沉浸房间，展示大图 + 解析 + 氛围粒子

#### Scenario: 移动端 2.5D 降级
- **WHEN** 用户在移动端进入画廊
- **THEN** 降级为 2.5D 视差画廊（CSS 3D + GSAP 滚动 + 粒子），保证 30fps+，保留氛围与交互

#### Scenario: 降级开关触发（第 12 天自检）
- **WHEN** 第 12 天自检发现全量 3D 工期/性能不达标
- **THEN** 桌面端也降级为 2.5D 视差画廊（牺牲部分沉浸换保 P0 闭环），并在 Demo 帖如实说明取舍

#### Scenario: 平滑滚动
- **WHEN** 用户滚动
- **THEN** 使用 Lenis 平滑滚动，不破坏 CSS sticky，滚动驱动 GSAP scrub 动画可前后

#### Scenario: 空状态
- **WHEN** 无梦境数据
- **THEN** 显示空状态引导录入（非空白）

### Requirement: 潜意识报告（P1）
系统 SHALL 在累积 3 条以上梦境后生成潜意识周报/月报，包含情绪轨迹、重复符号、模式识别，并给出行动建议（非诊断）。**演示种子数据需包含跨梦模式以支撑报告演示**。

#### Scenario: 周报生成
- **WHEN** 累积 ≥3 条梦境且距上次报告 ≥7 天
- **THEN** 生成周报：记录数、主题聚类、重复符号及常见关联、情绪强度变化、streak
- **AND** 报告末尾给出「反思提示」而非诊断结论，附娱乐/自省免责声明

#### Scenario: 模式识别
- **WHEN** 跨梦分析发现重复符号
- **THEN** 高亮"你过去 N 天梦到 X M 次，常伴随 Y 情绪"式纵向洞察

### Requirement: 共享梦池（P1）
系统 SHALL 提供匿名共享梦池，用户可匿名投递梦境藏品，浏览他人梦境时以「相似度关联」而非热度排行连接，无点赞无算法推荐。

#### Scenario: 匿名投递
- **WHEN** 用户选择分享某梦到梦池
- **THEN** 仅上传梦境图 + 情绪 + 符号标签（不上传原文），生成匿名展示

#### Scenario: 相似度关联
- **WHEN** 用户浏览某梦境
- **THEN** 展示"做相似梦的人"（按情绪 + 符号 + 色调相似度），可点击跳转，无点赞无排行

### Requirement: 梦境卡片分享
系统 SHALL 提供梦境卡片分享功能，用户可定制卡片样式并一键导出图片或生成分享链接，用于抖音/小红书裂变传播。**第 12 天自检：若 3D 卡片编辑器工期不达标，降级为静态模板卡片**。

#### Scenario: 卡片生成
- **WHEN** 用户点击分享
- **THEN** 进入 3D 可定制卡片编辑器（边框/字体/背景氛围可选），实时预览
- **WHEN** 用户确认
- **THEN** 生成图片下载 + 带参链接，链接打开可查看该梦境藏品（只读）

#### Scenario: 降级开关触发
- **WHEN** 第 12 天自检发现 3D 卡片编辑器不达标
- **THEN** 降级为 3 套预设静态模板卡片（仍可导出图片+链接），保分享裂变核心

### Requirement: 情绪追踪与 streak
系统 SHALL 提供情绪追踪可视化，包含连续记梦 streak、情绪日历热力图、情绪分布，激励长期记录。

#### Scenario: streak 与热力图
- **WHEN** 用户记录一条梦
- **THEN** 更新 streak 计数 + 日历热力图（按情绪着色）
- **WHEN** streak 断签
- **THEN** 不惩罚，显示鼓励文案，允许补卡

### Requirement: 隐私本地优先
系统 SHALL 默认本地优先存储，AI 解析前显式征求同意，支持一键导出全部数据，明确"娱乐与自省用途，非医疗诊断"免责。

#### Scenario: AI 同意
- **WHEN** 首次触发 AI 生成
- **THEN** 弹窗说明数据将发送至 AI 服务，征求同意，可拒绝则纯本地保存（无 AI 图/解析，仅原文）

#### Scenario: 一键导出
- **WHEN** 用户点击导出
- **THEN** 打包所有梦境数据为 JSON 下载

### Requirement: 创作素材库（P1）
系统 SHALL 提供创作素材库，用户可将梦境图 + 解析收藏为写作/设计灵感板，支持按情绪/符号/色调检索。

#### Scenario: 灵感收藏
- **WHEN** 用户在梦境藏品页点击「加入灵感」
- **THEN** 加入灵感板，可添加备注
- **WHEN** 用户检索灵感板
- **THEN** 支持按情绪/符号/色调/相似图搜索

### Requirement: 演示种子数据
系统 SHALL 在首次进入时预置 5 个精选示例梦境（含已生成藏品 + 故意设计的跨梦重复符号/情绪模式以演示报告），让评委打开即见丰满画廊且能体验报告；用户可一键「清空示例梦境」开始自己的记录。

#### Scenario: 首次进入有示例
- **WHEN** 评委首次打开链接
- **THEN** 画廊已含 5 个精选示例梦境藏品，可直接浏览体验完整流程
- **AND** 5 个示例含跨梦模式（如 3 个梦都出现"水"+ 焦虑情绪），触发潜意识报告演示
- **WHEN** 用户点击「清空示例」
- **THEN** 移除所有示例梦境，进入空状态引导个人录入

### Requirement: TRAE 合规（分阶段对话留痕）
系统 SHALL 全程使用 TRAE IDE + `web-dev` skill 编写代码，采用**分阶段对话留痕**策略确保大赛合规：每个 Task 开一个独立 TRAE 对话，双击会话头像复制 Session ID 记录到 `trae-sessions.md`，关键开发步骤截图存 `docs/screenshots/`，最终 Demo 帖附 ≥3 Session ID + ≥3 截图。

#### Scenario: 分阶段对话
- **WHEN** 开始一个新 Task
- **THEN** 在 TRAE IDE 开新对话，对话首条说明 Task 编号与目标，完成后双击头像复制 Session ID 记录到 `trae-sessions.md`

#### Scenario: 截图留痕
- **WHEN** 完成关键里程碑（镜门转场、首张 AI 藏品、3D 走廊、分享卡、部署成功）
- **THEN** 截图存 `docs/screenshots/`，文件名含 Task 编号与日期

#### Scenario: Demo 帖合规
- **WHEN** 提交初赛 Demo 帖
- **THEN** 文案说明项目经 TRAE IDE + web-dev skill 创作完成，附 ≥3 Session ID + ≥3 开发截图 + TRAE 实践过程叙述

### Requirement: 降级开关（第 12 天自检）
系统 SHALL 在第 12 天（7.11）进行自检，若 P0 核心闭环不稳，按优先级触发降级开关保交付，并在 Demo 帖如实说明取舍（评审重过程而非完美）。

#### Scenario: 自检触发
- **WHEN** 第 12 天自检
- **THEN** 评估：镜门 / 录入 / AI藏品 / 画廊 / 分享 / 部署 是否稳定可体验
- **WHEN** 移动端 2.5D 不达标
- **THEN** 移动端仅保录入+列表浏览（牺牲画廊沉浸）
- **WHEN** 3D 分享卡不达标
- **THEN** 降级为静态模板卡片
- **WHEN** 雾效着色器不达标
- **THEN** 降级为 CSS 渐变雾

### Requirement: 离线保底模式
系统 SHALL 在 AI 接入全失败（Pollinations + SiliconFlow 都不可达）时仍可用：纯本地记录 + 种子库占位图 + 规则关键词解析，保证 Demo 现场即使断网/限流也能演示核心流程。

#### Scenario: AI 全失败
- **WHEN** 图像与解析 AI 均不可达
- **THEN** 梦境原文仍保存，图用种子库按情绪匹配占位，解析用规则关键词提取情绪，UI 标注"离线模式"

## MODIFIED Requirements
（全新项目，无）

## REMOVED Requirements
（全新项目，无）

---

### 范围与优先级总览

| 优先级 | 范围 | 阶段 |
|--------|------|------|
| **P0** | 镜门 / 录入 / AI藏品 / 全量3D画廊(双端) / 卡片分享 / 情绪追踪 / 隐私 / 种子数据 / 部署 / Demo帖 / TRAE合规留痕 / 降级开关 / 离线保底 | 初赛 MVP（16 天必做） |
| **P1** | 潜意识报告 / 共享梦池 / 创作素材库 | 初赛加分 |
| **P2** | 完整社区 / 原型检测高阶解读 / 后端持久化 / 多框架解读切换 / 升级真实图像 API | 复赛 |

### 关键设计决策
1. **赛道**：生活娱乐（Demo 帖与报名帖标签一致）
2. **AI 接入（初赛零成本 + 国内可用）**：Pollinations 图像前端直连 + SiliconFlow 经边缘函数代理 + 预生成种子库兜底 + 规则解析降级；升级仅换边缘函数内部
3. **部署（国内托管优先）**：腾讯云 EdgeOne Pages 为主（静态+边缘函数，国内 CDN 快），Vercel 兜底备选
4. **3D 策略**：全量 3D（镜门+走廊+雾效+3D分享卡），移动端降级 2.5D 视差；第 12 天降级开关保 P0
5. **美学预设**：用户首次选择锁定，prompt 固化 + CSS 色调滤镜保证画廊一致性
6. **演示种子数据**：首次预置 5 个精选示例（含跨梦模式支撑报告演示），可一键清空
7. **存储**：IndexedDB 本地优先，无账号体系；梦池 P1 接 Supabase
8. **TRAE 合规**：分阶段对话留痕——每 Task 独立对话 + Session ID 记录 + 关键截图，全程 TRAE IDE + web-dev skill
9. **降级开关**：第 12 天自检，按优先级降级保 P0 闭环，Demo 帖如实说明取舍
10. **离线保底**：AI 全失败仍可演示（种子库+规则解析）

---

### 附录 A：数据模型 Schema（IndexedDB）

```typescript
// store: dreams
interface Dream {
  id: string;              // uuid
  createdAt: number;       // timestamp
  rawText: string;         // 原文
  emotion: {
    word: string;          // 映射情绪词库
    intensity: number;     // 0-1
    tone: 'positive'|'neutral'|'negative'|'mixed';
  };
  color?: string;          // 用户选色 hex
  tags?: string[];
  aestheticPreset: 'Ethereal'|'Dark Fantasy'|'Mystical'|'Psychedelic';
  artifact: {
    imageUrl: string;      // Pollinations URL 或 seed 库路径
    imageSource: 'ai'|'seed'|'upload';
    emotionAnalysis: string;    // AI 解析文本
    symbols: { name: string; probability: number; note: string }[];
    analysisSource: 'ai'|'rule';
  };
  shared?: boolean;        // 是否已投递梦池
}

// store: meta
interface Meta {
  aestheticPreset: string; // 锁定的美学预设
  aiConsent: boolean;
  streak: { count: number; lastDate: string };
  onboarded: boolean;
}

// store: inspirations (P1)
interface Inspiration { dreamId: string; note?: string; addedAt: number; }
```

### 附录 B：情绪词库（细粒度，~24 个，借鉴 How We Feel）

4 维 × 6 词，用户选择 + AI 解析均映射到此库：
- **高涨-愉悦**：兴奋 / 欢欣 / 惊喜 / 感激 / 宁静 / 释然
- **高涨-不悦**：焦虑 / 恐惧 / 愤怒 / 羞愧 / 焦躁 / 崩溃
- **低落-愉悦**：温柔 / 怀念 / 沉醉 / 慵懒 / 安然 / 出神
- **低落-不悦**：悲伤 / 孤独 / 迷失 / 空虚 / 无力 / 沉重

### 附录 C：符号库（种子集，AI 解析映射到此）

预置 ~20 个常见梦境符号及其概率解读框架（非断言）：
水（情绪流）/ 飞行（自由/逃避）/ 坠落（失控）/ 追逐（焦虑）/ 牙齿脱落（失控/形象）/ 蛇（蜕变/恐惧）/ 迷路（方向迷茫）/ 考试（自我审视）/ 死亡（结束/重生）/ 婴儿（新开始）/ 房子（自我）/ 高处（抱负/危险）/ 镜子（自我认知）/ 门（机遇/未知）/ 动物（本能）/ 陌生人（未知自我）/ 旧友（怀念）/ 重复（未解议题）/ 光（希望/启示）/ 暗（未知/压抑）

### 附录 D：美学预设规范

| 预设 | prompt 关键词 | CSS 色调滤镜 | 情绪适配 |
|------|--------------|-------------|---------|
| Ethereal | ethereal, soft glow, pastel, floating light, dreamlike | hue-rotate(-10deg) saturate(0.8) brightness(1.1) | 温柔/怀念/宁静 |
| Dark Fantasy | dark fantasy, moody, dramatic shadows, mystical fog | saturate(1.2) contrast(1.15) brightness(0.85) | 恐惧/沉重/迷失 |
| Mystical | mystical, sacred geometry, aurora, cosmic, ethereal mist | hue-rotate(15deg) saturate(1.1) brightness(1.05) | 出神/沉醉/惊喜 |
| Psychedelic | psychedelic, vibrant, surreal, fractal, kaleidoscopic | saturate(1.4) hue-rotate(20deg) contrast(1.1) | 兴奋/焦躁/崩溃 |

### 附录 E：用户流程

1. 首次进入 → 镜之门开场 → 碎镜转场 → 主界面（已含 5 个示例梦境画廊）
2. 引导选美学预设 + AI 同意弹窗
3. 浏览示例画廊（3D 走廊/移动 2.5D）→ 进入梦境房间看藏品
4. 点「记录梦境」→ 录入（文字/语音 + 情绪/色/标签）→ 保存 → AI 异步生成藏品
5. 画廊新增一件藏品 → 可进入房间查看
6. 点「分享」→ 卡片编辑器 → 导出图/链接
7. 累积 ≥3 条 → 生成潜意识报告（P1）
8. 点「投递梦池」→ 匿名分享 + 看相似梦（P1）
9. 点「清空示例」→ 开始个人纯净记录
10. 点「导出」→ JSON 下载
