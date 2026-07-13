// DreamPoolPage — 共享梦池（概念演示 · 本地数据）
// 第四重壁垒「社区性」的去社交化形态：匿名投递 + 相似度共鸣，无点赞无排行。
// 初赛为纯前端演示：池数据内置，投递仅存本机 localStorage 并明示；
// 相似度复用附录 B/C 词库（与跨梦模式识别同源），真实用户的梦同样能产生共鸣。
// 复赛升级路线（EdgeOne KV 真共享）见 docs/项目总览.md。

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Waves, Anchor, Sparkles, Plus } from "lucide-react";
import { useDreamStore } from "@/store/useDreamStore";
import { getEmotionByWord } from "@/lib/emotions";
import { findResonances, anonymizeDream, type PoolDream } from "@/lib/pool";
import { POOL_DREAMS } from "@/data/poolDreams";
import { Fog } from "@/components/Atmosphere";
import { Button, Display, Caption } from "@/components/ui";

const LOCAL_POOL_KEY = "dg-pool-local";

function readLocalPool(): PoolDream[] {
  try {
    const raw = localStorage.getItem(LOCAL_POOL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function DreamPoolPage() {
  const setView = useDreamStore((s) => s.setView);
  const dreams = useDreamStore((s) => s.dreams);
  const updateDream = useDreamStore((s) => s.updateDream);
  const loaded = useDreamStore((s) => s.loaded);
  const [localPool, setLocalPool] = useState<PoolDream[]>(() =>
    typeof window === "undefined" ? [] : readLocalPool(),
  );

  useEffect(() => {
    setView("pool");
  }, [setView]);

  // 本机投递在前（漂流瓶刚落水），演示池随后
  const pool = useMemo(() => [...localPool, ...POOL_DREAMS], [localPool]);
  const resonances = useMemo(() => findResonances(dreams, pool), [dreams, pool]);

  // 可投递的梦：最近一条尚未投递的
  const nextToShare = useMemo(
    () => [...dreams].reverse().find((d) => !d.shared),
    [dreams],
  );

  const share = useCallback(() => {
    if (!nextToShare) return;
    const anon = anonymizeDream(nextToShare);
    setLocalPool((prev) => {
      const next = [anon, ...prev];
      try {
        localStorage.setItem(LOCAL_POOL_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
    updateDream({ ...nextToShare, shared: true }).catch((err) =>
      console.error("[DreamGate] 投递标记失败:", err),
    );
  }, [nextToShare, updateDream]);

  /** 共鸣脚注：「与你的『水』之梦共鸣」——优先报共享符号，弱共鸣报同情绪 */
  const resonanceNote = (p: PoolDream): string | null => {
    const r = resonances.get(p.id);
    if (!r) return null;
    if (r.sharedSymbols.length > 0) {
      return `与你的『${r.sharedSymbols.join("・")}』之梦共鸣`;
    }
    return `与你共有「${p.emotion}」的夜晚`;
  };

  const resonanceCount = resonances.size;

  return (
    <div className="relative min-h-screen bg-dreamgate-deep">
      <Fog className="fixed inset-0 z-0" intensity={0.45} color="#5A8DB8" />
      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-36 pt-24 sm:px-8">
        {/* —— 池首 —— */}
        <header className="mb-12">
          <div className="flex items-center gap-3">
            <Waves size={20} className="text-dreamgate-ethereal" />
            <Display className="text-3xl tracking-wide sm:text-5xl">共享梦池</Display>
          </div>
          <Caption as="p" className="mt-4 max-w-xl text-[13px] leading-relaxed">
            陌生人把梦匿名放进池里，像漂流瓶。没有名字，没有点赞，没有排行——
            只有当某个梦与你的梦共享同一个符号时，它会亮起来。
          </Caption>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-dreamgate-elevated/40 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-dreamgate-text-muted backdrop-blur-md">
              概念演示 · 数据仅存本机 · 投递前已匿名化
            </span>
            {resonanceCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-dreamgate-ethereal/30 bg-dreamgate-ethereal/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-dreamgate-ethereal">
                <Sparkles size={11} />
                {resonanceCount} 个梦与你共鸣
              </span>
            )}
          </div>
          {/* 投递入口：有未投递的梦才出现；没有梦则引导去记录 */}
          <div className="mt-7">
            {!loaded ? (
              <Caption as="p" className="text-[11px] text-dreamgate-text-muted">
                正在拾取梦境…
              </Caption>
            ) : nextToShare ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ethereal" size="sm" onClick={share}>
                  <Anchor size={14} />
                  将最近一梦匿名放入池中
                </Button>
                <Caption as="span" className="text-[11px]">
                  仅保留文字摘录与符号，存于你的浏览器
                </Caption>
              </div>
            ) : dreams.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/record">
                  <Button variant="ethereal" size="sm">
                    <Plus size={14} />
                    记录第一个梦，寻找共鸣
                  </Button>
                </Link>
              </div>
            ) : (
              <Caption as="p" className="text-[11px]">
                你的梦都已放入池中
              </Caption>
            )}
          </div>
        </header>

        {/* —— 星海：瀑布流漂流瓶 —— */}
        <section className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {pool.map((p, i) => {
            const color = getEmotionByWord(p.emotion)?.color ?? "#c9b8e8";
            const note = resonanceNote(p);
            return (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: Math.min(i * 0.05, 0.6), ease: [0.22, 1, 0.36, 1] }}
                className="group relative mb-5 break-inside-avoid rounded-2xl border bg-dreamgate-elevated/30 p-5 backdrop-blur-sm transition-colors"
                style={{
                  borderColor: note ? `${color}55` : "rgba(255,255,255,0.08)",
                  boxShadow: note ? `0 0 28px -10px ${color}66` : undefined,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    <span className="font-mono text-[11px] tracking-[0.24em]" style={{ color }}>
                      {p.emotion}
                    </span>
                  </div>
                  <Caption as="span" className="font-mono text-[10px]">
                    {p.mine ? "你投递的 · " : ""}
                    {p.postedAgo}
                  </Caption>
                </div>
                <p className="mt-3.5 font-display text-[15px] leading-relaxed text-dreamgate-text-primary/90">
                  {p.text}
                </p>
                {p.symbols.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.symbols.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] tracking-widest text-dreamgate-text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {note && (
                  <div
                    className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 font-mono text-[10px] tracking-[0.15em]"
                    style={{ color }}
                  >
                    <Sparkles size={11} />
                    {note}
                  </div>
                )}
              </motion.article>
            );
          })}
        </section>

        <footer className="mt-14 text-center">
          <Caption as="p" className="text-[10px]">
            去社交化设计：无点赞 · 无排行 · 无评论——共鸣即全部
          </Caption>
        </footer>
      </main>
    </div>
  );
}
