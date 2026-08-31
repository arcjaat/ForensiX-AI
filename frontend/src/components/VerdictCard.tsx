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
  const borderClass = result ? VERDICT_META[result.result.verdict].accentBorder : "border-ink-border";

  return (
    <Card className={`relative overflow-hidden ${borderClass} bg-ink-card/95 backdrop-blur-md shadow-xl transition-colors duration-500`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          Verdict &amp; Trust Index
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[240px] flex-col items-center justify-center gap-3 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-slate-500">
                <ShieldAlert className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-xs text-slate-300">
                  {isScreening ? "Analyzing Multi-Factor Signals…" : "Awaiting Document Upload"}
                </p>
                <p className="mt-1 max-w-[220px] font-mono text-[10px] text-slate-500">
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
                className="px-5 py-1.5 text-sm uppercase tracking-wider font-semibold shadow-lg"
              >
                {(() => {
                  const { Icon } = VERDICT_META[result.result.verdict];
                  return <Icon className="h-4 w-4 mr-1.5" />;
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
                    <AlertTitle className="text-amber-300">High Pre-Compression Warning</AlertTitle>
                    <AlertDescription className="text-amber-200/90 font-mono text-[10px]">
                      {result.ela.forensic_notes ||
                        "Heavy multi-pass JPEG compression detected (e.g. WhatsApp forward). ELA score is contextualized with OCR and face signals."}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <ul className="w-full space-y-1.5 border-t border-zinc-800/80 pt-3 font-mono text-[11px] leading-relaxed text-slate-300">
                {result.result.explanation.map((line, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-accent font-bold">&rsaquo;</span>
                    <span>{line}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
