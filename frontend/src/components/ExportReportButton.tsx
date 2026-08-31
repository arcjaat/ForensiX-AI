import { useState } from "react";
import { FileDown, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportInspectionReport } from "@/lib/pdfReport";
import type { ScreeningResponse } from "@/types/screening";

export interface ExportReportButtonProps {
  result: ScreeningResponse | null;
  fileName: string;
}

export function ExportReportButton({ result, fileName }: ExportReportButtonProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleExport = () => {
    if (!result) return;
    try {
      exportInspectionReport(result, fileName);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      console.error("PDF export failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3500);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!result}
      onClick={handleExport}
      className="gap-2 transition-all"
    >
      {status === "success" ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400">PDF Downloaded</span>
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <span className="text-rose-400">Export Failed</span>
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          <span>Export PDF Report</span>
        </>
      )}
    </Button>
  );
}
