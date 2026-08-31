import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent text-white shadow hover:bg-accent/80",
        secondary: "border-transparent bg-ink-raised text-slate-100 hover:bg-ink-border",
        destructive: "border-transparent bg-verdict-fake text-white shadow hover:bg-verdict-fake/80",
        outline: "text-slate-200 border-ink-border",
        genuine: "border-verdict-genuine/40 bg-verdict-genuine-dim/60 text-verdict-genuine font-semibold",
        suspicious: "border-verdict-suspicious/40 bg-verdict-suspicious-dim/60 text-verdict-suspicious font-semibold",
        fake: "border-verdict-fake/40 bg-verdict-fake-dim/60 text-verdict-fake font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
