import { useState } from "react";
import { AlertCircle, ScanFace } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { SelfieUpload } from "@/components/SelfieUpload";
import { ForensicImageViewer } from "@/components/ForensicImageViewer";
import { VerdictCard } from "@/components/VerdictCard";
import { SignalBreakdown } from "@/components/SignalBreakdown";
import { MetadataPanel } from "@/components/MetadataPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { ExportReportButton } from "@/components/ExportReportButton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScreening } from "@/hooks/useScreening";
import { resolveAssetUrl } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function App() {
  const {
    idFile,
    originalPreviewUrl,
    processedPreviewUrl,
    preprocessResult,
    isPreprocessing,
    screeningResult,
    isScreening,
    errorMessage,
    auditEntries,
    runScreeningPipeline,
    reset,
    clearAuditTrail,
  } = useScreening();

  const [pendingSelfie, setPendingSelfie] = useState<File | null>(null);

  const heatmapUrl = screeningResult ? resolveAssetUrl(screeningResult.ela.heatmap_path) : null;

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 selection:bg-indigo-500 selection:text-white pb-12">
      {/* Background ambient forensic glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[128px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-emerald-500/5 blur-[128px]" />
      </div>

      <Header />

      <main className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Screening Pipeline Alert</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        >
          {/* Left Column: Forensic Evidence & Intake (7 Cols) */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <motion.div variants={itemVariants}>
              <UploadZone
                onFileSelected={(file) => {
                  setPendingSelfie(null);
                  runScreeningPipeline(file, null);
                }}
                originalPreviewUrl={originalPreviewUrl}
                preprocessResult={preprocessResult}
                processedPreviewUrl={processedPreviewUrl}
                isPreprocessing={isPreprocessing}
                isScreening={isScreening}
                onReset={() => {
                  setPendingSelfie(null);
                  reset();
                }}
              />
            </motion.div>

            {idFile && (
              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 backdrop-blur-md sm:flex-row sm:items-center shadow-lg"
              >
                <div className="flex-1">
                  <SelfieUpload selfieFile={pendingSelfie} onSelect={setPendingSelfie} />
                </div>
                <Button
                  type="button"
                  variant="cyber-sm"
                  disabled={!pendingSelfie || isScreening}
                  onClick={() => idFile && runScreeningPipeline(idFile, pendingSelfie)}
                  className="h-10 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                >
                  <ScanFace className="h-4 w-4 mr-2 text-cyan-400" />
                  VERIFY FACE MATCH
                </Button>
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <ForensicImageViewer
                baseImageUrl={processedPreviewUrl ?? originalPreviewUrl}
                heatmapUrl={heatmapUrl}
                ela={screeningResult?.ela ?? null}
              />
            </motion.div>
          </div>

          {/* Right Column: AI Analysis, Verdict & Breakdown (5 Cols) */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <motion.div variants={itemVariants}>
              <VerdictCard result={screeningResult} isScreening={isScreening} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <SignalBreakdown result={screeningResult} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <MetadataPanel ocr={screeningResult?.ocr ?? null} />
            </motion.div>

            {screeningResult && (
              <motion.div variants={itemVariants} className="flex justify-end">
                <ExportReportButton
                  result={screeningResult}
                  fileName={idFile?.name ?? "specimen-id"}
                  originalImageUrl={processedPreviewUrl ?? originalPreviewUrl}
                  heatmapUrl={heatmapUrl}
                />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Bottom Section: Audit Trail */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6"
        >
          <AuditTrail entries={auditEntries} onClear={clearAuditTrail} />
        </motion.div>
      </main>
    </div>
  );
}

export default App;
