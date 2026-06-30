// ping — Edge AI binding 形态探测（R9 风险缓解）
// 部署后访问 /api/ping 确认 AI 全局对象形态，指导 llm.ts 调用 API

export async function onRequest(context: any) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
  const info: Record<string, any> = {
    aiDefined: typeof AI !== 'undefined',
  };
  if (typeof AI !== 'undefined') {
    info.aiKeys = Object.keys(AI);
    info.hasChatCompletions = typeof AI.chatCompletions === 'function';
    info.hasChat = !!(AI.chat && typeof AI.chat.completions?.create === 'function');
  }
  return new Response(JSON.stringify(info, null, 2), { status: 200, headers });
}
