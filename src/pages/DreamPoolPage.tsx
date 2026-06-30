import { useEffect } from 'react';
import { useDreamStore } from '@/store/useDreamStore';

/**
 * 共享梦池（占位，P1）
 * 匿名投递 + 相似度关联，无点赞无排行。
 */
export default function DreamPoolPage() {
  const setView = useDreamStore((s) => s.setView);

  useEffect(() => {
    setView('pool');
  }, [setView]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 flex flex-col items-center justify-center px-6">
      <h1 className="text-2xl md:text-4xl font-light tracking-wider">共享梦池</h1>
      <p className="mt-4 text-zinc-400 text-sm">梦池（P1）- 即将实现</p>
      <p className="mt-2 text-zinc-600 text-xs">匿名分享 · 相似度关联 · 无排行</p>
    </div>
  );
}
