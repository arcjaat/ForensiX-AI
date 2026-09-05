import { useState, useEffect, useRef } from "react";
import { Radio, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface NavbarProps {
  onNavigate?: (tab: string) => void;
  activeTab?: string;
}

export function Navbar({ onNavigate: _onNavigate, activeTab: _activeTab = "screening" }: NavbarProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
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
    const interval = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="flex items-center cursor-pointer py-1"
          >
            <img
              src="/logo.png"
              alt="Runtime Terror - ForensiX AI"
              className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.45)] transition-all duration-300 hover:drop-shadow-[0_0_22px_rgba(6,182,212,0.75)]"
            />
          </motion.div>
          <span className="hidden items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-950/30 px-3 py-1 font-tech text-xs font-semibold uppercase tracking-widest text-cyan-300 lg:inline-flex shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            SIH26188 • MHA Edition
          </span>
        </div>

        {/* Live Backend Telemetry & Status */}
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
              {isOnline === null ? "Connecting" : isOnline ? "Backend Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
