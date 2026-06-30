// VoiceCapture — Web Speech API 语音转写按钮
// 不支持时返回 null（隐藏）；支持时点击开始/停止，转写结果通过 onTranscript 回调 append。
// 每段 final 结果触发一次 onTranscript(seg)，调用方 append 到原文框；interim 实时显示为提示。

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

export function VoiceCapture({ onTranscript }: VoiceCaptureProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<RecognitionLike | null>(null);
  const Ctor = getRecognitionCtor();
  const supported = !!Ctor;

  useEffect(() => {
    if (!Ctor) return;
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
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      recRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Ctor]);

  if (!supported) return null;

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      setInterim("");
    } else {
      setInterim("");
      try {
        rec.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {interim && (
        <span className="max-w-[220px] truncate text-xs text-dreamgate-ethereal/70">
          {interim}
        </span>
      )}
      <Button
        type="button"
        variant="ethereal"
        size="sm"
        onClick={toggle}
        className={cn(
          listening &&
            "border-red-400/40 text-red-300 hover:shadow-[0_0_18px_rgba(248,113,113,0.4)]",
        )}
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
        {listening ? "停止" : "语音"}
      </Button>
    </div>
  );
}
