/**
 * EdgeOne 边缘函数 /api/llm —— Edge AI (DeepSeek-V3) 代理
 *
 * helpers（SYSTEM_PROMPT / extractJSON / normalizeAnalysis / json / LLMMessage / AnalyzeRequest）
 * 与 api/llm.ts（Vercel 备用）逐字同步；修改一处需同步另一处，避免漂移（v3 注）。
 *
 * 与 api/llm.ts 的关键差异：
 * - 调用 EdgeOne 注入的全局 AI binding（而非 SiliconFlow fetch），无需 API Key
 * - onRequest(context) 签名正确：从 context.request 取 Request（v3 修复 api/llm.ts:212 的签名 bug）
 * - 防御性提取 content，兼容 string / choices / Response 三种形态（R9 风险缓解）
 *
 * - POST /api/llm
 *   请求体：{ text: string, task: 'analyze' }
 *   响应：JSON { emotionAnalysis, emotion:{word,intensity,tone}, symbols:[{name,probability,note}] }
 * - AI binding 未就绪 → 503
 * - 上游调用失败 → 502
 * - 解析失败 → 502
 * 前端 ai.ts 的 analyzeDream 会捕获错误并走 ruleParser 降级。
 */

// EdgeOne 注入的全局 AI binding（不入 tsconfig include，不影响 npm run check/build）
declare const AI: any;

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

/** EdgeOne Pages 边缘函数约定：导出 onRequest(context)，从 context.request 取 Request */
export async function onRequest(context: any): Promise<Response> {
  // v3 关键修复：context.request 才是 Request（api/llm.ts:212 把 context 当 Request 用会运行时崩溃）
  const req = context.request;

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

  // v3：AI binding 未就绪守卫
  if (typeof AI === 'undefined' || !AI?.chatCompletions) {
    return json(
      { error: 'Edge AI unavailable', message: 'AI binding not present' },
      503,
    );
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请解析以下梦境文本，按要求返回纯 JSON：\n\n"""${text}"""`,
    },
  ];

  // v3 #7：Edge AI 调用 + try/catch
  let resp: any;
  try {
    resp = await AI.chatCompletions({
      model: '@tx/deepseek-ai/deepseek-v3-0324',
      messages,
      stream: false,
      temperature: 0.6,
      max_tokens: 1024,
    });
  } catch (err) {
    return json(
      {
        error: 'AI_CALL_FAILED',
        detail: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  // v3：防御性提取 content（兼容 string / choices / Response 三种形态，R9 风险缓解）
  let content = '';
  if (typeof resp === 'string') {
    content = resp;
  } else if (resp?.choices?.[0]?.message?.content) {
    content = resp.choices[0].message.content;
  } else if (resp instanceof Response) {
    content = await resp.text();
  } else {
    // 兜底：尝试 JSON.stringify 看形态
    return json(
      {
        error: 'UNKNOWN_RESPONSE_SHAPE',
        detail: JSON.stringify(resp).slice(0, 500),
      },
      502,
    );
  }

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
