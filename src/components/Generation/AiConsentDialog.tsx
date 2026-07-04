// AiConsentDialog — AI 同意 dialog（Task 4 隐私最小可用版）
// 说明数据外发 Pollinations（图像 prompt）/ 大模型解析服务（原文解析）
// "同意并生成" → setMeta({aiConsent:true}) 走 AI；"仅本地解析" → 走规则降级 + 种子图

import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Cpu,
  Image as ImageIcon,
  FileText,
  Lock,
} from "lucide-react";
import { Button, Display, Caption } from "@/components/ui";

export interface AiConsentDialogProps {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export function AiConsentDialog({
  open,
  onAgree,
  onDecline,
}: AiConsentDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-dreamgate-elevated/85 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-2 text-dreamgate-ethereal">
              <ShieldCheck size={18} />
              <span className="font-mono text-[11px] uppercase tracking-widest">
                AI 数据使用同意
              </span>
            </div>

            <Display className="text-2xl text-dreamgate-text-primary">
              是否启用 AI 解析？
            </Display>

            <Caption as="p" className="mt-3 block text-sm leading-relaxed">
              启用后，梦境内容将发送至外部服务以生成更丰富的藏品：
            </Caption>

            <ul className="mt-3 space-y-2 text-sm text-dreamgate-text-secondary">
              <li className="flex items-start gap-2">
                <ImageIcon
                  size={14}
                  className="mt-0.5 shrink-0 text-dreamgate-ethereal/70"
                />
                <span>
                  <span className="text-dreamgate-text-primary">Pollinations</span>
                  ：基于梦境片段生成插画 prompt
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText
                  size={14}
                  className="mt-0.5 shrink-0 text-dreamgate-ethereal/70"
                />
                <span>
                  <span className="text-dreamgate-text-primary">大模型解析服务</span>
                  ：解析原文的情绪与符号
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Lock
                  size={14}
                  className="mt-0.5 shrink-0 text-dreamgate-ethereal/70"
                />
                <span>本应用不留存你的原文；第三方服务的留存以其隐私政策为准</span>
              </li>
            </ul>

            <div className="mt-6 flex flex-col gap-2">
              <Button variant="primary" size="md" onClick={onAgree}>
                <Cpu size={15} />
                同意并生成
              </Button>
              <Button variant="ghost" size="sm" onClick={onDecline}>
                仅本地解析（种子图 + 规则解析）
              </Button>
            </div>

            <p className="mt-3 text-center text-[11px] text-dreamgate-text-muted">
              拒绝后仅在本地解析，原文不外发；完整隐私说明见页脚「了解详情」
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
