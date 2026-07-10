// DreamRoomPage — 梦境房间页（Task 4 入口）
// 取 dream by id；若 artifact.imageUrl === '' → GenerationOrchestrator（居中容器）；
// 否则 → DreamImmersive「画即世界」全幅沉浸模式（图为舞台 + 浮动操作栏）

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Backdrop, Display, Caption, Button, EntranceVeil } from "@/components/ui";
import { DreamImmersive, GenerationOrchestrator } from "@/components/Generation";
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

  // 生成中：居中容器 + 编排器（引导/同意/进度）
  if (needsGeneration) {
    return (
      <Backdrop preset={preset} intensity={0.7}>
        <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-8">
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
          </motion.div>
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
          <GenerationOrchestrator key={regenKey} dream={dream} />
        </div>
      </Backdrop>
    );
  }

  // 已生成：「画即世界」——图铺满全屏作舞台，操作栏浮在画上
  return (
    <div className="relative bg-dreamgate-deep">
      {/* 入场揭幕：从画廊入画的淡出无缝接到这里的淡入 */}
      <EntranceVeil />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3.5"
      >
        <Link to="/gallery">
          <Button variant="ghost" size="sm" className="border border-white/10 bg-black/30 backdrop-blur-md">
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">返回画廊</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <ExportButton dream={dream} />
          <Button variant="ethereal" size="sm" onClick={handleRegenerate}>
            <RefreshCw size={14} />
            <span className="hidden sm:inline">重新生成</span>
          </Button>
        </div>
      </motion.div>
      <DreamImmersive dream={dream} />
    </div>
  );
}
