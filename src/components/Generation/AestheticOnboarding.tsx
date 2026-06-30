// AestheticOnboarding — 首次美学预设引导 modal（Task 4.1）
// 4 预设卡片 2×2 网格，每卡含预览方块（套 .preset-{key}）+ 名称 + 适配情绪 + promptKeywords 摘要
// 选定后 onConfirm(presetName)；onSkip 可跳过（使用默认 Ethereal）

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { AESTHETIC_PRESETS } from "@/lib/aestheticPresets";
import { presetToKey } from "@/components/Atmosphere";
import { Button, Display, Caption } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AestheticPresetName } from "@/lib/types";

export interface AestheticOnboardingProps {
  open: boolean;
  onConfirm: (preset: AestheticPresetName) => void;
  onSkip?: () => void;
}

export function AestheticOnboarding({
  open,
  onConfirm,
  onSkip,
}: AestheticOnboardingProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-dreamgate-elevated/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6 text-center">
              <Display className="text-3xl text-dreamgate-text-primary sm:text-4xl">
                选择你的梦境美学
              </Display>
              <Caption as="p" className="mt-2 block text-sm">
                这将设定后续梦境插画的默认视觉基调，可随时在记录页更改
              </Caption>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {AESTHETIC_PRESETS.map((p, i) => {
                const filterClass = `preset-${presetToKey[p.name]}`;
                return (
                  <motion.button
                    key={p.name}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onConfirm(p.name)}
                    className="group relative overflow-hidden rounded-xl border border-white/8 bg-dreamgate-elevated/40 p-4 text-left transition-colors hover:border-dreamgate-ethereal/50 hover:bg-dreamgate-ethereal/5"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-16 w-16 shrink-0 rounded-lg border border-white/10",
                          filterClass,
                        )}
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(201,184,232,0.55), rgba(78,201,176,0.3), rgba(255,107,157,0.35))",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-lg tracking-wide text-dreamgate-text-primary">
                          {p.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-dreamgate-ethereal/80">
                          {p.emotionFit.join(" · ")}
                        </div>
                        <div className="mt-1.5 text-[11px] leading-snug text-dreamgate-text-muted">
                          {p.promptKeywords.slice(0, 3).join(" · ")}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {onSkip && (
              <div className="mt-6 flex justify-center">
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  跳过，使用默认 Ethereal
                  <ArrowRight size={14} />
                </Button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-dreamgate-text-muted">
              <Sparkles size={11} className="text-dreamgate-ethereal/70" />
              <span>美学预设决定插画风格与画廊色调</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
