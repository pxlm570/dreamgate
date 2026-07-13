import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { DisclaimerFooter } from '@/components/Privacy';
import { CustomCursor, GlobalNav, ErrorBoundary } from '@/components/ui';
import { useDreamStore } from '@/store/useDreamStore';

/**
 * 可重试的懒加载：Vite dev server 重启/HMR 断连后旧 chunk URL 失效，
 * 浏览器仍缓存旧 import map → "Failed to fetch dynamically imported module"。
 * 失败时整页刷新一次（sessionStorage 计数防无限刷新），让浏览器拿到新的 chunk 映射。
 */
function lazyRetry<T extends { default: ComponentType<unknown> }>(
  importer: () => Promise<T>,
  name: string,
) {
  return lazy(async () => {
    const KEY = `dg-lazy-retry-${name}`;
    try {
      const mod = await importer();
      sessionStorage.removeItem(KEY);
      return mod;
    } catch (error) {
      const count = Number(sessionStorage.getItem(KEY) ?? '0');
      if (count < 1) {
        sessionStorage.setItem(KEY, '1');
        console.error(`[DreamGate] ${name} 加载失败，正在刷新页面…`, error);
        window.location.reload();
      }
      throw error;
    }
  });
}

/**
 * 路由级懒加载：three.js / @react-three / postprocessing 等重依赖只在用到它们的
 * 页面（镜门 / 画廊 / 分享）按需加载，缩小首屏 bundle。
 * HashRouter 不影响代码分割（其仅关乎 SPA fallback，与按需 import 无关）。
 */
const WorldPage = lazyRetry(() => import('@/pages/WorldPage'), 'WorldPage');
const RecordPage = lazyRetry(() => import('@/pages/RecordPage'), 'RecordPage');
const DreamRoomPage = lazyRetry(() => import('@/pages/DreamRoomPage'), 'DreamRoomPage');
const SharePage = lazyRetry(() => import('@/pages/SharePage'), 'SharePage');
const ReportPage = lazyRetry(() => import('@/pages/ReportPage'), 'ReportPage');
const DreamPoolPage = lazyRetry(() => import('@/pages/DreamPoolPage'), 'DreamPoolPage');

/** 路由切换时的轻量占位（保持深色背景，避免白闪） */
function RouteFallback() {
  return <div className="min-h-screen bg-dreamgate-deep" aria-hidden />;
}

/**
 * 应用根：URL 路由 + Zustand currentView 协同。
 * 路由用 react-router-dom HashRouter（Task 10：EdgeOne 部署适配，rewrites 不支持 SPA fallback）。
 */
export default function App() {
  const loadDreams = useDreamStore((s) => s.loadDreams);
  const setOffline = useDreamStore((s) => s.setOffline);

  // 首次挂载：从 IndexedDB 加载梦境与 meta
  useEffect(() => {
    loadDreams().catch((err) => {
      console.error('[DreamGate] loadDreams failed:', err);
    });
  }, [loadDreams]);

  // 监听在线/离线状态，同步到 store（驱动 UI 离线提示）
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, [setOffline]);

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* 单世界 layout route：镜之门与 3D 走廊共享一个持久 Canvas，
              "/" ↔ "/gallery" 切换时 WorldPage 不重挂——转场只是场景组翻转+相机接力 */}
            <Route element={<WorldPage />}>
              <Route path="/" element={null} />
              <Route path="/gallery" element={null} />
            </Route>
            <Route path="/record" element={<RecordPage />} />
            <Route path="/dream/:id" element={<DreamRoomPage />} />
            <Route path="/share/:id" element={<SharePage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/pool" element={<DreamPoolPage />} />
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex flex-col items-center justify-center">
                  <p className="text-zinc-400">页面不存在</p>
                </div>
              }
            />
          </Routes>
        </Suspense>
        <GlobalNav />
        <DisclaimerFooter />
        <CustomCursor />
      </Router>
    </ErrorBoundary>
  );
}
