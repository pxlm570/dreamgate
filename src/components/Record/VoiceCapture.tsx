// VoiceCapture — Web Speech API 语音转写按钮(STT)
// 不支持时渲染 disabled 按钮 + 提示(不再隐藏,让用户知道功能存在但当前不可用);
// 支持时点击开始/停止,转写结果通过 onTranscript 回调 append。
// 每段 final 结果触发一次 onTranscript(seg);interim 实时显示为「正在聆听…」反馈。
//
// 已知限制:Web Speech API 仅桌面 Chrome/Edge 可靠;iOS Safari 构造函数存在但 start 实际不可用——
// 故 supported 判断之外,start 失败也会给明确反馈,绝不静默。
// 竞态根治:每次 start 新建 recognition 实例,避免「同一实例 stop 后未等 onend 就 start」抛错。

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface VoiceCaptureProps {
  onTranscript: (text: string) => void;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) ?? null;
}

const UNSUPPORTED_HINT = "当前浏览器不支持语音录入,请用 Chrome/Edge 桌面端";

export function VoiceCapture({ onTranscript }: VoiceCaptureProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [hint, setHint] = useState("");
  const recRef = useRef<RecognitionLike | null>(null);
  const runningRef = useRef(false);
  const hintTimerRef = useRef<number | null>(null);
  const Ctor = getRecognitionCtor();
  const supported = !!Ctor;

  // 卸载清理:停 recognition + 清 hint 定时器
  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  const showHint = (msg: string, ms = 3200) => {
    setHint(msg);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setHint(""), ms);
  };

  // 新建 recognition 实例并绑定事件——每次 start 都用新实例,
  // 根治「同一实例 stop 后未等 onend 就 start 抛 InvalidStateError」的竞态。
  // 返回 null=启动成功;字符串=失败原因。
  const startRec = (): string | null => {
    if (!Ctor) return "unsupported";
    try {
      const rec = new Ctor();
      rec.lang = "zh-CN";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const seg: string = res[0]?.transcript ?? "";
          if (res.isFinal) {
            if (seg) onTranscript(seg);
          } else {
            live += seg;
          }
        }
        setInterim(live);
      };
      rec.onerror = (e: { error?: string }) => {
        const err = e?.error ?? "";
        if (err === "no-speech") {
          // 无语音输入:静默重置,不打扰用户
        } else if (err === "not-allowed" || err === "service-not-allowed") {
          showHint("麦克风权限被拒,请在浏览器设置中允许");
        } else if (err === "audio-capture") {
          showHint("未检测到麦克风设备");
        } else if (err === "network") {
          showHint("语音服务网络异常,请稍后重试");
        } else {
          showHint("语音录入异常,请重试");
        }
      };
      rec.onend = () => {
        runningRef.current = false;
        setListening(false);
        setInterim("");
      };
      rec.start();
      recRef.current = rec;
      runningRef.current = true;
      setListening(true);
      setInterim("");
      return null;
    } catch {
      return "start-failed";
    }
  };

  const stopRec = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    runningRef.current = false;
    setListening(false);
    setInterim("");
  };

  const toggle = () => {
    if (!supported) {
      showHint(UNSUPPORTED_HINT);
      return;
    }
    if (runningRef.current) {
      stopRec();
    } else {
      const reason = startRec();
      if (reason !== null) {
        // start 抛错:常见于 iOS Safari(构造函数存在但 start 不可用)或实例冲突
        showHint(
          reason === "unsupported"
            ? UNSUPPORTED_HINT
            : "无法启动语音录入,请重试或换用 Chrome/Edge 桌面端",
        );
      }
    }
  };

  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      {/* 录入反馈:正在聆听 + 实时转写 */}
      {listening && (
        <div className="flex w-full max-w-md items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 backdrop-blur-sm">
          <span className="mt-1 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-red-300">
              正在聆听…
            </div>
            {interim && (
              <div className="mt-0.5 break-words text-sm text-dreamgate-text-primary/80">
                {interim}
              </div>
            )}
          </div>
        </div>
      )}
      {/* 错误/提示反馈 */}
      {hint && !listening && (
        <span className="max-w-full text-right text-xs text-amber-300/90">{hint}</span>
      )}
      <Button
        type="button"
        variant="ethereal"
        size="sm"
        onClick={toggle}
        disabled={!supported}
        title={supported ? undefined : UNSUPPORTED_HINT}
        aria-label={
          supported ? (listening ? "停止语音录入" : "开始语音录入") : UNSUPPORTED_HINT
        }
        className={cn(
          listening &&
            "border-red-400/40 text-red-300 hover:shadow-[0_0_18px_rgba(248,113,113,0.4)]",
        )}
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
        {listening ? "停止" : supported ? "语音" : "语音(不可用)"}
      </Button>
    </div>
  );
}
