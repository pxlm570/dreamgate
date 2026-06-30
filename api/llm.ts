/**
 * 边缘函数 /api/llm —— SiliconFlow 大模型代理
 *
 * 兼容腾讯云 EdgeOne Pages Edge Functions / Vercel Edge Functions。
 * 使用 Web 标准 Request/Response API。
 *
 * - POST /api/llm
 *   请求体：{ text: string, task: 'analyze' }
 *   响应：JSON { emotionAnalysis, emotion:{word,intensity,tone}, symbols:[{name,probability,note}] }
 *
 * API Key 从环境变量 SILICONFLOW_API_KEY 读取（绝不硬编码）。
 * - Key 未配置 → 503
 * - 上游失败 → 502
 * 前端 ai.ts 的 analyzeDream 会捕获错误并走 ruleParser 降级。
 */

const SILICONFLOW_ENDPOINT = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'Qwen/Qwen2.5-7B-Instruct';

const SYSTEM_PROMPT = `你是一名梦境解析助手，专注于把用户的梦境文本解析为结构化的情绪与符号概率地图。请严格遵循以下规则：

1. 返回纯 JSON（不要任何额外文字、不要 markdown 代码块），结构如下：
{
  "emotionAnalysis": "一段中文解析文本，描述梦境的情绪氛围与可能的心理联想",
  "emotion": {
    "word": "细粒度中文情绪词，必须从以下 24 个中选取一个：兴奋/欢欣/惊喜/感激/宁静/释然/焦虑/恐惧/愤怒/羞愧/焦躁/崩溃/温柔/怀念/沉醉/慵懒/安然/出神/悲伤/孤独/迷失/空虚/无力/沉重",
    "intensity": 0到1之间的数字，表示情绪强度,
    "tone": "positive | neutral | negative | mixed 之一"
  },
  "symbols": [
    { "name": "符号名（中文，如：水/飞行/坠落/追逐/牙齿脱落/蛇/迷路/考试/死亡/婴儿/房子/高处/镜子/门/动物/陌生人/旧友/重复/光/暗）", "probability": 0到1之间的数字, "note": "该符号在此梦境语境下的可能解读，以可能性而非断言表述" }
  ]
}

2. 情绪基调（tone）的权重高于符号解读，请优先准确判断情绪。
3. 符号以「概率」呈现而非断言，每个符号附简短可能解读。
4. 在 emotionAnalysis 末尾必须包含一句说明：「以上为概率地图，需结合自身语境理解」。
5. 在 emotionAnalysis 末尾必须包含免责声明：「本解析仅供娱乐与自省，非医疗诊断」。
6. 不要做任何医疗、精神疾病的诊断或建议。
7. 如果梦境文本过短或无明确情绪，emotion.word 用「出神」，intensity 用 0.4，tone 用 neutral，symbols 返回空数组。`;

interface AnalyzeRequest {
  text?: string;
  task?: string;
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SiliconFlowChoice {
  message?: { content?: string };
}

interface SiliconFlowResponse {
  choices?: SiliconFlowChoice[];
  error?: { message?: string };
}

/** 从各运行时环境读取 API Key（兼容 EdgeOne / Vercel / Cloudflare） */
function getApiKey(): string | undefined {
  // 优先 process.env（Node / EdgeOne / Vercel Node）
  if (typeof process !== 'undefined' && process.env) {
    const k = process.env.SILICONFLOW_API_KEY;
    if (k) return k;
  }
  return undefined;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers,
    },
  });
}

/** 从模型回复中提取 JSON（容忍代码块包裹） */
function extractJSON(raw: string): unknown {
  let s = raw.trim();
  // 去除 ```json ... ``` 包裹
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // 截取第一个 { 到最后一个 }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return JSON.parse(s);
}

/** 校验并归一化解析结果 */
function normalizeAnalysis(data: unknown): {
  emotionAnalysis: string;
  emotion: { word: string; intensity: number; tone: string };
  symbols: { name: string; probability: number; note: string }[];
} {
  const obj = (data ?? {}) as Record<string, unknown>;
  const emotion = (obj.emotion ?? {}) as Record<string, unknown>;
  const symbolsRaw = Array.isArray(obj.symbols) ? obj.symbols : [];

  const word = typeof emotion.word === 'string' ? emotion.word : '出神';
  const intensity =
    typeof emotion.intensity === 'number'
      ? Math.max(0, Math.min(1, emotion.intensity))
      : 0.4;
  const tone =
    typeof emotion.tone === 'string' &&
    ['positive', 'neutral', 'negative', 'mixed'].includes(emotion.tone)
      ? emotion.tone
      : 'neutral';
  const emotionAnalysis =
    typeof obj.emotionAnalysis === 'string' ? obj.emotionAnalysis : '';

  const symbols = symbolsRaw
    .map((s) => s as Record<string, unknown>)
    .filter((s) => s && typeof s.name === 'string')
    .map((s) => ({
      name: String(s.name),
      probability:
        typeof s.probability === 'number'
          ? Math.max(0, Math.min(1, s.probability))
          : 0.5,
      note: typeof s.note === 'string' ? s.note : '',
    }));

  return { emotionAnalysis, emotion: { word, intensity, tone }, symbols };
}

async function handleAnalyze(text: string, apiKey: string): Promise<Response> {
  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请解析以下梦境文本，按要求返回纯 JSON：\n\n"""${text}"""`,
    },
  ];

  let upstream: Response;
  try {
    upstream = await fetch(SILICONFLOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 1024,
      }),
    });
  } catch (err) {
    return json(
      {
        error: 'UPSTREAM_UNREACHABLE',
        message: '无法连接到 SiliconFlow 上游服务',
        detail: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return json(
      {
        error: 'UPSTREAM_ERROR',
        status: upstream.status,
        message: 'SiliconFlow 上游返回错误',
        detail,
      },
      502,
    );
  }

  const data = (await upstream.json()) as SiliconFlowResponse;
  const content = data.choices?.[0]?.message?.content ?? '';

  if (!content) {
    return json({ error: 'EMPTY_CONTENT', message: '上游返回空内容' }, 502);
  }

  let parsed: unknown;
  try {
    parsed = extractJSON(content);
  } catch (err) {
    return json(
      {
        error: 'PARSE_ERROR',
        message: '无法解析上游返回的 JSON',
        raw: content,
        detail: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  const result = normalizeAnalysis(parsed);
  return json(result);
}

/** 默认导出 handler（兼容 EdgeOne / Vercel Edge） */
export default async function handler(req: Request): Promise<Response> {
  // 处理 CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' }, 405);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return json(
      {
        error: 'API_KEY_NOT_CONFIGURED',
        message: 'SILICONFLOW_API_KEY 未配置，无法调用大模型解析（前端将走规则降级）',
      },
      503,
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return json({ error: 'BAD_REQUEST', message: '请求体不是合法 JSON' }, 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const task = body.task ?? 'analyze';

  if (!text) {
    return json({ error: 'EMPTY_TEXT', message: 'text 不能为空' }, 400);
  }

  if (task !== 'analyze') {
    return json({ error: 'UNSUPPORTED_TASK', message: `暂不支持 task=${task}` }, 400);
  }

  return handleAnalyze(text, apiKey);
}

/** EdgeOne Pages 约定：导出 onRequest 别名 */
export const onRequest = handler;
