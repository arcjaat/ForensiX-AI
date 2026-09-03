import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Radio, Sparkles } from "lucide-react";
import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 15_000;

export function Header() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = checking
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const result = await checkHealth(controller.signal);
      if (!cancelled) {
        setIsOnline(result.ok);
        setLatencyMs(result.latencyMs);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        {/* Brand & Agency Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.45)]">
            <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-tech text-2xl font-bold tracking-wider text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                ForensiX AI
              </span>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-tech text-xs font-bold text-cyan-300 border border-cyan-500/40 uppercase tracking-widest shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                SIH26188
              </span>
            </div>
            <span className="font-mono text-[11px] tracking-wide text-slate-400">
              AI-Based Fake Identity &amp; Document Screening System
            </span>
          </div>
          <span className="ml-3 hidden items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 font-tech text-xs font-semibold uppercase tracking-widest text-cyan-300 md:inline-flex shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            MHA Agency Edition
          </span>
        </div>

        {/* Live Backend Connection HUD */}
        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="hidden items-center gap-1.5 text-slate-400 md:flex">
            <span>Latency:</span>
            <span className="tabular-nums font-semibold text-slate-200">
              {latencyMs !== null ? `${latencyMs}ms` : "—"}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-md shadow-sm transition-colors",
              isOnline === null && "border-zinc-800 bg-zinc-900/80 text-slate-400",
              isOnline === true &&
                "border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
              isOnline === false &&
                "border-rose-500/40 bg-rose-950/40 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
            )}
          >
            <Radio className={cn("h-3 w-3", isOnline && "animate-pulse-dot")} strokeWidth={2.5} />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
              {isOnline === null ? "Connecting" : isOnline ? "Backend Live" : "Backend Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
