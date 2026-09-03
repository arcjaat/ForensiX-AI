import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/types/screening";

export interface TrustScoreGaugeProps {
  score: number; // 0-100
  verdict: Verdict;
}

const VERDICT_COLOR: Record<Verdict, string> = {
  Genuine: "#10B981",
  Suspicious: "#F59E0B",
  Fake: "#EF4444",
};

const VERDICT_GLOW: Record<Verdict, string> = {
  Genuine: "rgba(16, 185, 129, 0.25)",
  Suspicious: "rgba(245, 158, 11, 0.25)",
  Fake: "rgba(239, 68, 68, 0.25)",
};

const ARC_START_DEG = -225;
const ARC_END_DEG = 45;
const ARC_SWEEP_DEG = ARC_END_DEG - ARC_START_DEG; // 270 deg
const RADIUS = 80;
const CENTER = 100;
const STROKE_WIDTH = 12;

function polarToCartesian(angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + RADIUS * Math.cos(angleRad),
    y: CENTER + RADIUS * Math.sin(angleRad),
  };
}

function describeArc(startDeg: number, endDeg: number) {
  const start = polarToCartesian(startDeg);
  const end = polarToCartesian(endDeg);
  const largeArcFlag = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function TrustScoreGauge({ score, verdict }: TrustScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = VERDICT_COLOR[verdict];
  const glow = VERDICT_GLOW[verdict];
  const circumferenceFraction = ARC_SWEEP_DEG / 360;
  const trackLength = 2 * Math.PI * RADIUS * circumferenceFraction;

  // Smooth Spring Animation for the numeric counter
  const springValue = useSpring(0, { stiffness: 60, damping: 15 });
  const displayScore = useTransform(springValue, (current) => Math.round(current));
  const [animatedNumber, setAnimatedNumber] = useState(0);

  useEffect(() => {
    springValue.set(clamped);
    const unsubscribe = displayScore.on("change", (latest) => {
      setAnimatedNumber(latest);
    });
    return () => unsubscribe();
  }, [clamped, springValue, displayScore]);

  const valueAngle = ARC_START_DEG + (clamped / 100) * ARC_SWEEP_DEG;

  return (
    <div className="relative flex flex-col items-center">
      {/* Background glow halo */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40 pointer-events-none transition-colors duration-700"
        style={{ background: glow }}
      />

      <svg viewBox="0 0 200 160" className="w-full max-w-[240px] drop-shadow-md">
        {/* Background track */}
        <path
          d={describeArc(ARC_START_DEG, ARC_END_DEG)}
          fill="none"
          stroke="#18181b"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* Animated value arc */}
        <motion.path
          d={describeArc(ARC_START_DEG, ARC_END_DEG)}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${trackLength}`}
          initial={{ strokeDashoffset: trackLength }}
          animate={{ strokeDashoffset: trackLength * (1 - clamped / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Needle indicator dot */}
        <motion.circle
          initial={{
            cx: polarToCartesian(ARC_START_DEG).x,
            cy: polarToCartesian(ARC_START_DEG).y,
          }}
          animate={{
            cx: polarToCartesian(valueAngle).x,
            cy: polarToCartesian(valueAngle).y,
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          r={5.5}
          fill={color}
          stroke="#09090b"
          strokeWidth={2.5}
          className="shadow-sm"
        />

        {/* Scale labels */}
        <text x="14" y="146" className="fill-slate-500 font-mono text-[10px]" fontSize="9">
          0
        </text>
        <text x="180" y="146" className="fill-slate-500 font-mono text-[10px]" fontSize="9" textAnchor="end">
          100
        </text>
      </svg>

      {/* Numerical score readout */}
      <div className="absolute top-[44px] flex flex-col items-center select-none">
        <span
          className={cn("font-tech text-5xl font-bold tabular-nums tracking-wider transition-colors duration-500 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]")}
          style={{ color }}
        >
          {animatedNumber}
        </span>
        <span className="font-tech text-xs font-semibold uppercase tracking-widest text-slate-400">
          Trust Score
        </span>
      </div>
    </div>
  );
}
