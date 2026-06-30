// PrivacyInfo — 隐私说明 modal（Task 8.3 隐私说明页）
// 三区块：本地存储 / AI 外发范围 / 用户权利（导出 + 清空带二次确认）
// 由 DisclaimerFooter 的"了解详情"链接打开，也可由其他入口独立渲染

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Database,
  Cloud,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button, Display, Heading, Body, Caption } from "@/components/ui";
import { ExportButton } from "./ExportButton";
import { useDreamStore } from "@/store/useDreamStore";

export interface PrivacyInfoProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyInfo({ open, onClose }: PrivacyInfoProps) {
  const dreams = useDreamStore((s) => s.dreams);
  const meta = useDreamStore((s) => s.meta);
  const clearAll = useDreamStore((s) => s.clearAll);
  const [confirming, setConfirming] = useState(false);

  const handleClearAll = async () => {
    await clearAll();
    setConfirming(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-dreamgate-elevated/90 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-4 top-4 text-dreamgate-text-muted transition-colors hover:text-dreamgate-text-primary"
            >
              <X size={18} />
            </button>

            <div className="mb-3 flex items-center gap-2 text-dreamgate-ethereal">
              <Shield size={18} />
              <span className="font-mono text-[11px] uppercase tracking-widest">
                隐私与数据
              </span>
            </div>

            <Display className="text-2xl text-dreamgate-text-primary">
              数据如何存放与流转
            </Display>
            <Caption as="p" className="mt-2 block text-sm leading-relaxed">
              DreamGate 尊重你的梦境隐私。以下说明数据存储位置与外部传输范围。
            </Caption>

            <div className="mt-6 space-y-5">
              {/* 本地存储 */}
              <section>
                <Heading
                  as="h3"
                  className="mb-2 flex items-center gap-2 text-base text-dreamgate-text-primary"
                >
                  <Database size={14} className="text-dreamgate-mystical" />
                  本地存储
                </Heading>
                <Body as="p" className="text-sm leading-relaxed">
                  所有梦境记录保存在浏览器 IndexedDB 中，仅存于本设备，不上传到任何服务器。清除浏览器数据将一并删除。
                </Body>
              </section>

              {/* AI 外发 */}
              <section>
                <Heading
                  as="h3"
                  className="mb-2 flex items-center gap-2 text-base text-dreamgate-text-primary"
                >
                  <Cloud size={14} className="text-dreamgate-ethereal" />
                  AI 外发范围
                </Heading>
                <Body as="p" className="text-sm leading-relaxed">
                  启用 AI 解析后，梦境内容会随请求发送至外部服务：
                </Body>
                <ul className="mt-2 space-y-1 text-sm text-dreamgate-text-secondary">
                  <li>· Pollinations：基于梦境片段生成插画 prompt（含原文摘录）</li>
                  <li>· SiliconFlow：解析梦境原文的情绪与符号</li>
                </ul>
                <Body as="p" className="mt-2 text-xs leading-relaxed text-dreamgate-text-muted">
                  你可拒绝 AI 解析，仅使用本地规则解析与种子图，梦境原文不会外发。
                </Body>
              </section>

              {/* 用户权利 */}
              <section>
                <Heading
                  as="h3"
                  className="mb-2 flex items-center gap-2 text-base text-dreamgate-text-primary"
                >
                  <Shield size={14} className="text-dreamgate-psychedelic" />
                  你的权利
                </Heading>
                <Body as="p" className="text-sm leading-relaxed">
                  可随时导出全部数据为 JSON，或清空所有梦境记录（不可恢复）。
                </Body>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ExportButton dreams={dreams} meta={meta} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="border-red-400/30 text-red-300/90 hover:border-red-400/50 hover:bg-red-500/10"
                    onClick={() => setConfirming(true)}
                    disabled={dreams.length === 0}
                  >
                    <Trash2 size={14} />
                    清空全部梦境
                  </Button>
                </div>
              </section>
            </div>

            {/* 二次确认 */}
            <AnimatePresence>
              {confirming && (
                <motion.div
                  className="mt-5 rounded-xl border border-red-400/30 bg-red-950/40 p-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 shrink-0 text-red-300"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-red-100">
                        确定要清空全部 {dreams.length} 条梦境吗？此操作不可恢复。
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="border-red-400/40 text-red-200 hover:border-red-400/60 hover:bg-red-500/20"
                          onClick={handleClearAll}
                        >
                          确认清空
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirming(false)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
