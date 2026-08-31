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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[15px] font-bold tracking-tight text-white">
                ForensiX AI
              </span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                SIH26188
              </span>
            </div>
            <span className="font-mono text-[11px] tracking-wide text-slate-400">
              AI-Based Fake Identity &amp; Document Screening System
            </span>
          </div>
          <span className="ml-3 hidden items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-300 md:inline-flex">
            <Sparkles className="h-3 w-3 text-cyan-400" />
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
