// ping — Edge AI binding 形态探测（R9 风险缓解）
// 部署后访问 /api/ping 确认 AI 全局对象形态，指导 llm.ts 调用 API
//
// 探测脚本：刻意用宽松的 Record<string, unknown> 访问 AI 任意属性，
// 因为它的职责就是摸清未知的运行时注入对象形态。

/** EdgeOne Pages 边缘函数 context（最小类型声明，与 llm.ts 复述不抽共享） */
interface EdgeOneContext {
  request: Request;
  env?: Record<string, string>;
}

/** EdgeOne 注入的 AI binding（探测脚本用宽松类型，访问任意属性） */
declare const AI: Record<string, unknown> | undefined;

export async function onRequest(context: EdgeOneContext): Promise<Response> {
  void context; // ping 仅探测全局 AI binding 形态，不读 context；保留签名匹配 EdgeOne 约定
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
  const info: Record<string, unknown> = {
    aiDefined: typeof AI !== 'undefined',
  };
  if (typeof AI !== 'undefined') {
    info.aiKeys = Object.keys(AI);
    info.hasChatCompletions = typeof AI.chatCompletions === 'function';
    const chat = AI.chat as { completions?: { create?: unknown } } | undefined;
    info.hasChat = !!(chat && typeof chat.completions?.create === 'function');
  }
  return new Response(JSON.stringify(info, null, 2), { status: 200, headers });
}
