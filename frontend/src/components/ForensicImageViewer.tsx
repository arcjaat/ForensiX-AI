import { useState, useEffect } from "react";
import { Layers, Eye, EyeOff, Crosshair } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ELAResult, ELARegion } from "@/types/screening";

export interface ForensicImageViewerProps {
  baseImageUrl: string | null;
  heatmapUrl: string | null;
  ela: ELAResult | null;
}

export function ForensicImageViewer({ baseImageUrl, heatmapUrl, ela }: ForensicImageViewerProps) {
  const [opacity, setOpacity] = useState(60);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [regionsVisible, setRegionsVisible] = useState(true);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setNaturalSize(null);
  }, [baseImageUrl]);

  if (!baseImageUrl) {
    return (
      <Card className="border-ink-border bg-ink-card/95 backdrop-blur-md shadow-xl">
        <CardHeader className="border-b border-zinc-800/60 pb-3">
          <CardTitle className="flex items-center gap-2 font-tech text-xl tracking-wider text-white">
            <Crosshair className="h-5 w-5 text-cyan-400" />
            FORENSIC IMAGE FORENSICS (ELA)
          </CardTitle>
          <CardDescription>
            Error Level Analysis (JET colormap) heatmap overlay and anomaly brackets will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-xs text-slate-500 font-mono">
            Awaiting Document Intake
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-ink-border bg-ink-card/95 backdrop-blur-md shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3 border-b border-zinc-800/60">
        <div>
          <CardTitle className="flex items-center gap-2 font-tech text-xl tracking-wider text-white">
            <Crosshair className="h-5 w-5 text-cyan-400" />
            FORENSIC HEATMAP &amp; BOUNDING BRACKETS
          </CardTitle>
          <CardDescription>
            Error Level Analysis (ELA) 90% JPEG re-compression difference map.
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            variant={heatmapVisible ? "default" : "outline"}
            size="sm"
            onClick={() => setHeatmapVisible((v) => !v)}
            className="h-8 text-xs font-mono"
          >
            {heatmapVisible ? <Eye className="h-3.5 w-3.5 mr-1" /> : <EyeOff className="h-3.5 w-3.5 mr-1" />}
            Heatmap
          </Button>
          <Button
            type="button"
            variant={regionsVisible ? "default" : "outline"}
            size="sm"
            onClick={() => setRegionsVisible((v) => !v)}
            className="h-8 text-xs font-mono"
          >
            <Crosshair className="h-3.5 w-3.5 mr-1" />
            Regions ({ela?.suspicious_regions.length ?? 0})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {/* Main Document & Forensic Heatmap Canvas */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-inner">
          <img
            src={baseImageUrl}
            alt="Document under analysis"
            className="w-full select-none"
            onLoad={(e) => {
              const t = e.currentTarget;
              setNaturalSize({ w: t.naturalWidth, h: t.naturalHeight });
            }}
            draggable={false}
          />

          {/* ELA Heatmap with dynamic opacity */}
          <AnimatePresence>
            {heatmapUrl && heatmapVisible && (
              <motion.img
                key="heatmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: opacity / 100 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                src={heatmapUrl}
                alt="ELA heatmap overlay"
                className="pointer-events-none absolute inset-0 h-full w-full select-none mix-blend-screen"
                draggable={false}
              />
            )}
          </AnimatePresence>

          {/* SVG Target Brackets Overlay */}
          {regionsVisible && ela && naturalSize && (
            <svg
              viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              {ela.suspicious_regions.map((region, i) => (
                <RegionBracket key={i} region={region} index={i} />
              ))}
            </svg>
          )}

          {/* Single Forensic Laser Sweep Effect on Load */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-scan-sweep bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
        </div>

        {/* Floating Glassmorphism Controls Panel */}
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/80 p-3.5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Layers className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="w-24 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              ELA Blend
            </span>
            <Slider
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              min={0}
              max={100}
              step={1}
              disabled={!heatmapVisible}
              className="flex-1 max-w-xs"
            />
            <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-slate-200">
              {opacity}%
            </span>
          </div>

          {ela && (
            <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400 border-t border-zinc-800/80 pt-2 sm:border-t-0 sm:pt-0">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                {ela.suspicious_regions.length} anomaly region{ela.suspicious_regions.length !== 1 ? "s" : ""}
              </span>
              <span className="text-slate-200">
                Score: <span className="text-rose-400 font-semibold">{ela.tamper_score.toFixed(3)}</span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RegionBracket({ region, index }: { region: ELARegion; index: number }) {
  const { x, y, width, height } = region;
  const armLength = Math.max(Math.min(width, height) * 0.28, 10);
  const strokeWidth = Math.max(width, height) * 0.015 + 1.8;

  const corners = [
    `M ${x} ${y + armLength} L ${x} ${y} L ${x + armLength} ${y}`, // top-left
    `M ${x + width - armLength} ${y} L ${x + width} ${y} L ${x + width} ${y + armLength}`, // top-right
    `M ${x + width} ${y + height - armLength} L ${x + width} ${y + height} L ${x + width - armLength} ${y + height}`, // bottom-right
    `M ${x + armLength} ${y + height} L ${x} ${y + height} L ${x} ${y + height - armLength}`, // bottom-left
  ];

  return (
    <g className="animate-pulse">
      {corners.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#F43F5E"
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
        />
      ))}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#F43F5E"
        fillOpacity={0.12}
        stroke="#F43F5E"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text
        x={x + 4}
        y={Math.max(y - 6, 12)}
        fill="#F43F5E"
        fontSize="11"
        fontFamily="JetBrains Mono"
        fontWeight="bold"
      >
        [FLAGGED #{index + 1}]
      </text>
    </g>
  );
}
