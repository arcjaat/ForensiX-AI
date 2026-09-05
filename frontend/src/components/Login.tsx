import { useState } from "react";
import { User, KeyRound, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export interface LoginProps {
  onLoginSuccess?: (officerId: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [badgeId, setBadgeId] = useState("OFC-9428-MHA");
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!badgeId.trim() || !passkey.trim()) {
      setError("Please input both Officer Badge ID and Security Passkey.");
      return;
    }
    setIsAuthenticating(true);
    setTimeout(() => {
      setIsAuthenticating(false);
      if (onLoginSuccess) {
        onLoginSuccess(badgeId);
      }
    }, 900);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#09090b] text-slate-100 px-4 py-12 overflow-hidden selection:bg-cyan-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[128px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card Container */}
        <div className="relative rounded-2xl border border-cyan-500/30 bg-zinc-950/85 p-8 shadow-[0_0_35px_rgba(6,182,212,0.18)] backdrop-blur-2xl">
          {/* Cyber Top Accent Line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]" />

          {/* Centered Large High-Res Brand Logo */}
          <div className="flex flex-col items-center text-center mb-7">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 350, damping: 15 }}
              className="relative py-2"
            >
              <img
                src="/logo.png"
                alt="Runtime Terror - ForensiX AI"
                className="h-20 md:h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all duration-300 hover:drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]"
              />
            </motion.div>

            <div className="mt-3 flex items-center gap-2">
              <span className="rounded bg-cyan-500/20 px-2.5 py-0.5 font-tech text-xs font-bold text-cyan-300 border border-cyan-500/40 uppercase tracking-widest shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                SIH26188
              </span>
              <span className="font-tech text-xs tracking-widest text-slate-400 uppercase">
                Air-Gapped Terminal
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-400">
              Ministry of Home Affairs • Evidentiary Screening System
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-rose-300 text-xs font-mono">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-tech text-xs uppercase tracking-widest text-slate-300 mb-1.5">
                Officer Badge ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="e.g. OFC-9428-MHA"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-9 py-2.5 font-mono text-xs text-white placeholder-slate-500 transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block font-tech text-xs uppercase tracking-widest text-slate-300 mb-1.5">
                Cryptographic Passkey
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-9 py-2.5 font-mono text-xs text-white placeholder-slate-500 transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="cyber"
              disabled={isAuthenticating}
              className="w-full h-12 text-sm justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
            >
              {isAuthenticating ? (
                <span>VERIFYING CREDENTIALS...</span>
              ) : (
                <>
                  <span>ACCESS SECURE WORKSTATION</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Security Notice */}
          <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
              CONFIDENTIAL & PRIVILEGED • RESTRICTED ACCESS ONLY
              <br />
              All biometric queries and evidentiary logs are stored locally.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
