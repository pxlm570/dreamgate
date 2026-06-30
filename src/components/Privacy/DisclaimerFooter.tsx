// DisclaimerFooter — 全站页脚免责声明（Task 8.3）
// fixed bottom 全站可见；"了解详情"打开 PrivacyInfo modal；X 关闭并写入 localStorage
// framer-motion slide-up 入场

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, X, Info } from "lucide-react";
import { Caption } from "@/components/ui";
import { PrivacyInfo } from "./PrivacyInfo";

const STORAGE_KEY = "dreamgate-disclaimer-dismissed";

export function DisclaimerFooter() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );
  const [showPrivacy, setShowPrivacy] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <>
      <motion.footer
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-dreamgate-deep/90 px-4 py-2 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <AlertCircle size={14} className="shrink-0 text-amber-300/80" />
          <Caption
            as="p"
            className="flex-1 text-[11px] leading-relaxed text-zinc-400"
          >
            DreamGate 是梦境自省与创意娱乐工具，所有 AI 解析仅供参考，不构成心理诊断或医疗建议。如遇持续情绪困扰，请咨询专业人士。
          </Caption>
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-dreamgate-ethereal transition-colors hover:text-white"
          >
            <Info size={12} />
            了解详情
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="关闭免责声明"
            className="shrink-0 text-dreamgate-text-muted transition-colors hover:text-dreamgate-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      </motion.footer>

      <PrivacyInfo open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
