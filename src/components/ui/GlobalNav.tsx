// GlobalNav — 全局浮岛导航（统一浏览动线）
// 让 画廊 / 记录 / 报告 / 梦池 在任意页面随处可达，修复「报告/梦池是孤儿页、进梦境回不去」的动线断点。
// 顶部居中浮岛玻璃胶囊，避开底部免责页脚；镜之门沉浸开场不显示。

import { Link, useLocation } from "react-router-dom";
import { Images, PenLine, Activity, Waves, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSilverFilter, setSilverFilter } from "@/lib/silverFilter";

interface NavItem {
  to: string;
  label: string;
  Icon: typeof Images;
  /** 该项在哪些路径下算「当前」 */
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  { to: "/gallery", label: "画廊", Icon: Images, match: (p) => p.startsWith("/gallery") || p.startsWith("/dream") },
  { to: "/record", label: "记录", Icon: PenLine, match: (p) => p.startsWith("/record") },
  { to: "/report", label: "报告", Icon: Activity, match: (p) => p.startsWith("/report") },
  { to: "/pool", label: "梦池", Icon: Waves, match: (p) => p.startsWith("/pool") },
];

export function GlobalNav() {
  const { pathname } = useLocation();
  const silver = useSilverFilter();
  // 镜之门（沉浸开场）不显示导航
  if (pathname === "/") return null;

  return (
    <nav
      aria-label="主导航"
      className="pointer-events-auto fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-dreamgate-elevated/50 p-1 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      {ITEMS.map(({ to, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              active
                ? "bg-white/10 text-dreamgate-text-primary"
                : "text-dreamgate-text-muted hover:text-dreamgate-text-secondary",
            )}
          >
            <Icon
              size={14}
              strokeWidth={1.6}
              className={active ? "text-dreamgate-ethereal" : undefined}
            />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
      {/* 「银盐梦境」滤镜开关（试验特性）：一键在风格化版与干净版之间切换 */}
      <span className="mx-0.5 h-4 w-px bg-white/10" aria-hidden />
      <button
        type="button"
        aria-pressed={silver ? "true" : "false"}
        title={silver ? "关闭银盐梦境滤镜" : "开启银盐梦境滤镜"}
        onClick={() => setSilverFilter(!silver)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          silver
            ? "bg-white/10 text-dreamgate-ethereal"
            : "text-dreamgate-text-muted hover:text-dreamgate-text-secondary",
        )}
      >
        <Sparkles size={14} strokeWidth={1.6} />
        <span className="hidden sm:inline">银盐</span>
      </button>
    </nav>
  );
}
