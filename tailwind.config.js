/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // DreamGate 梦境档案馆配色系统
        dreamgate: {
          // 深色基调
          deep: "#07070d",       // 近黑紫，最底层背景
          base: "#0c0c16",       // 基础背景
          elevated: "#14141f",   // 抬升层（卡片/面板）
          // 文字层级
          "text-primary": "#e8e6f0",
          "text-secondary": "#9a96b0",
          "text-muted": "#5a5670",
          // 4 个美学预设代表色（附录 D）
          ethereal: "#c9b8e8",      // 淡紫白（温柔/宁静）
          darkfantasy: "#8b1e3f",   // 暗红（恐惧/沉重）
          mystical: "#4ec9b0",      // 青绿（出神/沉醉）
          psychedelic: "#ff6b9d",   // 粉红（兴奋/焦躁）
          // 雾与边框
          fog: "rgba(180,170,210,0.06)",
          "border-subtle": "rgba(255,255,255,0.06)",
          "border-strong": "rgba(255,255,255,0.12)",
        },
      },
      fontFamily: {
        // display：标题/镜门文字（Cormorant Garamond 衬线优雅，Cinzel 仪式感兜底）
        // 拉丁字符走 Cormorant/Cinzel；中文字符（前两者无字形）落到 ZCOOL XiaoWei 清瘦文学宋
        display: ['"Cormorant Garamond"', '"Cinzel"', '"ZCOOL XiaoWei"', '"Noto Serif SC"', "serif"],
        // body：正文（Noto Serif SC 中文衬线 + EB Garamond 英文衬线）
        body: ['"Noto Serif SC"', '"EB Garamond"', "ui-serif", "Georgia", "serif"],
        // mono：情绪标签/数据
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        drift: "drift 24s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "fade-in": "fade-in 1.2s ease-out both",
        // 镜之门入场（纯 CSS，免受主线程拥塞导致 JS 动画丢帧的影响）
        "gate-rise": "gate-rise 1s cubic-bezier(0.22,1,0.36,1) both",
        "gate-up": "gate-up 1s ease-out both",
        "gate-line": "gate-line 1.1s cubic-bezier(0.22,1,0.36,1) both",
        "gate-divider": "gate-divider 1.1s cubic-bezier(0.22,1,0.36,1) both",
        "gate-arrow": "gate-arrow 2.4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(20px,-10px,0) scale(1.04)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.25)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gate-rise": {
          from: { opacity: "0", transform: "translateY(34px)", filter: "blur(10px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "gate-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gate-line": {
          from: { opacity: "0", transform: "scaleY(0)" },
          to: { opacity: "1", transform: "scaleY(1)" },
        },
        "gate-divider": {
          from: { opacity: "0", transform: "scaleX(0)" },
          to: { opacity: "1", transform: "scaleX(1)" },
        },
        "gate-arrow": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "50%": { transform: "translateY(6px)", opacity: "1" },
        },
      },
      backgroundImage: {
        // 雾效径向渐变工具类
        "fog-soft":
          "radial-gradient(60% 50% at 50% 30%, rgba(180,170,210,0.10) 0%, rgba(180,170,210,0.03) 40%, transparent 70%)",
        "fog-deep":
          "radial-gradient(80% 60% at 50% 100%, rgba(120,100,160,0.12) 0%, rgba(120,100,160,0.04) 45%, transparent 75%)",
        // 深色径向 vignette 背景容器
        "dg-vignette":
          "radial-gradient(120% 90% at 50% 40%, transparent 0%, transparent 50%, rgba(0,0,0,0.55) 100%)",
        // 主体深色渐变（自上而下）
        "dg-deep":
          "linear-gradient(180deg, #07070d 0%, #0c0c16 55%, #07070d 100%)",
      },
    },
  },
  plugins: [],
};
