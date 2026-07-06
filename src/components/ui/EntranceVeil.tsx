// EntranceVeil — 页面入场揭幕：深色幕布淡出，盖住 3D 场景初始化的生硬帧
// CSS 动画负责淡出（fill both，抗主线程拥塞不丢帧）；
// JS 定时卸载做兜底——即使动画类缺失（样式未热更新等极端情况），
// 幕布也会在 1.4s 后强制移除，绝不会把页面永久盖黑。
import { useEffect, useState } from "react";

export function EntranceVeil() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 1400);
    return () => window.clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 animate-veil-out bg-dreamgate-deep"
    />
  );
}
