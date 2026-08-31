import { ScanFace, ScanText, FlaskConical, CircleSlash } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ScreeningResponse } from "@/types/screening";

export interface SignalBreakdownProps {
  result: ScreeningResponse | null;
}

export function SignalBreakdown({ result }: SignalBreakdownProps) {
  return (
    <Card className="border-ink-border bg-ink-card/95 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" />
          Multi-Factor Signal Breakdown
        </CardTitle>
        <CardDescription>
          Individual vision signal weights contributing to the fused Trust Score.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignalRow
          icon={<ScanText className="h-4 w-4" />}
          label="OCR Field Confidence (25%)"
          value={result ? result.ocr.mean_confidence : null}
          detail={result ? `${Object.keys(result.ocr.fields).length} field(s) extracted & verified` : undefined}
          delay={0.1}
        />
        <SignalRow
          icon={<FlaskConical className="h-4 w-4" />}
          label="ELA Tamper Anomaly (40%)"
          value={result ? result.ela.tamper_score : null}
          detail={
            result
              ? `${result.ela.suspicious_regions.length} anomaly region(s) flagged${
                  result.ela.compression_warning ? " · compression warning" : ""
                }`
              : undefined
          }
          invert
          delay={0.2}
        />
        <SignalRow
          icon={<ScanFace className="h-4 w-4" />}
          label="Siamese Face Match (35%)"
          value={result ? result.face_match.similarity_score : null}
          detail={
            result
              ? result.face_match.face_detected_on_id && result.face_match.face_detected_on_selfie
                ? "Biometric face verified on both frames"
                : "Awaiting live selfie capture"
              : undefined
          }
          delay={0.3}
        />
      </CardContent>
    </Card>
  );
}

function SignalRow({
  icon,
  label,
  value,
  detail,
  invert = false,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: number | null;
  detail?: string;
  invert?: boolean;
  delay?: number;
}) {
  const pct = value !== null ? Math.round(value * 100) : null;
  const goodness = value === null ? null : invert ? 1 - value : value;
  const barColor =
    goodness === null
      ? "bg-zinc-800"
      : goodness >= 0.75
        ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        : goodness >= 0.45
          ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          : "bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <span className="text-slate-400">{icon}</span>
          {label}
        </div>
        <span className="font-mono text-xs font-semibold tabular-nums text-slate-200">
          {pct !== null ? `${pct}%` : "—"}
        </span>
      </div>
      <Progress value={pct ?? 0} className="h-2 bg-zinc-950" indicatorClassName={barColor} />
      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
        {value === null && <CircleSlash className="h-3 w-3 text-slate-500" />}
        {detail ?? "Awaiting intake pipeline execution"}
      </div>
    </motion.div>
  );
}
