import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  UploadCloud,
  ImageIcon,
  CheckCircle2,
  RefreshCcw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { PreprocessResponse } from "@/types/screening";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const DEMO_SAMPLES = [
  {
    name: "Clean ID",
    file: "sample_clean.jpg",
    icon: ShieldCheck,
    badge: "Genuine",
    badgeColor: "text-verdict-genuine border-verdict-genuine/30 bg-verdict-genuine-dim/40",
    desc: "Single-gen specimen",
  },
  {
    name: "Tampered ID",
    file: "sample_tampered_dob.jpg",
    icon: AlertTriangle,
    badge: "Spliced DOB",
    badgeColor: "text-verdict-fake border-verdict-fake/30 bg-verdict-fake-dim/40",
    desc: "ELA anomaly trigger",
  },
  {
    name: "Compressed ID",
    file: "sample_whatsapp_forward.jpg",
    icon: FileQuestion,
    badge: "Multi-Hop Recompression",
    badgeColor: "text-verdict-suspicious border-verdict-suspicious/30 bg-verdict-suspicious-dim/40",
    desc: "WhatsApp artifact test",
  },
];

export interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  originalPreviewUrl: string | null;
  preprocessResult: PreprocessResponse | null;
  processedPreviewUrl: string | null;
  isPreprocessing: boolean;
  isScreening?: boolean;
  onReset: () => void;
}

export function UploadZone({
  onFileSelected,
  originalPreviewUrl,
  preprocessResult,
  processedPreviewUrl,
  isPreprocessing,
  isScreening = false,
  onReset,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      setUploadError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Unsupported file type. Please upload a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError("File size exceeds 10MB limit. Please upload a smaller scan.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleLoadDemo = async (sampleFile: string) => {
    try {
      setUploadError(null);
      setLoadingSample(sampleFile);
      const res = await fetch(`/samples/${sampleFile}`);
      if (!res.ok) throw new Error("Failed to load sample image");
      const blob = await res.blob();
      const file = new File([blob], sampleFile, { type: "image/jpeg" });
      onFileSelected(file);
    } catch (err) {
      console.error("Demo load failed:", err);
      setUploadError(`Failed to load preset ${sampleFile}. Please select a local file.`);
    } finally {
      setLoadingSample(null);
    }
  };

  return (
    <Card className="relative overflow-hidden border-ink-border bg-ink-card/95 backdrop-blur-md shadow-xl">
      <CardHeader className="border-b border-zinc-800/60 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-tech text-xl tracking-wider text-white">
            <UploadCloud className="h-5 w-5 text-cyan-400" />
            DOCUMENT INTAKE &amp; PREPROCESSING
          </CardTitle>
          {originalPreviewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-8 border-cyan-500/40 text-xs font-tech tracking-wider uppercase text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
              New Scan
            </Button>
          )}
        </div>
        <CardDescription>
          Drag and drop an Indian government ID or trigger rapid evaluation using demo specimen presets.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {uploadError && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {!originalPreviewUrl ? (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                }}
                className={cn(
                  "group relative flex cursor-pointer flex-col items-center justify-center gap-3.5 rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300",
                  isDragging
                    ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-cyan-500/50 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
                )}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-slate-400 group-hover:border-cyan-400/60 group-hover:text-cyan-400 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                  <UploadCloud className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-tech text-lg font-semibold tracking-wider text-slate-200 group-hover:text-cyan-300 transition-colors uppercase">
                    Drop document image here, or <span className="text-cyan-400 underline underline-offset-4">browse</span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    Supports JPG, PNG, WEBP &bull; Max 10MB
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* Quick Demo Action Buttons */}
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-tech text-sm font-bold tracking-widest text-cyan-300 uppercase">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Quick Demo Presets
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">One-click evaluation</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DEMO_SAMPLES.map((sample) => {
                    const Icon = sample.icon;
                    const isLoadingThis = loadingSample === sample.file;
                    return (
                      <button
                        key={sample.file}
                        type="button"
                        onClick={() => handleLoadDemo(sample.file)}
                        disabled={loadingSample !== null}
                        className={cn(
                          "group flex flex-col items-start rounded-md border border-zinc-800 bg-zinc-900/70 p-2.5 text-left transition-all hover:border-cyan-500/50 hover:bg-zinc-800/80 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] disabled:opacity-50",
                          isLoadingThis && "border-cyan-400 animate-pulse",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="flex items-center gap-1.5 font-tech text-base font-bold tracking-wide text-slate-200 group-hover:text-cyan-300">
                            <Icon className="h-4 w-4 text-slate-400 group-hover:text-cyan-400" />
                            {sample.name}
                          </span>
                          <span className={cn("rounded border px-1.5 py-0.2 font-mono text-[9px] uppercase", sample.badgeColor)}>
                            {sample.badge}
                          </span>
                        </div>
                        <span className="mt-1 font-mono text-[11px] text-slate-400 line-clamp-1">
                          {sample.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview-grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <PreviewPane
                label="Original Raw Upload"
                imageUrl={originalPreviewUrl}
                isAnalyzing={isPreprocessing || isScreening}
              />
              <PreviewPane
                label="Auto-Deskewed &amp; Cropped"
                imageUrl={processedPreviewUrl}
                isLoading={isPreprocessing}
                isAnalyzing={isScreening}
                badge={
                  preprocessResult ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-verdict-genuine">
                      <CheckCircle2 className="h-3 w-3" />
                      {preprocessResult.crop_method.replace("_", " ")}
                    </span>
                  ) : null
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

const HUD_DECODING_MESSAGES = [
  "> INITIALIZING OCR ENGINE...",
  "> CALCULATING ELA COMPRESSIONS...",
  "> EXTRACTING FACIAL BIOMETRICS...",
  "> FUSING MULTI-FACTOR RISK SIGNALS...",
  "> COMPUTING TRUST SCORE...",
];

function PreviewPane({
  label,
  imageUrl,
  isLoading,
  isAnalyzing,
  badge,
}: {
  label: string;
  imageUrl: string | null;
  isLoading?: boolean;
  isAnalyzing?: boolean;
  badge?: ReactNode;
}) {
  const showScan = isLoading || isAnalyzing;
  const [hudIndex, setHudIndex] = useState(0);

  // Cycle HUD decoding text rapidly during analysis
  useEffect(() => {
    if (!showScan) return;
    const timer = setInterval(() => {
      setHudIndex((prev) => (prev + 1) % HUD_DECODING_MESSAGES.length);
    }, 700);
    return () => clearInterval(timer);
  }, [showScan]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-ink-border bg-ink">
      <div className="flex items-center justify-between border-b border-ink-border bg-ink-raised/70 px-3.5 py-2">
        <span className="font-tech text-sm font-bold uppercase tracking-widest text-slate-300">
          {label}
        </span>
        {badge}
      </div>
      <div className="relative flex aspect-[4/3] items-center justify-center bg-zinc-950/70 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-contain select-none" />
        ) : isLoading ? null : (
          <ImageIcon className="h-8 w-8 text-slate-700" strokeWidth={1.5} />
        )}

        {/* Biometric Cyber-Scan Laser & HUD Overlay */}
        {showScan && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/75 backdrop-blur-[2px]">
            {/* Background Cyber Pixel Grid */}
            <div className="absolute inset-0 cyber-grid-pattern animate-cyber-grid pointer-events-none" />
            
            {/* Sweeping Laser Line with intense glow */}
            <motion.div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee,0_0_35px_#06b6d4,0_0_50px_#6366f1] z-20"
              animate={{
                top: ["0%", "100%", "0%"],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Glowing Laser Beam Trail */}
            <motion.div
              className="absolute inset-x-0 h-32 bg-gradient-to-b from-cyan-500/20 via-cyan-400/10 to-transparent pointer-events-none z-10"
              animate={{
                top: ["-25%", "75%", "-25%"],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Tactical HUD Decoding Text Overlay */}
            <div className="relative z-30 flex flex-col items-center gap-2 rounded-lg border border-cyan-500/40 bg-zinc-950/90 px-4 py-3 text-center shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md">
              <span className="font-tech text-base font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                {HUD_DECODING_MESSAGES[hudIndex]}
              </span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-mono text-[10px] text-slate-300">
                  {isLoading ? "OpenCV Rectification & CLAHE" : "AI Multi-Channel Neural Scan"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
