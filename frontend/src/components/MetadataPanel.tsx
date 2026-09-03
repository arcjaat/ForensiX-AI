import { Lock, ScanText } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import type { OCRResult } from "@/types/screening";

const FIELD_LABELS: Record<string, string> = {
  name: "Full Name",
  dob: "Date of Birth",
  id_number: "ID / Aadhaar No.",
  address: "Address",
};

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
  if (confidence >= 0.5) return "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
  return "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
}

export interface MetadataPanelProps {
  ocr: OCRResult | null;
}

export function MetadataPanel({ ocr }: MetadataPanelProps) {
  const fieldEntries = ocr ? Object.entries(ocr.fields) : [];

  return (
    <Card className="border-ink-border bg-ink-card/95 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-3 border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-tech text-xl tracking-wider text-white">
            <ScanText className="h-5 w-5 text-cyan-400" />
            EXTRACTED METADATA (OCR)
          </CardTitle>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-950/40 rounded px-2.5 py-0.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <Lock className="h-3 w-3" />
            PII Redacted
          </span>
        </div>
        <CardDescription>
          EasyOCR parsed text lines. Sensitive identification sequences are strictly masked.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {fieldEntries.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-slate-500">
            No fields extracted yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/60">
                  <TableHead className="text-slate-400">Field</TableHead>
                  <TableHead className="text-slate-400">Value (Sanitized)</TableHead>
                  <TableHead className="w-[140px] text-slate-400">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldEntries.map(([key, field], idx) => {
                  const isRedactedField =
                    key.toLowerCase().includes("id") ||
                    field.value.includes("XXXX") ||
                    field.value.includes("[Aadhaar Redacted]");

                  return (
                    <motion.tr
                      key={key}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-300">
                        {FIELD_LABELS[key] ?? key}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-100">
                          {isRedactedField && <Lock className="h-3 w-3 text-amber-400 shrink-0" />}
                          <span className={isRedactedField ? "text-amber-300 font-semibold" : ""}>
                            {field.value}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={field.confidence * 100}
                            className="h-1.5 bg-zinc-800"
                            indicatorClassName={confidenceColor(field.confidence)}
                          />
                          <span className="w-9 shrink-0 font-mono text-[10px] font-semibold tabular-nums text-slate-300">
                            {Math.round(field.confidence * 100)}%
                          </span>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
