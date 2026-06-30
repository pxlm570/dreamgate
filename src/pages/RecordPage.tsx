// RecordPage — 梦境录入页
// 顶部 Backdrop + AtmosphereLayer（Ethereal 默认）+ 居中卡片含 RecordForm
// 保存后更新 streak（断签不惩罚）+ setSelectedDream + navigate('/dream/' + id)

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Backdrop, Display, Caption } from "@/components/ui";
import { RecordForm } from "@/components/Record";
import { useDreamStore } from "@/store/useDreamStore";
import type { Meta } from "@/lib/types";

export default function RecordPage() {
  const navigate = useNavigate();
  const setView = useDreamStore((s) => s.setView);
  const setSelectedDream = useDreamStore((s) => s.setSelectedDream);
  const meta = useDreamStore((s) => s.meta);
  const setMeta = useDreamStore((s) => s.setMeta);

  useEffect(() => {
    setView("record");
  }, [setView]);

  const handleSaved = (id: string) => {
    // streak 更新：同一天不增；昨天 +1；更早或空重置为 1（断签不惩罚）
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const prev = meta.streak;
    let count: number;
    if (prev.lastDate === today) {
      count = prev.count;
    } else if (prev.lastDate === yesterday) {
      count = prev.count + 1;
    } else {
      count = 1;
    }
    const nextMeta: Meta = {
      ...meta,
      streak: { count, lastDate: today },
    };
    setMeta(nextMeta).catch((err) =>
      console.error("[DreamGate] setMeta failed:", err),
    );
    setSelectedDream(id);
    navigate(`/dream/${id}`);
  };

  return (
    <Backdrop preset="Ethereal" intensity={0.6}>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-12 sm:px-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 text-center"
        >
          <Display className="text-4xl text-dreamgate-text-primary sm:text-5xl">
            记录梦境
          </Display>
          <Caption as="span" className="mt-2 block text-sm">
            刚醒来时，先记下，再解析
          </Caption>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          className="rounded-2xl border border-white/5 bg-dreamgate-elevated/60 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8"
        >
          <RecordForm onSaved={handleSaved} />
        </motion.div>
      </div>
    </Backdrop>
  );
}
