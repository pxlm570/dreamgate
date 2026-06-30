// DreamGate 美学预设调色板（附录 D）
// 供 Atmosphere / Backdrop / Button 等组件共享，避免与逻辑层 src/lib 冲突

export type AestheticPreset = "Ethereal" | "Dark Fantasy" | "Mystical" | "Psychedelic";

// CSS class 名形式（用于 .preset-X 滤镜类）
export type PresetKey = "Ethereal" | "Dark-Fantasy" | "Mystical" | "Psychedelic";

export const presetToKey: Record<AestheticPreset, PresetKey> = {
  Ethereal: "Ethereal",
  "Dark Fantasy": "Dark-Fantasy",
  Mystical: "Mystical",
  Psychedelic: "Psychedelic",
};

export interface PresetPalette {
  /** 雾色（hex，用于 Fog 渐变） */
  fog: string;
  /** 粒子色（hex，用于 Particles 微光尘埃） */
  particle: string;
  /** 强调色（hex，用于氛围光 / 装饰） */
  accent: string;
  /** 情绪适配文案（附录 D） */
  mood: string;
}

export const PRESET_COLORS: Record<AestheticPreset | "default", PresetPalette> = {
  default: {
    fog: "#b4aad2",
    particle: "#d8d4e8",
    accent: "#c9b8e8",
    mood: "梦境",
  },
  Ethereal: {
    fog: "#c9b8e8",
    particle: "#e8def8",
    accent: "#c9b8e8",
    mood: "温柔 / 怀念 / 宁静",
  },
  "Dark Fantasy": {
    fog: "#8b1e3f",
    particle: "#d4889a",
    accent: "#b84668",
    mood: "恐惧 / 沉重 / 迷失",
  },
  Mystical: {
    fog: "#4ec9b0",
    particle: "#9be8db",
    accent: "#4ec9b0",
    mood: "出神 / 沉醉 / 惊喜",
  },
  Psychedelic: {
    fog: "#ff6b9d",
    particle: "#ffb3cc",
    accent: "#ff6b9d",
    mood: "兴奋 / 焦躁 / 崩溃",
  },
};

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** hex → rgb，支持 #rgb / #rrggbb，失败回退紫灰 */
export function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  if (Number.isNaN(num) || h.length !== 6) {
    return { r: 180, g: 170, b: 210 };
  }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
