import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

/**
 * dev-only：本地 npm run dev 提供 /api/img（Vite 不跑边缘函数），转发到 OpenAI 兼容图像 API。
 * Key/BASE/MODEL 从 .env（loadEnv，gitignored）或 shell 环境读取——开发阶段全量 gpt-image 开箱即用。
 * 线上由 api/img.ts（Vercel）或 edge-functions/api/img.ts（EdgeOne）提供，与此互不影响。
 */
function devApiImg(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api-img',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/img', (req: IncomingMessage, res: ServerResponse) => {
        const send = (status: number, obj: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        if (req.method !== 'POST') return send(405, { error: 'POST only' });
        const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!key) return send(503, { error: 'OPENAI_API_KEY 未设置（dev），前端将回退 Pollinations' });
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', async () => {
          try {
            const prompt = String(JSON.parse(body || '{}').prompt || '').trim();
            if (!prompt) return send(400, { error: 'EMPTY_PROMPT' });
            const base = (env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/+$/, '');
            const model = env.OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
            const up = await fetch(`${base}/v1/images/generations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
              body: JSON.stringify({ model, prompt, size: '1024x1024', n: 1 }),
            });
            if (!up.ok) return send(502, { error: 'UPSTREAM', status: up.status });
            const data = await up.json();
            const b64 = data?.data?.[0]?.b64_json;
            const url = data?.data?.[0]?.url;
            if (b64) return send(200, { image: `data:image/png;base64,${b64}` });
            if (url) return send(200, { url });
            return send(502, { error: 'EMPTY_IMAGE' });
          } catch (e) {
            return send(500, { error: String(e) });
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 加载 .env（第三参 '' = 不限 VITE_ 前缀，供 dev 中间件读服务端变量；.env 已 gitignore）
  const env = loadEnv(mode, process.cwd(), '');
  return {
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // 按库拆分 vendor，便于浏览器跨部署独立缓存（three 体量大，单独成块）
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (
            id.includes('three') ||
            id.includes('@react-three') ||
            id.includes('postprocessing')
          )
            return 'vendor-three';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('gsap') || id.includes('lenis')) return 'vendor-scroll';
          if (id.includes('react')) return 'vendor-react';
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths(),
    devApiImg(env),
  ],
  };
})
