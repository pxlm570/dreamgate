/**
 * AI 接入封装
 * - 图像：Pollinations.ai flux 模型，URL 式直连（前端无 Key）
 * - 解析：边缘函数 /api/llm（EdgeOne Edge AI / DeepSeek 主，Vercel SiliconFlow 备）
 * - 兜底：图像→seedLibrary，解析→ruleParser
 * - 离线检测：navigator.onLine
 */
import type {
  AestheticPresetName,
  Artifact,
  DreamAnalysis,
  Emotion,
  DreamSymbol,
} from './types';
import { getPresetByName } from './aestheticPresets';
import { getSeedImage } from './seedLibrary';
import {
  parseEmotionByRules,
  parseSymbolsByRules,
  generateRuleAnalysis,
} from './ruleParser';

/** 离线检测 */
export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !navigator.onLine;
}

/**
 * 预加载图像并设硬超时——给 Pollinations 出图加护栏：
 * resolve = 加载成功；reject = 加载失败或超时（调用方据此切种子图，避免无限等 <img>）。
 */
export function preloadImage(url: string, timeoutMs = 9000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      resolve();
      return;
    }
    const img = new Image();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('image preload timeout'));
    }, timeoutMs);
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('image preload error'));
    };
    img.src = url;
  });
}

/**
 * 构造 Pollinations prompt。
 * 模板：[Subject]+[Action]+[Environment]+[Preset promptKeywords]+[Atmosphere]
 */
function buildPrompt(text: string, preset: AestheticPresetName): string {
  const presetEntry = getPresetByName(preset);
  // 简单提取：取文本前 100 字作为 subject
  const subject = (text || 'a dreamer').slice(0, 100).trim() || 'a dreamer';
  const action = 'floating in';
  const environment = 'dreamscape';
  const styleKeywords = presetEntry?.promptKeywords.join(', ') ?? 'dreamlike';
  const atmosphere = 'dreamlike, ethereal, floating';
  return `${subject} ${action} ${environment}, ${styleKeywords}, atmosphere: ${atmosphere}`;
}

/**
 * 调用 Pollinations.ai flux 模型生成梦境图（URL 式直连）。
 * 返回图像 URL 字符串。失败抛错（由调用方兜底）。
 */
export function generateDreamImage(
  text: string,
  preset: AestheticPresetName,
  seed: number,
): string {
  const prompt = buildPrompt(text, preset);
  const encoded = encodeURIComponent(prompt);
  const url =
    `https://image.pollinations.ai/prompt/${encoded}` +
    `?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
  return url;
}

/** 是否启用 gpt-image 代理（需部署 /api/img + 设 OPENAI_API_KEY，并 VITE_USE_GPT_IMAGE=true） */
export const USE_GPT_IMAGE = import.meta.env.VITE_USE_GPT_IMAGE === 'true';

/**
 * 经 /api/img 代理调用 OpenAI gpt-image 生成梦境图，返回 data URL（或图片 URL）。
 * 失败抛错（由调用方回退 Pollinations → 种子图）。仅在 USE_GPT_IMAGE 时被尝试。
 */
export async function generateImageViaProxy(
  text: string,
  preset: AestheticPresetName,
  seed: number,
): Promise<string> {
  const prompt = buildPrompt(text, preset);
  const res = await fetch('/api/img', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, seed }),
  });
  if (!res.ok) throw new Error(`img proxy failed: ${res.status}`);
  const data = (await res.json()) as { image?: string; url?: string };
  const out = data.image ?? data.url;
  if (!out) throw new Error('img proxy: empty image');
  return out;
}

/**
 * 调用边缘函数 /api/llm 解析梦境。
 * 返回 { emotionAnalysis, emotion, symbols }。失败抛错。
 */
export async function analyzeDream(text: string): Promise<DreamAnalysis> {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, task: 'analyze' }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`analyzeDream failed: ${res.status} ${detail}`);
  }

  const data = (await res.json()) as Partial<DreamAnalysis>;
  // 基本校验，缺字段则抛错走降级
  if (
    !data.emotion ||
    typeof data.emotion.word !== 'string' ||
    typeof data.emotion.intensity !== 'number' ||
    !Array.isArray(data.symbols)
  ) {
    throw new Error('analyzeDream: invalid response shape');
  }

  return {
    emotionAnalysis: data.emotionAnalysis ?? '',
    emotion: data.emotion as Emotion,
    symbols: data.symbols as DreamSymbol[],
  };
}

/** generateArtifact 返回结果（含来源标记） */
export interface GeneratedArtifact extends Artifact {
  /** 图像是否走了种子库兜底 */
  imageFallback: boolean;
  /** 解析是否走了规则降级 */
  analysisFallback: boolean;
  /** 是否处于离线模式 */
  offline: boolean;
}

/**
 * 高层封装：尝试图像 + 解析，任一失败走兜底。
 * - 图像失败 → seedLibrary.getSeedImage
 * - 解析失败 → ruleParser
 * 返回完整 artifact 对象 + source 标记。
 */
export async function generateArtifact(
  text: string,
  preset: AestheticPresetName,
  seed: number,
): Promise<GeneratedArtifact> {
  const offline = isOffline();

  // —— 图像 ——
  let imageUrl: string;
  let imageSource: Artifact['imageSource'];
  let imageFallback = false;

  if (offline) {
    // 离线直接走种子库
    const fallbackEmotion = parseEmotionByRules(text);
    imageUrl = getSeedImage(preset, fallbackEmotion.word);
    imageSource = 'seed';
    imageFallback = true;
  } else {
    let resolved = false;
    // 优先 gpt-image 代理（仅在启用时；失败无声回退 Pollinations）
    if (USE_GPT_IMAGE) {
      try {
        imageUrl = await generateImageViaProxy(text, preset, seed);
        imageSource = 'ai';
        resolved = true;
      } catch {
        /* gpt-image 不可用 → 回退 Pollinations */
      }
    }
    if (!resolved) {
      try {
        imageUrl = generateDreamImage(text, preset, seed);
        imageSource = 'ai';
        // Pollinations URL 即时生成，不预加载校验；<img> onError 再走兜底（调用方处理）。
      } catch {
        const fallbackEmotion = parseEmotionByRules(text);
        imageUrl = getSeedImage(preset, fallbackEmotion.word);
        imageSource = 'seed';
        imageFallback = true;
      }
    }
  }

  // —— 解析 ——
  let emotionAnalysis: string;
  let emotion: Emotion;
  let symbols: DreamSymbol[];
  let analysisSource: Artifact['analysisSource'];
  let analysisFallback = false;

  if (offline) {
    emotion = parseEmotionByRules(text);
    symbols = parseSymbolsByRules(text);
    emotionAnalysis = generateRuleAnalysis(text, emotion, symbols);
    analysisSource = 'rule';
    analysisFallback = true;
  } else {
    try {
      const analysis = await analyzeDream(text);
      emotionAnalysis = analysis.emotionAnalysis;
      emotion = analysis.emotion;
      symbols = analysis.symbols;
      analysisSource = 'ai';
    } catch {
      emotion = parseEmotionByRules(text);
      symbols = parseSymbolsByRules(text);
      emotionAnalysis = generateRuleAnalysis(text, emotion, symbols);
      analysisSource = 'rule';
      analysisFallback = true;
    }
  }

  return {
    imageUrl,
    imageSource,
    emotionAnalysis,
    symbols,
    analysisSource,
    imageFallback,
    analysisFallback,
    offline,
  };
}
