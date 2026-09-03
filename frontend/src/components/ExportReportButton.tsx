import { useState } from "react";
import { FileDown, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportInspectionReport } from "@/lib/pdfReport";
import type { ScreeningResponse } from "@/types/screening";

export interface ExportReportButtonProps {
  result: ScreeningResponse | null;
  fileName: string;
  originalImageUrl?: string | null;
  heatmapUrl?: string | null;
}

export function ExportReportButton({
  result,
  fileName,
  originalImageUrl,
  heatmapUrl,
}: ExportReportButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleExport = async () => {
    if (!result || status === "loading") return;
    try {
      setStatus("loading");
      await exportInspectionReport({
        result,
        fileName,
        originalImageUrl,
        heatmapUrl,
      });
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("PDF export failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return (
    <Button
      type="button"
      variant="cyber-sm"
      disabled={!result || status === "loading"}
      onClick={handleExport}
      className="gap-2.5 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
    >
      {status === "loading" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          <span>GENERATING AUDIT PDF...</span>
        </>
      ) : status === "success" ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400">AUDIT REPORT DOWNLOADED</span>
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <span className="text-rose-400">EXPORT FAILED</span>
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 text-cyan-400" />
          <span>EXPORT FORENSIC AUDIT PDF</span>
        </>
      )}
    </Button>
  );
}
