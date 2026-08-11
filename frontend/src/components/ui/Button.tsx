"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium select-none " +
  "transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "active:scale-[0.97] hover:scale-[1.02]";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-brand text-white shadow-[0_6px_20px_-6px_rgba(11,110,79,0.6)] " +
    "hover:brightness-110 hover:shadow-[var(--vsn-glow)] active:brightness-95",
  accent:
    "bg-accent text-white hover:bg-accent-strong shadow-[0_6px_20px_-6px_rgba(255,107,53,0.6)]",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:border-primary/60 hover:bg-surface",
  outline:
    "border border-primary text-primary hover:bg-primary/10",
  ghost: "text-foreground hover:bg-surface-2",
  danger: "bg-red-500/90 text-white hover:bg-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Spinner className="h-4 w-4" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}
