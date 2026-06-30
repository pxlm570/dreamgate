// DreamRoomPage — 梦境房间页（Task 4 入口）
// 取 dream by id；若 artifact.imageUrl === '' → GenerationOrchestrator；否则 → ArtifactView + 重新生成
// 顶部 Backdrop + AtmosphereLayer（preset 驱动）+ 居中容器

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Backdrop, Display, Caption, Button } from "@/components/ui";
import { ArtifactView, GenerationOrchestrator } from "@/components/Generation";
import { ExportButton } from "@/components/Privacy";
import { useDreamStore } from "@/store/useDreamStore";
import type { Artifact } from "@/lib/types";

const EMPTY_ARTIFACT: Artifact = {
  imageUrl: "",
  imageSource: "ai",
  emotionAnalysis: "",
  symbols: [],
  analysisSource: "rule",
};

export default function DreamRoomPage() {
  const { id } = useParams<{ id: string }>();
  const setView = useDreamStore((s) => s.setView);
  const setSelectedDream = useDreamStore((s) => s.setSelectedDream);
  const dream = useDreamStore((s) => s.dreams.find((d) => d.id === id));
  const updateDream = useDreamStore((s) => s.updateDream);

  const [regenKey, setRegenKey] = useState(0);

  useEffect(() => {
    setView("gallery");
    setSelectedDream(id ?? null);
    return () => setSelectedDream(null);
  }, [id, setView, setSelectedDream]);

  const preset = dream?.aestheticPreset ?? "Ethereal";
  const needsGeneration = !!dream && dream.artifact.imageUrl === "";

  const handleRegenerate = async () => {
    if (!dream) return;
    // 清空 artifact → 触发 GenerationOrchestrator 重新生成
    await updateDream({ ...dream, artifact: EMPTY_ARTIFACT });
    setRegenKey((k) => k + 1);
  };

  if (!dream) {
    return (
      <Backdrop preset="default" intensity={0.4}>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
          <Display className="text-3xl text-dreamgate-text-primary">
            梦境不存在
          </Display>
          <Caption as="p" className="mt-3 block">
            这场梦可能已被遗忘，或从未被记录
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
    <Backdrop preset={preset} intensity={0.7}>
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-8">
        {/* 顶部导航 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 flex items-center justify-between"
        >
          <Link to="/gallery">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              返回画廊
            </Button>
          </Link>
          {!needsGeneration && (
            <div className="flex items-center gap-2">
              <ExportButton dream={dream} />
              <Button
                variant="ethereal"
                size="sm"
                onClick={handleRegenerate}
              >
                <RefreshCw size={14} />
                重新生成
              </Button>
            </div>
          )}
        </motion.div>

        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mb-6 text-center"
        >
          <Caption
            as="div"
            className="text-[11px] uppercase tracking-widest text-dreamgate-text-muted"
          >
            梦境房间
          </Caption>
          <Display className="mt-1 text-3xl text-dreamgate-text-primary sm:text-4xl">
            {dream.emotion.word} · {preset}
          </Display>
        </motion.div>

        {/* 主体：生成中 / 已生成 */}
        {needsGeneration ? (
          <GenerationOrchestrator key={regenKey} dream={dream} />
        ) : (
          <ArtifactView dream={dream} />
        )}
      </div>
    </Backdrop>
  );
}
