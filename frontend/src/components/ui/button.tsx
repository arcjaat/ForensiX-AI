import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow hover:bg-accent/90",
        destructive: "bg-verdict-fake text-white shadow-sm hover:bg-verdict-fake/90",
        outline: "border border-ink-border bg-transparent shadow-sm hover:bg-ink-raised hover:text-slate-100",
        secondary: "bg-ink-raised text-slate-100 shadow-sm hover:bg-ink-border",
        ghost: "hover:bg-ink-raised hover:text-slate-100",
        link: "text-accent underline-offset-4 hover:underline",
        cyber: "font-tech text-xl px-6 py-3 bg-transparent border border-cyan-500 text-cyan-400 uppercase tracking-widest transition-all duration-300 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95",
        "cyber-sm": "font-tech text-base px-4 py-1.5 bg-transparent border border-cyan-500/80 text-cyan-400 uppercase tracking-wider transition-all duration-300 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] active:scale-95",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-[11px]",
        lg: "h-10 rounded-md px-8 text-sm",
        icon: "h-8 w-8",
        cyber: "h-12 px-6 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
