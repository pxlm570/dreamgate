// ReportPage — 潜意识报告页（Task 7）
// StreakCard + EmotionCalendar + EmotionDistribution + DimensionSummary
// 空状态：dreams.length === 0 引导记录第一场梦；有数据：framer-motion stagger 入场

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Backdrop, Display, Caption, Button } from "@/components/ui";
import {
  StreakCard,
  EmotionCalendar,
  EmotionDistribution,
  DimensionSummary,
} from "@/components/Tracking";
import { useDreamStore } from "@/store/useDreamStore";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function ReportPage() {
  const setView = useDreamStore((s) => s.setView);
  const dreams = useDreamStore((s) => s.dreams);
  const meta = useDreamStore((s) => s.meta);

  useEffect(() => {
    setView("report");
  }, [setView]);

  const hasDreams = dreams.length > 0;

  return (
    <Backdrop preset="Ethereal" intensity={0.5}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-10 sm:px-8 sm:py-14">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <Caption
              as="div"
              className="text-[11px] uppercase tracking-widest text-dreamgate-text-muted"
            >
              潜意识报告
            </Caption>
            <Display className="mt-1 text-3xl text-dreamgate-text-primary sm:text-4xl">
              情绪图谱
            </Display>
          </div>
          <Link to="/gallery">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} />
              返回画廊
            </Button>
          </Link>
        </motion.header>

        {!hasDreams ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-1 flex-col items-center justify-center text-center"
          >
            <Display className="text-2xl text-dreamgate-text-primary sm:text-3xl">
              你的情绪图谱尚未显现
            </Display>
            <Caption
              as="p"
              className="mt-3 max-w-md text-sm text-dreamgate-text-secondary"
            >
              记录第一场梦后，这里会出现你的情绪图谱——连续记梦、热力图、维度分布，揭开潜意识的纹理。
            </Caption>
            <Link to="/record" className="mt-8">
              <Button variant="ethereal" size="md">
                记录第一场梦
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-5 lg:grid-cols-2"
          >
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <StreakCard streak={meta.streak} />
            </motion.div>
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <EmotionCalendar dreams={dreams} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <EmotionDistribution dreams={dreams} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <DimensionSummary dreams={dreams} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </Backdrop>
  );
}
