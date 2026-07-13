// SharePage — 梦境卡片分享页（Task 6）
// 路由 /share/:id（编辑器/降级模板）+ ?d=encoded（只读查看）
// 降级：DEGRADATION_FLAGS.shareCard3D 或移动端 → PresetTemplates
// 否则 → CardEditor + ShareCard + ShareActions

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Backdrop, Display, Caption, Button } from "@/components/ui";
import { useDreamStore } from "@/store/useDreamStore";
import { DEGRADATION_FLAGS } from "@/lib/degradation";
import {
  ShareCard,
  CardEditor,
  ShareActions,
  PresetTemplates,
} from "@/components/Share";
import { DEFAULT_CARD_CONFIG } from "@/components/Share/types";
import {
  readShareDataFromQuery,
  summaryToDream,
} from "@/components/Share/shareUtils";
import type { Dream } from "@/lib/types";

const MOBILE_QUERY = "(max-width: 768px)";

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const setView = useDreamStore((s) => s.setView);
  const setSelectedDream = useDreamStore((s) => s.setSelectedDream);
  const storeDream = useDreamStore((s) => s.dreams.find((d) => d.id === id));

  const cardRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState(DEFAULT_CARD_CONFIG);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setView("share");
    setSelectedDream(id ?? null);
    return () => setSelectedDream(null);
  }, [id, setView, setSelectedDream]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 解析 ?d= 摘要（只读模式）
  const shared = useMemo(
    () => readShareDataFromQuery(search.toString()),
    [search],
  );

  // 优先用 URL ?d= 摘要（只读分享模式）；无 ?d= 时才用本地 store 中的真实梦境（编辑模式）
  // 修复：之前 storeDream 优先导致 /share/seed-1?d=xxx 时忽略 ?d= 直接渲染本地编辑器
  const dream: Dream | null = shared
    ? summaryToDream(shared.summary, id ?? "shared")
    : storeDream ?? null;

  // 只读模式：URL 里有 ?d= → 用链接里的 config
  const readOnly = !!shared;
  const effectiveConfig = shared?.config ?? config;

  // 降级：env 标志 或 移动端（且非只读）
  const degraded = !readOnly && (DEGRADATION_FLAGS.shareCard3D || isMobile);

  if (!dream) {
    // 有 ?d= 参数却没解析出 dream → 链接在传输中被截断/损坏，区别于「本地无此梦」
    const decodeFailed = !!search.get("d");
    return (
      <Backdrop preset="default" intensity={0.4}>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
          <Display className="text-3xl">
            {decodeFailed ? "链接已损坏或过长" : "梦境不存在"}
          </Display>
          <Caption as="p" className="mt-3 block">
            {decodeFailed
              ? "这条分享链接无法解析，可能在传输中被截断，请让对方重新复制完整链接"
              : "这场梦可能已被遗忘，或链接已损坏"}
          </Caption>
          <Link to="/gallery" className="mt-8">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              返回画廊
            </Button>
          </Link>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop preset={dream.aestheticPreset} intensity={0.5}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
        {/* 顶部导航 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center justify-between"
        >
          <Link to="/gallery">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              返回画廊
            </Button>
          </Link>
          <Caption as="div" className="text-[11px] uppercase tracking-widest">
            {readOnly ? "只读梦境卡片" : degraded ? "快速分享" : "梦境卡片编辑"}
          </Caption>
        </motion.div>

        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 text-center"
        >
          <Display className="text-3xl sm:text-4xl">
            {readOnly ? "一张来自梦域的卡片" : "分享你的梦境"}
          </Display>
        </motion.div>

        {/* 主体 */}
        {degraded ? (
          <PresetTemplates dream={dream} />
        ) : readOnly ? (
          <div className="flex justify-center">
            <ShareCard ref={cardRef} dream={dream} config={effectiveConfig} readOnly />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-4">
              <CardEditor config={effectiveConfig} onChange={setConfig} />
              <ShareActions
                cardRef={cardRef}
                dream={dream}
                config={effectiveConfig}
              />
            </div>
            <div className="flex items-center justify-center">
              <ShareCard ref={cardRef} dream={dream} config={effectiveConfig} />
            </div>
          </div>
        )}
      </div>
    </Backdrop>
  );
}
