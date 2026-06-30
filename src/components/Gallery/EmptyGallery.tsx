// EmptyGallery — 空状态引导录入
// 你的档案馆还是空的 + 月亮图标 + 引导文案 + "记录第一场梦"按钮（Link to /record）
// 底部追加 SeedDataPanel：或加载示例梦境（Task 9）

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MoonStar, Plus } from "lucide-react";
import { Display, Body, Caption, Button } from "@/components/ui";
import { SeedDataPanel } from "@/components/SeedData";

export function EmptyGallery() {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-dreamgate-ethereal/30"
        style={{ boxShadow: "0 0 60px -15px rgba(201,184,232,0.4)" }}
      >
        <MoonStar size={36} className="animate-pulse-glow text-dreamgate-ethereal" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2 }}
      >
        <Display className="text-4xl text-dreamgate-text-primary sm:text-5xl">
          你的档案馆还是空的
        </Display>
        <div className="mx-auto my-5 h-px w-24 bg-gradient-to-r from-transparent via-dreamgate-ethereal/60 to-transparent" />
        <Body as="p" className="text-base">
          每一场梦都是潜意识寄来的信。
          <br />
          趁记忆还温热，把它写下来。
        </Body>
        <Caption as="p" className="mt-3 block text-xs">
          在走廊尽头，第一扇门等你点亮
        </Caption>
        <Link to="/record" className="mt-8 inline-block">
          <Button variant="primary" size="md">
            <Plus size={16} />
            记录第一场梦
          </Button>
        </Link>
      </motion.div>

      {/* 或分隔 + 种子数据管理面板 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-10 flex w-full flex-col items-center gap-4"
      >
        <div className="flex items-center gap-3 text-dreamgate-text-muted">
          <span className="h-px w-12 bg-dreamgate-border-strong/60" />
          <Caption as="span" className="text-[11px] uppercase tracking-widest">或</Caption>
          <span className="h-px w-12 bg-dreamgate-border-strong/60" />
        </div>
        <SeedDataPanel />
      </motion.div>
    </div>
  );
}
