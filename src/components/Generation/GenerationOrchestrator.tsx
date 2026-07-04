// GenerationOrchestrator — 生成编排器（Task 4 核心）
// 流程：onboarding → consent → generateArtifact → updateDream → ArtifactView
// 渐进式（4.6）：图像 URL 同步先渲染，解析 async 后渲染
// 兜底（4.7）：图像 onError → seedLibrary；拒绝 AI → 全本地规则 + 种子图

import { useEffect, useRef, useState } from "react";
import { useDreamStore } from "@/store/useDreamStore";
import { generateArtifact, generateDreamImage, preloadImage, type GeneratedArtifact } from "@/lib/ai";
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
  // 记录「加载失败过的图片 URL」集合：只有最终结果恰好用了失败 URL 才兜底换种子图。
  // （不能用布尔标记：gpt-image 路径下预览是 Pollinations、结果是 data URL，
  //   预览超时不代表结果失败，布尔会误杀 37s 后成功返回的 gpt-image 图。）
  const erroredUrlsRef = useRef<Set<string>>(new Set());
  // 同一 dream 只发起一次生成，去重 StrictMode 双跑 / 重渲染导致的重复 AI 调用
  const inFlightRef = useRef<{ key: string; promise: Promise<GeneratedArtifact> } | null>(null);

  const showOnboarding = !meta.onboarded;
  const showConsent = meta.onboarded && !meta.aiConsent && !aiDeclined;
  const preset = dream.aestheticPreset;
  const seed = hashSeed(dream.id);

  useEffect(() => {
    if (showOnboarding || showConsent) return;
    let cancelled = false;
    erroredUrlsRef.current = new Set();

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
          // 硬超时兜底：Pollinations 慢/挂时不无限等 <img>，超时即切种子图
          preloadImage(url, 9000).catch(() => {
            erroredUrlsRef.current.add(url);
            if (!cancelled) handleImageError();
          });
        } catch {
          /* generateArtifact 内部会兜底 */
        }
        setPhase("analysis");
        // 幂等：复用同一次生成，防止重复调用 /api/llm 浪费额度
        if (!inFlightRef.current || inFlightRef.current.key !== dream.id) {
          inFlightRef.current = {
            key: dream.id,
            promise: generateArtifact(dream.rawText, preset, seed),
          };
        }
        result = await inFlightRef.current.promise;
      }

      if (cancelled) return;

      // 结果所用的 URL 已被证实加载失败 → 换种子图，避免 ArtifactView 再错一次
      // （gpt-image data URL 与失败的 Pollinations 预览 URL 不同，不会被误杀）
      if (!result.imageFallback && result.imageUrl && erroredUrlsRef.current.has(result.imageUrl)) {
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
    // 记录当前正在展示、且加载失败的 URL
    const failing = artifact?.imageUrl || previewUrl;
    if (failing) erroredUrlsRef.current.add(failing);
    const fallbackUrl = getSeedImage(preset, dream.emotion.word);

    if (artifact) {
      if (artifact.imageUrl.startsWith("/seeds/")) {
        // 种子图也加载失败 → 清空 url，落到 ArtifactView 占位图标，避免停在坏图
        setArtifact({ ...artifact, imageUrl: "", imageSource: "seed", imageFallback: true });
        return;
      }
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
      if (previewUrl.startsWith("/seeds/")) {
        setPreviewUrl("");
        return;
      }
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
