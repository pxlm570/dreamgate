// GenerationOrchestrator — 生成编排器（Task 4 核心）
// 流程：onboarding → consent → generateArtifact → updateDream → ArtifactView
// 渐进式（4.6）：图像 URL 同步先渲染，解析 async 后渲染
// 兜底（4.7）：图像 onError → seedLibrary；拒绝 AI → 全本地规则 + 种子图

import { useEffect, useRef, useState } from "react";
import { useDreamStore } from "@/store/useDreamStore";
import { generateArtifact, generateDreamImage, type GeneratedArtifact } from "@/lib/ai";
import { getSeedImage } from "@/lib/seedLibrary";
import { parseEmotionByRules, parseSymbolsByRules, generateRuleAnalysis } from "@/lib/ruleParser";
import type { AestheticPresetName, Dream } from "@/lib/types";
import { AestheticOnboarding } from "./AestheticOnboarding";
import { AiConsentDialog } from "./AiConsentDialog";
import { GenerationProgress } from "./GenerationProgress";
import { ArtifactView } from "./ArtifactView";

/** 从 dream.id 哈希出数字 seed（保证可复现） */
function hashSeed(id: string): number {
  return Array.from(id).reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

/** 拒绝 AI 时纯本地构建（规则解析 + 种子图），不调 /api/llm */
function buildLocalArtifact(text: string, preset: AestheticPresetName, emotionWord: string): GeneratedArtifact {
  const emotion = parseEmotionByRules(text);
  const symbols = parseSymbolsByRules(text);
  return {
    imageUrl: getSeedImage(preset, emotionWord),
    imageSource: "seed",
    emotionAnalysis: generateRuleAnalysis(text, emotion, symbols),
    symbols,
    analysisSource: "rule",
    imageFallback: true,
    analysisFallback: true,
    offline: false,
  };
}

export interface GenerationOrchestratorProps {
  dream: Dream;
}

export function GenerationOrchestrator({ dream }: GenerationOrchestratorProps) {
  const meta = useDreamStore((s) => s.meta);
  const setMeta = useDreamStore((s) => s.setMeta);
  const updateDream = useDreamStore((s) => s.updateDream);

  const [aiDeclined, setAiDeclined] = useState(false);
  const [phase, setPhase] = useState<"idle" | "image" | "analysis" | "done">("idle");
  const [artifact, setArtifact] = useState<GeneratedArtifact | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const imageErroredRef = useRef(false);

  const showOnboarding = !meta.onboarded;
  const showConsent = meta.onboarded && !meta.aiConsent && !aiDeclined;
  const preset = dream.aestheticPreset;
  const seed = hashSeed(dream.id);

  useEffect(() => {
    if (showOnboarding || showConsent) return;
    let cancelled = false;
    imageErroredRef.current = false;

    async function run() {
      setPhase("image");
      setPreviewUrl("");
      setArtifact(null);
      let result: GeneratedArtifact;

      if (aiDeclined) {
        // 拒绝 AI：纯本地构建（同步），但仍分阶段呈现
        const local = buildLocalArtifact(dream.rawText, preset, dream.emotion.word);
        if (!cancelled) setPreviewUrl(local.imageUrl);
        setPhase("analysis");
        await new Promise((r) => setTimeout(r, 500));
        result = local;
      } else {
        // 同意 AI：先同步拿 Pollinations URL 喂 <img>，再 async 解析
        try {
          const url = generateDreamImage(dream.rawText, preset, seed);
          if (!cancelled) setPreviewUrl(url);
        } catch {
          /* generateArtifact 内部会兜底 */
        }
        setPhase("analysis");
        result = await generateArtifact(dream.rawText, preset, seed);
      }

      if (cancelled) return;

      // 预加载已失败 → 直接换种子图，避免 ArtifactView 再错一次
      if (imageErroredRef.current && !result.imageFallback) {
        result = {
          ...result,
          imageUrl: getSeedImage(preset, dream.emotion.word),
          imageSource: "seed",
          imageFallback: true,
        };
      }

      setArtifact(result);
      await updateDream({
        ...dream,
        artifact: {
          imageUrl: result.imageUrl,
          imageSource: result.imageSource,
          emotionAnalysis: result.emotionAnalysis,
          symbols: result.symbols,
          analysisSource: result.analysisSource,
        },
      });
      if (!cancelled) setPhase("done");
    }

    run().catch((err) => console.error("[DreamGate] generateArtifact failed:", err));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnboarding, showConsent, aiDeclined]);

  const handleImageError = () => {
    imageErroredRef.current = true;
    const fallbackUrl = getSeedImage(preset, dream.emotion.word);

    if (artifact) {
      if (artifact.imageUrl.startsWith("/seeds/")) return;
      const patched: GeneratedArtifact = {
        ...artifact,
        imageUrl: fallbackUrl,
        imageSource: "seed",
        imageFallback: true,
      };
      setArtifact(patched);
      updateDream({
        ...dream,
        artifact: {
          imageUrl: fallbackUrl,
          imageSource: "seed",
          emotionAnalysis: patched.emotionAnalysis,
          symbols: patched.symbols,
          analysisSource: patched.analysisSource,
        },
      }).catch((err) => console.error("[DreamGate] updateDream (img fallback) failed:", err));
    } else {
      if (previewUrl.startsWith("/seeds/")) return;
      setPreviewUrl(fallbackUrl);
    }
  };

  const showProgress = !showOnboarding && !showConsent && (phase !== "done" || !artifact);
  const showArtifactView = !showOnboarding && !showConsent && phase === "done" && !!artifact;

  return (
    <>
      <AestheticOnboarding
        open={showOnboarding}
        onConfirm={(p) => {
          setMeta({ ...meta, onboarded: true, aestheticPreset: p })
            .catch((err) => console.error("[DreamGate] setMeta failed:", err));
        }}
        onSkip={() => {
          setMeta({ ...meta, onboarded: true })
            .catch((err) => console.error("[DreamGate] setMeta failed:", err));
        }}
      />
      <AiConsentDialog
        open={showConsent}
        onAgree={() => {
          setMeta({ ...meta, aiConsent: true })
            .catch((err) => console.error("[DreamGate] setMeta failed:", err));
        }}
        onDecline={() => setAiDeclined(true)}
      />
      {showProgress && (
        <GenerationProgress
          phase={phase === "idle" ? "image" : phase}
          previewUrl={previewUrl}
          preset={preset}
          imageFallback={artifact?.imageFallback}
          analysisFallback={artifact?.analysisFallback}
          offline={artifact?.offline}
          onImageError={handleImageError}
        />
      )}
      {showArtifactView && artifact && (
        <ArtifactView dream={{ ...dream, artifact }} onImageError={handleImageError} />
      )}
    </>
  );
}
