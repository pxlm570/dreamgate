import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import GatePage from '@/pages/GatePage';
import GalleryPage from '@/pages/GalleryPage';
import RecordPage from '@/pages/RecordPage';
import DreamRoomPage from '@/pages/DreamRoomPage';
import SharePage from '@/pages/SharePage';
import ReportPage from '@/pages/ReportPage';
import DreamPoolPage from '@/pages/DreamPoolPage';
import { DisclaimerFooter } from '@/components/Privacy';
import { useDreamStore } from '@/store/useDreamStore';

/**
 * 应用根：URL 路由 + Zustand currentView 协同。
 * 路由用 react-router-dom HashRouter（Task 10：EdgeOne 部署适配，rewrites 不支持 SPA fallback；不 lazy load，遵循 web-dev guideline）。
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
      <DisclaimerFooter />
    </Router>
  );
}
