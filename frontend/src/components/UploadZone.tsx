import { useCallback, useRef, useState } from "react";
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
  onReset: () => void;
}

export function UploadZone({
  onFileSelected,
  originalPreviewUrl,
  preprocessResult,
  processedPreviewUrl,
  isPreprocessing,
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
    <Card className="relative overflow-hidden border-ink-border bg-ink-card/95 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-accent" />
            Document Intake &amp; Preprocessing
          </CardTitle>
          {originalPreviewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-7 border-ink-border text-xs text-slate-300 hover:text-white"
            >
              <RefreshCcw className="h-3 w-3 mr-1.5" />
              New Scan
            </Button>
          )}
        </div>
        <CardDescription>
          Drag and drop an Indian government ID or trigger rapid evaluation using demo specimen presets.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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
                    ? "border-accent bg-accent/10 shadow-[0_0_25px_rgba(99,102,241,0.25)]"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60",
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-slate-400 group-hover:border-accent/40 group-hover:text-accent group-hover:scale-105 transition-all">
                  <UploadCloud className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    Drop document image here, or <span className="text-accent underline underline-offset-4">browse</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
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
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-wider text-slate-400 uppercase">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
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
                          "group flex flex-col items-start rounded-md border border-zinc-800 bg-zinc-900/70 p-2.5 text-left transition-all hover:border-zinc-700 hover:bg-zinc-800/80 disabled:opacity-50",
                          isLoadingThis && "border-accent animate-pulse",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-200 group-hover:text-white">
                            <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-accent" />
                            {sample.name}
                          </span>
                          <span className={cn("rounded border px-1.5 py-0.2 font-mono text-[9px] uppercase", sample.badgeColor)}>
                            {sample.badge}
                          </span>
                        </div>
                        <span className="mt-1 font-mono text-[10px] text-slate-500 line-clamp-1">
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
              <PreviewPane label="Original Raw Upload" imageUrl={originalPreviewUrl} />
              <PreviewPane
                label="Auto-Deskewed &amp; Cropped"
                imageUrl={processedPreviewUrl}
                isLoading={isPreprocessing}
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

function PreviewPane({
  label,
  imageUrl,
  isLoading,
  badge,
}: {
  label: string;
  imageUrl: string | null;
  isLoading?: boolean;
  badge?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-ink-border bg-ink">
      <div className="flex items-center justify-between border-b border-ink-border bg-ink-raised/70 px-3.5 py-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
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

        {/* Biometric Cyber Laser Scan Animation */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-[2px]">
            {/* Background cyber grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:16px_16px]" />
            
            {/* Sweeping laser line */}
            <motion.div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_30px_#6366f1]"
              animate={{
                top: ["0%", "100%", "0%"],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Glowing laser head & scan beam */}
            <motion.div
              className="absolute inset-x-0 h-24 bg-gradient-to-b from-cyan-500/15 via-indigo-500/10 to-transparent pointer-events-none"
              animate={{
                top: ["-20%", "80%", "-20%"],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Center HUD status text */}
            <div className="relative z-10 flex flex-col items-center gap-1.5 rounded-md border border-cyan-500/30 bg-zinc-900/90 px-3.5 py-2 text-center shadow-lg backdrop-blur-md">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-400 animate-pulse">
                OPENCV RECTIFYING
              </span>
              <span className="font-mono text-[9px] text-slate-400">Contour Quad &amp; CLAHE</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
