import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrustScoreGauge } from "@/components/TrustScoreGauge";
import type { ScreeningResponse, Verdict } from "@/types/screening";

const VERDICT_META: Record<
  Verdict,
  {
    badgeVariant: "genuine" | "suspicious" | "fake";
    Icon: React.ComponentType<{ className?: string }>;
    accentBorder: string;
  }
> = {
  Genuine: {
    badgeVariant: "genuine",
    Icon: CheckCircle2,
    accentBorder: "border-emerald-500/40",
  },
  Suspicious: {
    badgeVariant: "suspicious",
    Icon: AlertTriangle,
    accentBorder: "border-amber-500/40",
  },
  Fake: {
    badgeVariant: "fake",
    Icon: XCircle,
    accentBorder: "border-rose-500/40",
  },
};

export interface VerdictCardProps {
  result: ScreeningResponse | null;
  isScreening: boolean;
}

export function VerdictCard({ result, isScreening }: VerdictCardProps) {
  const meta = result ? VERDICT_META[result.result.verdict] : null;
  const borderClass = meta ? meta.accentBorder : "border-ink-border";
  const glowClass = result?.result.verdict === "Genuine" 
    ? "glow-emerald" 
    : result?.result.verdict === "Suspicious" 
      ? "glow-amber" 
      : result?.result.verdict === "Fake" 
        ? "glow-rose" 
        : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={`relative overflow-hidden ${borderClass} ${glowClass} bg-ink-card/95 backdrop-blur-md shadow-xl transition-all duration-500`}>
        <CardHeader className="pb-3 border-b border-zinc-800/60">
          <CardTitle className="flex items-center gap-2 font-tech text-xl tracking-wider text-white">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            VERDICT &amp; TRUST INDEX
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-[240px] flex-col items-center justify-center gap-3 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-zinc-900/90 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <ShieldAlert className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-tech text-base font-semibold tracking-wider text-slate-200 uppercase">
                    {isScreening ? "ANALYZING MULTI-FACTOR SIGNALS…" : "AWAITING DOCUMENT UPLOAD"}
                  </p>
                  <p className="mt-1 max-w-[240px] font-mono text-xs text-slate-400">
                    {isScreening
                      ? "Running EasyOCR, ELA re-compression & Siamese Face Match"
                      : "Intake an Indian ID to compute fused Trust Score"}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center gap-4"
              >
                <TrustScoreGauge score={result.result.trust_score} verdict={result.result.verdict} />

                <Badge
                  variant={VERDICT_META[result.result.verdict].badgeVariant}
                  className="px-6 py-1.5 font-tech text-lg uppercase tracking-widest font-bold shadow-lg"
                >
                  {(() => {
                    const { Icon } = VERDICT_META[result.result.verdict];
                    return <Icon className="h-5 w-5 mr-1.5" />;
                  })()}
                  {result.result.verdict}
                </Badge>

                {result.ela.compression_warning && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                  >
                    <Alert variant="warning" className="border-amber-500/40 bg-amber-950/30">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <AlertTitle className="text-amber-300 font-tech text-sm tracking-wider uppercase">High Pre-Compression Warning</AlertTitle>
                      <AlertDescription className="text-amber-200/90 font-mono text-[11px]">
                        {result.ela.forensic_notes ||
                          "Heavy multi-pass JPEG compression detected (e.g. WhatsApp forward). ELA score is contextualized with OCR and face signals."}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <ul className="w-full space-y-2 border-t border-zinc-800/80 pt-3 font-mono text-xs leading-relaxed text-slate-300">
                  {result.result.explanation.map((line, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <span className="text-cyan-400 font-bold">&rsaquo;</span>
                      <span>{line}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
