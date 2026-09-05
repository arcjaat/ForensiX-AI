import { useState } from "react";
import {
  ShieldCheck,
  Crosshair,
  ScanFace,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  activeSection?: string;
  onSelectSection?: (section: string) => void;
}

export function Sidebar({
  activeSection = "intake",
  onSelectSection,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    { id: "intake", label: "Document Intake", icon: ShieldCheck },
    { id: "ela", label: "ELA Forensics", icon: Crosshair },
    { id: "biometrics", label: "Face Biometrics", icon: ScanFace },
    { id: "audit", label: "Session Audit Trail", icon: FileSpreadsheet },
    { id: "settings", label: "System Config", icon: Settings },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl h-screen select-none z-30"
    >
      {/* Top Header with Brand Logo */}
      <div className="flex h-16 items-center justify-between px-3 border-b border-zinc-800/80 overflow-hidden">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2.5 cursor-pointer overflow-hidden"
        >
          <img
            src="/logo.png"
            alt="Runtime Terror"
            className={cn(
              "object-contain transition-all duration-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]",
              collapsed ? "h-8 w-8 object-left" : "h-10 w-auto"
            )}
          />
        </motion.div>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1.5 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection?.(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-tech tracking-wider uppercase transition-all duration-200",
                isActive
                  ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] font-bold"
                  : "text-slate-400 hover:border-zinc-800 hover:bg-zinc-900/60 hover:text-slate-200"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Node Status */}
      <div className="border-t border-zinc-800/80 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-slate-400 font-mono text-[10px]">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <div className="truncate leading-tight">
              <p className="text-slate-200 font-semibold">Local Node 01</p>
              <p className="text-slate-500">Air-Gapped Active</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
        )}
      </div>
    </motion.aside>
  );
}
