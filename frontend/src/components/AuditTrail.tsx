import { History, Trash2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditEntry, Verdict } from "@/types/screening";

const VERDICT_BADGE: Record<Verdict, "genuine" | "suspicious" | "fake"> = {
  Genuine: "genuine",
  Suspicious: "suspicious",
  Fake: "fake",
};

export interface AuditTrailProps {
  entries: AuditEntry[];
  onClear: () => void;
}

export function AuditTrail({ entries, onClear }: AuditTrailProps) {
  return (
    <Card className="border-ink-border bg-ink-card/95 backdrop-blur-md shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-2.5">
          <History className="h-5 w-5 text-cyan-400" />
          <div>
            <CardTitle className="font-tech text-xl tracking-wider text-white">SESSION AUDIT TRAIL</CardTitle>
            <CardDescription>
              Chronological log of processed specimen documents in this active officer session.
            </CardDescription>
          </div>
        </div>
        {entries.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 text-xs text-slate-400 hover:text-slate-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear Log
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-slate-500">
            No document scans recorded yet this session.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 bg-zinc-900/60">
                  <TableHead className="text-slate-400">Timestamp</TableHead>
                  <TableHead className="text-slate-400">Source Specimen</TableHead>
                  <TableHead className="text-slate-400">Scan UUID</TableHead>
                  <TableHead className="text-slate-400">Trust Score</TableHead>
                  <TableHead className="text-slate-400">Final Verdict</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium text-slate-200 text-xs">
                      {entry.fileName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {entry.documentId.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="font-mono font-semibold tabular-nums text-slate-200 text-xs">
                      {entry.trustScore} / 100
                    </TableCell>
                    <TableCell>
                      <Badge variant={VERDICT_BADGE[entry.verdict]} className="font-mono text-[10px] uppercase">
                        {entry.verdict}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
