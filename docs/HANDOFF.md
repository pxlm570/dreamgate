# 梦阈 · DreamGate 交接文档（HANDOFF）

> **写给谁**：接手本项目的 AI 编程助手（TRAE + GLM-5.2）及项目所有者。
> **写于**：2026-07-10（HEAD = `64e2dc8`，工作区干净，check / test(38) / lint(11 存量) / build 全绿）。
> **阅读顺序**：本文 → 根目录 [CLAUDE.md](../CLAUDE.md)（架构与约定，必读）→ [项目总览.md](./项目总览.md)（时间线与完成度）→ 按需 [部署指南.md](./部署指南.md)。
> **语言约定**：与用户交流、写文档、写 commit message 一律中文；技术术语/命令/路径保留英文。

---

## 一、项目目标（为什么做这个项目）

**梦阈 DreamGate** 是 **TRAE AI 创造力大赛 · 生活娱乐赛道** 的参赛作品，**初赛 2026-07-15 截止**（复赛 07-21~08-09，决赛 08-22 线下路演）。

本质目标不是"做一个梦境 App"，而是**向评委证明"通用大模型替代不了它"**。评审看三条腿：

| 腿 | 状态 |
|---|---|
| 创意（差异化壁垒） | ✅ 已落地：跨梦模式识别（纵向洞察）、真连续穿门（沉浸）、共享梦池（社区性）、本地优先（隐私） |
| 可体验 Demo | ✅ 功能全部完成，⏸ **尚未部署上线**（用户主动决定暂缓，见"待办"） |
| TRAE 过程留痕 | ✅ 用户已手动处理（Session ID / 截图 / 帖子不归 agent 管） |

产品一句话：记录梦境 → AI 生成风格统一的油画 + 情绪/符号解析 → 3D 美术馆走廊漫游 → 分享卡导出 → 跨梦模式报告 + 共享梦池共鸣。**全部数据存浏览器 IndexedDB，无后端数据库。**

## 二、当前做到哪了（完成度）

**工程与内容完成度 ≈ 95%**。所有面向用户的功能均已实现并经过实测：

- **镜之门首页**：白卡拉拉大理石拱门（0.24 厚 ExtrudeGeometry 实体 + 雕饰线脚贴图）立于镜湖云海；kimi 式分幕（滚轮：远景幕→近景幕→碎镜穿门）
- **真连续穿门**（本项目最大技术亮点）：门与走廊在**同一个持久 Canvas**（`WorldPage` 是 `/` 与 `/gallery` 的 layout route，路由切换不重挂）。碎裂白闪瞬间门内换成真实走廊，相机推过门洞直接走进美术馆——无遮罩、无静帧、无 WebGL 上下文重建
- **3D 走廊画廊**：默认 3D；逐画驻足（一格滚轮=运镜到下一幅画）；美术馆式壁挂简介牌（米白卡纸、N°编号、简介、情绪）；点画作或简介牌直接"入画"俯冲进详情页；持续掉帧才降 2.5D 视差画廊
- **梦境详情页**（DreamImmersive）：全幅沉浸、滚动逐幕揭示（原文/情绪/符号/解析）
- **记录 + 生成**：文字/语音录入；三级图像兜底（gpt-image → Pollinations → 种子图）+ 解析兜底（LLM → 规则解析）；暗房显影仪式呈现
- **报告页**：跨梦模式识别（`lib/patterns.ts` 现算，核心卖点）+ streak/热力图/分布 + 梦池共鸣引导区
- **共享梦池**（方案 A 概念演示）：16 条内置匿名梦、`lib/pool.ts` 相似度共鸣（共享符号×2+同情绪×1）、漂流瓶瀑布流、本地匿名投递，页面明示"概念演示 · 数据仅存本机"
- **分享卡**：3D 编辑器 + 3 套降级模板 + 只读分享链接（梦境 base64 编码进 `?d=` 参数）
- **演示种子**：9 条精选梦境（gpt-image 油画）,设计了三组跨梦模式：水×5（情绪从焦虑走向和解）、门×3（呼应"镜之门"自指）、飞翔↔坠落对比

视觉三标杆（已深度落地，改视觉前必须理解）：**noomo**（内容即视觉/排版即画面）· **kimi careers**（一格滚轮=一次完整电影转场）· **《光与影：33号远征队》**（Belle Époque 暗黑幻想油画画风）。核心理念：**画即世界**——gpt-image 生成的画是每一幕的主角，页面是画的内部。

## 三、距离目标还差什么（按优先级）

### P0 · 交付前验证（约 1 天，纯验证性工作，赛前必做）

目前所有实测都在**桌面 1440px Chromium** 完成，以下从未验证：

1. **移动端真机**（最大盲区）：移动端走 2.5D 画廊 + CSS 拱门降级路径；触摸交互（touchstart 推进分幕、滑动驻足）从未在真机测过。方法：`npm run dev -- --host` 暴露局域网，手机访问；重点看首页 CSS 拱门、2.5D 卡片、录入表单、语音按钮。
2. **跨浏览器**：Firefox / Edge 桌面快测一轮（WebGL 纹理、backdrop-blur 兼容），iOS Safari 真机最好。
3. **"第一次使用"彩排**：清空 IndexedDB + localStorage 模拟评委 → 引导 → 同意弹窗 → 第一次真实生成（评委环境无 gpt-image Key，走 Pollinations + LLM/规则解析）。确认网络不佳时 9s 超时切种子图的兜底体验不尴尬。DevTools Network 限速到 Slow 3G 跑一遍。
4. **性能复核**：单 Canvas 双场景常驻后没量过典型笔记本 FPS（有 FpsSampler 自动降级兜底，阈值 22fps/采样 3s/预热 4s——预热必须避开穿门后纹理解码高峰，这是曾经"经常误降 2.5D"的根因，别调回去）。

### P1 · 部署上线（用户明确暂缓中，恢复时执行）

用户 07-08/07-09 多次确认：**暂不部署**。恢复时：

- 主方案 EdgeOne Pages，步骤见 [部署指南.md](./部署指南.md)；备用 Vercel（`vercel.json` 已配好）
- **已知拓扑缺口**：`/api/img`（gpt-image 代理）在 dev 由 `vite.config.ts` 中间件提供、生产由 `api/img.ts` 提供（Vercel + EdgeOne 双兼容导出），但**没有镜像到 `edge-functions/api/`**——EdgeOne 部署没有 `/api/img`，前端会静默回退 Pollinations。要在 EdgeOne 启用 gpt-image：把 `api/img.ts` 复制为 `edge-functions/api/img.ts` 并在 EdgeOne 控制台配 `OPENAI_*` 环境变量
- 环境变量清单见 `.env.example`；`edge-functions/api/ping.ts` 用于部署后探测 AI binding
- 上线后验证清单：`/api/ping` 返回 binding 形状 → 记录一条梦触发 `/api/llm` → 分享链接（`/#/share/:id?d=...`）在无痕窗口可打开 → 深链 `/#/gallery` 直达 → HashRouter 所有页面刷新不 404

### P2 · 持续视觉/内容打磨（用户反馈驱动，无固定清单)

模式：用户每轮给具体反馈（如"门框太平面""文字看不清"），agent 实现+实测+提交。没有反馈时不要自行大改视觉。

### P3 · 复赛储备（初赛后再动）

- Blender 烘焙光管线（写 Blender Python 脚本让用户跑，无需手动建模）
- 共享梦池方案 B：EdgeOne KV 真匿名投递（边缘函数 + KV，客户端算相似度）。初赛不做的原因：依赖部署先行、公开可写有内容审核风险
- 性能进阶：KTX2/DRACO 资产压缩、自定义 shader + dither（来自 noomo bundle 分析,见项目总览 07-05 时间线）

## 四、必须遵守的工作方法（质量门与验证纪律）

**每轮改动的流程**：改代码 → `npm run check` + `npm run test` + `npm run lint`（存量 11 个 any 错误，**零新增**为过关线）→ 浏览器实测 → 中文 commit（本仓库惯例：每轮工作一个语义化中文 commit，正文写清做了什么/为什么/怎么验证的/教训）。

**浏览器实测纪律**（血泪教训，违反必踩坑）：

1. **能编译 ≠ 没 bug**：曾有 hero 文字仅在生产不可见（framer mount 竞态）、Canvas 整体崩溃被 ErrorBoundary 吞掉（页面看似正常）。所以：**改完必须真开浏览器看，且必须查 console errors，不能只看截图**。
2. **无头/自动化浏览器的 rAF 节流假象**：页面不可见时 requestAnimationFrame 被节流 → GSAP 时间线走不动、useFrame 相机 lerp 不动 → "转场不跳转""相机贴脸"全是假象。验证任何动画/构图必须让页面持续出帧（真实可见窗口，或连续截图强制出帧）。
3. **HMR 中间态僵尸页面**：编辑代码时已打开的页面可能吃进坏的中间态模块而假死；hash-only 的跳转（`#/a` → `#/b`）**不会重载文档**。测试前先去 `about:blank` 再回来，做文档级硬刷新。
4. **测迁移类逻辑要精确模拟用户历史状态**：localStorage 标记（`dreamgate-seeds-auto-loaded`、`dg-gallery-mode`、`dg-pool-local`）+ IndexedDB 内容组合决定路径，随手测的路径可能根本不是真实用户路径。
5. dev 服务器由 AI 会话启动时，会话结束进程即死——页面连着死服务器会出现"样式未热更新/黑屏"假象。异常先重启 `npm run dev` + 硬刷新。

**美术资产工作流**（本项目的独特方法，改视觉必读）：

- **AI 图像开发期烘焙**：所有 gpt-image 资产（种子画/纹理/门框）由 `scripts/gen-*.mjs` 生成后**提交进仓库**，运行时零 AI 成本。脚本自动读 `.env`，带重试/节流/跳过已存在（中转站单张 ~40s、连打易 524）。
- **美术定稿工作流**：大的视觉改动先用 gpt-image 生成 2-3 张"完成态定稿图"给用户拍板，再照稿还原——反馈从"感觉不对再调"变成"和定稿比差在哪"（用户认可的方法论，因为参数微调→截图→再调的循环被用户批评过迭代慢）。
- **逐像素实测开口**：门框类贴图接进 three.js 前，必须程序化测量开口位置（PowerShell System.Drawing 扫描亮度边界，或浏览器 canvas getImageData），把实测分数写进代码常量并留注释。拍脑袋估计必然露边/错位。

## 五、架构红线（改动前必读 CLAUDE.md，此处列"绝不能破坏"项）

1. `src/lib/*` 纯逻辑层**不得 import React**；单测与模块同目录。
2. 组件**绝不直连** `src/lib/db.ts`，一律走 `useDreamStore`（每个写 action 同时写 IndexedDB 和 store）。
3. `edge-functions/api/llm.ts`（EdgeOne 主）与 `api/llm.ts`（Vercel 备）的共享辅助函数是**逐字复制**的——改一处必须同步另一处，`src/lib/edge-llm-sync.test.ts` 守卫漂移，跑 `npm test` 兜底。
4. **绝不并存两个重 WebGL Canvas**（曾导致 THREE Context Lost、主画布冻结数秒）。单世界 `WorldPage` 就是为此而生；任何"预挂载第二个 Canvas 预热"的想法都已被实践证伪。
5. 生成流程**永不硬失败**：三级图像兜底 + 解析兜底 + 离线/拒绝 AI 的纯本地路径；每个 artifact 带来源标记。删纹理/断网都必须优雅降级。
6. `HashRouter`（EdgeOne 无 SPA fallback）；分享链接必须带 `/#/` 前缀；页面全部 `React.lazy`。
7. `WorldPage` 转场完成必须**一次性调用 navigate**（在 handleComplete 回调里），不能写成"phase===done ⇒ navigate"的持续 effect——否则浏览器回退瞬间会被顶回走廊。
8. 运行时降级 `triggerDegradation` 不可逆（保交付偏置）；种子 id 固定 `seed-1..9`；`useSeedBootstrap` 的迁移锁 `migratingRef` 防并发 loadSeeds 竞态（曾产生重复 id、196 条 React key 冲突 error），别删。
9. 情绪/主题：用 `tailwind.config.js` 的 `dreamgate-*` token 与 `font-display/body/mono`；情绪色动态值允许内联 style（IDE 的"CSS inline styles"警告是噪音，项目 ESLint 不含此规则）。

## 六、用户偏好与已否决方向（不要再提、不要做回去）

- **默认 3D**：桌面一律默认 3D 画廊；只有 WebGL 不可用/窄屏/持续真卡才降级。`hardwareConcurrency<4` 预判已被移除（过于激进），别加回来。
- **克制美学**（用户多次拍板）：已否决——银盐统一滤镜（学 kimi 的交互不学皮肤，已 revert）、雕花鎏金门框（太花哨抢画面）、彩色情绪光池（"五颜六色像迪厅"→统一暖白）、矩形门框（呆板→圆拱）、两步聚焦展签（退役，点画直接入画）。
- 拱门定稿：白卡拉拉大理石 + 阶梯线脚 + 两道随拱刻线，**用户已确认"当前这个门框可以了"**——不要再动门框，除非用户主动提。
- 交互对标 kimi：无滚动条、一格滚轮=一次完整转场、驻足节奏。
- 沟通：中文；用户喜欢明确的方案对比表 + 推荐 + 让他拍板；执行时先做用户明确指定的，再做建议项。

## 七、已知的未知项 / 风险清单

| # | 项 | 说明与应对 |
|---|---|---|
| 1 | `.env` 是 gitignored | 接手环境里没有 `OPENAI_API_KEY/OPENAI_BASE_URL(https://www.bytecatcode.org)/OPENAI_IMAGE_MODEL(gpt-image-2)`——需向用户索取。**该 Key 曾在 AI 对话中出现过，建议用户轮换后再给**。没有 Key 也不影响运行（三级兜底），只影响重新生成美术资产 |
| 2 | 移动端体验未知 | 从未真机验证（见 P0），2.5D 路径和 CSS 拱门可能有未知问题 |
| 3 | Safari/iOS 未知 | WebGL/字体/backdrop-blur 行为差异未验证 |
| 4 | 评委网络环境 | Pollinations 与 EdgeOne AI（约 50 次/天配额）在评审现场的可达性未知；兜底链路已设计，但演示话术建议以种子画廊为主线 |
| 5 | EdgeOne 实际部署从未做过 | 部署指南是纸面方案；R9（AI binding 调用形态）已留 `ping.ts` 探测，R10（SVG 当贴图）已不相关（种子已是 PNG）。首次部署预留半天排雷 |
| 6 | FpsSampler 阈值 22fps | 调保守后，真·低端机的保护是否足够未知；如有用户反馈卡顿，优先建议手动切 2.5D（Toggle 在画廊右上角，选择持久化在 `dg-gallery-mode`） |
| 7 | vitest 必须在仓库根目录跑 | `edge-llm-sync.test.ts` 用 `process.cwd()` 解析路径 |
| 8 | 语音录入 | 依赖 Web Speech API，浏览器支持差异大，不支持时按钮隐藏（设计如此，不是 bug） |
| 9 | `docs/开发记录.md` 停更于 06-30 | 之后的历史以 `docs/项目总览.md` 时间线 + git log 为准（commit message 写得很详细，是最可靠的开发史） |

## 八、下一步计划（接手后的第一天怎么干）

1. **环境自检**（15 分钟）：`npm install`（走 npmmirror）→ `npm run check && npm test && npm run lint && npm run build` 应全绿 → `npm run dev` 打开 `localhost:5173`，完整走一遍：首页滚两格滚轮穿门 → 走廊驻足 → 点简介牌入画 → 详情页滚动 → 记录一条新梦（可拒绝 AI）→ 报告页 → 梦池。这一遍同时是回归基线。
2. **问用户要方向**：默认延续"视觉/内容打磨为先、暂不部署"。若用户没有新反馈，建议主动推进 P0 交付前验证清单（第三节），把结果整理成问题清单给用户排期。
3. **若用户恢复部署**：按 P1 方案执行，先 EdgeOne、备 Vercel，上线后跑验证清单。
4. **保持节奏**：小步提交、每步验证、中文 commit 写清楚教训——本仓库的 git log 就是下一次交接的开发史。

## 九、快速参考

```bash
npm run dev        # 开发服务器（含 dev-only /api/img 中间件）
npm run check      # tsc 类型检查（改动后必跑）
npm run test       # vitest 38 项（含边缘函数同步守卫）
npm run lint       # 存量 11 个 any 错误，零新增为过关线
npm run build      # tsc -b && vite build（check 不干净必失败）
node scripts/gen-seed-images.mjs     # 种子油画（读 .env，跳过已存在）
node scripts/gen-scene-textures.mjs  # 场景纹理/门框贴图
```

- 路由：`/`（门）`/gallery`（走廊，与门同 Canvas）`/record` `/dream/:id` `/share/:id` `/report` `/pool`，全部 `/#/` 前缀
- localStorage 键：`dg-gallery-mode`（3d/2.5d 选择）· `dreamgate-seeds-auto-loaded`（播种守卫）· `dg-pool-local`（梦池本地投递）
- IndexedDB：`dreamgate-db` v1（dreams / meta / inspirations——inspirations 无 UI，已决定放弃，不要为它做功能）
- 关键文件：`src/pages/WorldPage.tsx`（单世界）· `src/components/Gate/MirrorGate.tsx`（门场景+穿门时间线）· `src/components/Gallery/CorridorScene.tsx`（走廊+CameraRig）· `src/lib/patterns.ts`（跨梦识别）· `src/lib/pool.ts`（梦池共鸣）

---

*本文档由上一任 AI 助手（Claude）于交接时撰写。历史细节如与代码冲突，以代码和 git log 为准。祝顺利。*
