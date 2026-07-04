// SilverDreamEffect —「银盐梦境」统一滤镜（学 kimi careers 的手法：一个后处理 shader 统一全站质感）
// 双色调映射（深空黑 → 淡紫银光）+ Bayer 有序抖动（有纹理但不乱，区别于随机噪点）。
// strength 控制风格化程度：1.0 = 完全双色调；~0.72 = 保留部分原色（画作色彩仍可辨，整体蒙上银灰）。
import { Effect } from "postprocessing";
import { Uniform, Color } from "three";

const fragmentShader = /* glsl */ `
  uniform float uStrength;
  uniform float uLevels;
  uniform vec3 uShadow;
  uniform vec3 uLight;

  // 递归 Bayer 有序抖动矩阵（经典 shader 写法，兼容 WebGL1/2）
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    lum = pow(lum, 0.68); // 暗场提亮——「银盐」的银（指数越小中间调越亮）
    float d = (bayer8(gl_FragCoord.xy) - 0.5) / uLevels;
    float q = clamp(floor((lum + d) * uLevels) / (uLevels - 1.0), 0.0, 1.0);
    vec3 duo = mix(uShadow, uLight, q);
    outputColor = vec4(mix(inputColor.rgb, duo, uStrength), inputColor.a);
  }
`;

export interface SilverDreamOptions {
  /** 风格化强度 0-1，默认 0.85（残留一丝原色） */
  strength?: number;
  /** 明度量化级数，默认 6（级数越少抖动纹理越明显） */
  levels?: number;
}

export class SilverDreamEffect extends Effect {
  constructor({ strength = 0.72, levels = 7 }: SilverDreamOptions = {}) {
    super("SilverDreamEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["uStrength", new Uniform(strength)],
        ["uLevels", new Uniform(levels)],
        ["uShadow", new Uniform(new Color("#08060f"))],
        ["uLight", new Uniform(new Color("#d8cff0"))],
      ]),
    });
  }
}
