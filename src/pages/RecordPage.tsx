// RecordPage — 梦境录入页
// 顶部 Backdrop + AtmosphereLayer（Ethereal 默认）+ 居中卡片含 RecordForm
// 保存后更新 streak（断签不惩罚）+ setSelectedDream + navigate('/dream/' + id)

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Backdrop, Display, Caption, SmoothScroll } from "@/components/ui";
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
      <SmoothScroll />
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-12 pt-24 sm:px-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 text-left"
        >
          <Display className="font-light leading-none tracking-tight text-[clamp(2.1rem,3.8vw,3rem)] text-dreamgate-text-primary">
            记录梦境
          </Display>
          <Caption as="span" className="mt-2 block text-sm">
            刚醒来时，先记下，再解析
          </Caption>
        </motion.header>

        {/* Double-bezel：外壳 + 内芯同心圆角 + 内高光，营造「机械质感玻璃托盘」 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-1.5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]"
        >
          <div className="rounded-[calc(2rem-0.375rem)] bg-dreamgate-elevated/70 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
            <RecordForm onSaved={handleSaved} />
          </div>
        </motion.div>
      </div>
    </Backdrop>
  );
}
