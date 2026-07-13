// ErrorBoundary — 渲染期错误边界
// 兜底任意子树渲染期抛错（尤指 3D Canvas 的 WebGL context lost / shader 编译失败 /
// 纹理解码异常），避免整树卸载白屏。事件回调里的异步错误不会被它捕获——那部分由
// 调用方就地 try/catch + 用户级反馈处理。
//
// 用法：
//   <ErrorBoundary>                    // 用默认 fallback（深色背景 + 重新进入 + 记录新梦）
//     <App />
//   </ErrorBoundary>
//
//   <ErrorBoundary fallback={(err, reset) => <CustomUI onReset={reset} />}>  // 自定义 fallback
//     <Canvas />
//   </ErrorBoundary>
//
// 注意：React 仍需 class component 实现 error boundary（hooks 无等价 API）。

import { Component, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定义兜底 UI：传 ReactNode 直接渲染；传函数则接收 (error, reset) 动态生成 */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** 重置回调（reset 被调用时触发，用于清外部状态） */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[DreamGate] ErrorBoundary caught:", error, info.componentStack ?? "");
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === "function") return fallback(this.state.error, this.reset);
    return fallback ?? <DefaultFallback error={this.state.error} onReset={this.reset} />;
  }
}

/** 默认兜底：深色背景 + 「梦境暂时失焦」+ 重新进入 + 记录新梦 */
export function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-[100dvh] w-screen flex-col items-center justify-center gap-6 bg-dreamgate-deep px-6 text-center"
    >
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-3xl font-light tracking-[0.2em] text-dreamgate-text-primary">
          梦境暂时失焦
        </p>
        <p className="max-w-md text-sm text-dreamgate-text-muted">
          场景渲染未能完成。可重新进入，或前往记录新的梦境。
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-dreamgate-ethereal/40 bg-dreamgate-elevated/30 px-6 py-2.5 text-sm tracking-wide text-dreamgate-ethereal backdrop-blur-sm transition hover:bg-dreamgate-ethereal/10"
        >
          重新进入
        </button>
        <a
          href="#/record"
          className="rounded-full border border-white/15 bg-dreamgate-ethereal/90 px-6 py-2.5 text-sm font-semibold tracking-wide text-dreamgate-deep transition hover:brightness-110"
        >
          记录新梦
        </a>
      </div>
      {import.meta.env.DEV && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-left text-xs text-red-300">
          {error.message}
          {error.stack ? `\n${error.stack}` : ""}
        </pre>
      )}
    </div>
  );
}
