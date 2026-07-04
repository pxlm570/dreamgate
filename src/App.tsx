import { Suspense, lazy, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { DisclaimerFooter } from '@/components/Privacy';
import { CustomCursor, GlobalNav } from '@/components/ui';
import { useDreamStore } from '@/store/useDreamStore';

/**
 * 路由级懒加载：three.js / @react-three / postprocessing 等重依赖只在用到它们的
 * 页面（镜门 / 画廊 / 分享）按需加载，缩小首屏 bundle。
 * HashRouter 不影响代码分割（其仅关乎 SPA fallback，与按需 import 无关）。
 */
const GatePage = lazy(() => import('@/pages/GatePage'));
const GalleryPage = lazy(() => import('@/pages/GalleryPage'));
const RecordPage = lazy(() => import('@/pages/RecordPage'));
const DreamRoomPage = lazy(() => import('@/pages/DreamRoomPage'));
const SharePage = lazy(() => import('@/pages/SharePage'));
const ReportPage = lazy(() => import('@/pages/ReportPage'));
const DreamPoolPage = lazy(() => import('@/pages/DreamPoolPage'));

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
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<GatePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
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
  );
}
