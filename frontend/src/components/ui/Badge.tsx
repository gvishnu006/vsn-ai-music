import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "primary" | "accent" | "neutral" | "amber" | "soft";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary border-primary/30",
  accent: "bg-accent-soft text-accent border-accent/30",
  neutral: "bg-surface-2 text-muted border-border",
  amber: "bg-[var(--vsn-accent-soft)] text-[var(--vsn-amber)] border-[var(--vsn-amber)]/30",
  soft: "bg-primary-soft/60 text-muted border-border",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
