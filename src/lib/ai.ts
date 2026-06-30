/**
 * AI 接入封装
 * - 图像：Pollinations.ai flux 模型，URL 式直连（前端无 Key）
 * - 解析：边缘函数 /api/llm（SiliconFlow 代理）
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
    try {
      imageUrl = generateDreamImage(text, preset, seed);
      imageSource = 'ai';
      // 注意：Pollinations URL 是即时生成的，这里不预加载校验，
      // 由 <img> 渲染时 onError 再走兜底（调用方处理）。
    } catch {
      const fallbackEmotion = parseEmotionByRules(text);
      imageUrl = getSeedImage(preset, fallbackEmotion.word);
      imageSource = 'seed';
      imageFallback = true;
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
