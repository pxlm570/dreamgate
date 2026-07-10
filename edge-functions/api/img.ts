/**
 * 边缘函数 /api/img —— OpenAI gpt-image 图像代理（改善梦境图像质量）
 *
 * 兼容 Vercel（default handler）/ EdgeOne（onRequest(context)）。EdgeOne 部署时把本文件
 * 镜像到 edge-functions/api/img.ts 即可（逻辑相同，仅 fetch OpenAI，无需 AI binding）。
 *
 * - POST /api/img  请求体：{ prompt: string, seed?: number }
 *   响应：{ image: "data:image/png;base64,..." }  或  { url: string }
 * - Key 从环境变量 OPENAI_API_KEY 读取（绝不硬编码 / 不进前端）。
 * - 模型从 OPENAI_IMAGE_MODEL 读取，默认 "gpt-image-1"（如用更新版，设此环境变量即可）。
 * - Key 未配置 → 503；上游失败 → 502。前端 lib/ai.ts 捕获后自动回退 Pollinations → 种子图。
 */

/** 端点：默认官方，可用 OPENAI_BASE_URL 指向中转站/自建代理（如 https://www.bytecatcode.org） */
function getEndpoint(): string {
  const base =
    (typeof process !== "undefined" && process.env && process.env.OPENAI_BASE_URL) ||
    "https://api.openai.com";
  return `${base.replace(/\/+$/, "")}/v1/images/generations`;
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface ImgRequest {
  prompt?: string;
  seed?: number;
}

function getApiKey(): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env.OPENAI_API_KEY || undefined;
  }
  return undefined;
}
function getModel(): string {
  if (typeof process !== "undefined" && process.env && process.env.OPENAI_IMAGE_MODEL) {
    return process.env.OPENAI_IMAGE_MODEL;
  }
  return "gpt-image-1";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED", message: "仅支持 POST" }, 405);

  const apiKey = getApiKey();
  if (!apiKey) {
    return json(
      { error: "OPENAI_API_KEY_NOT_CONFIGURED", message: "gpt-image 未配置，前端将回退 Pollinations" },
      503,
    );
  }

  let body: ImgRequest;
  try {
    body = (await req.json()) as ImgRequest;
  } catch {
    return json({ error: "BAD_REQUEST", message: "请求体不是合法 JSON" }, 400);
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return json({ error: "EMPTY_PROMPT", message: "prompt 不能为空" }, 400);

  let upstream: Response;
  try {
    upstream = await fetch(getEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: getModel(), prompt, size: "1024x1024", n: 1 }),
    });
  } catch (err) {
    return json({ error: "UPSTREAM_UNREACHABLE", detail: err instanceof Error ? err.message : String(err) }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return json({ error: "UPSTREAM_ERROR", status: upstream.status, detail }, 502);
  }

  const data = (await upstream.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = data.data?.[0];
  if (first?.b64_json) return json({ image: `data:image/png;base64,${first.b64_json}` });
  if (first?.url) return json({ url: first.url });
  return json({ error: "EMPTY_IMAGE", message: "上游未返回图像" }, 502);
}

/** Vercel：默认导出 handler(req) */
export default handler;

/** EdgeOne Pages：onRequest(context)，从 context.request 取 Request */
export async function onRequest(context: { request: Request }): Promise<Response> {
  return handler(context.request);
}
