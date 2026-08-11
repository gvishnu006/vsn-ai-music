"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Geometric "V" logomark built from equalizer bars.
 * Bars sit on a V-shaped baseline and animate like an equalizer on hover.
 */
export function Logo({
  className,
  link,
  size = "md",
}: {
  className?: string;
  link?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(false);

  const bars = useMemo(() => {
    // 7 bars forming a V: heights dip toward the center
    const profile = [0.9, 0.7, 0.5, 0.35, 0.5, 0.7, 0.9];
    const heights: Record<typeof size, number> = { sm: 14, md: 22, lg: 34 };
    const base = heights[size];
    return profile.map((p, i) => ({
      height: Math.max(6, Math.round(base * p)),
      delay: i * 0.09,
    }));
  }, [size]);

  const content = (
    <span
      className={cn("group inline-flex items-center gap-2", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="VSN AI Music Generator"
    >
      <span
        className="inline-flex items-end justify-center gap-[3px] rounded-xl bg-surface-2 border border-border px-2 py-2 transition-shadow group-hover:shadow-[var(--vsn-glow)]"
        aria-hidden
      >
        {bars.map((b, i) => (
          <span
            key={i}
            className="eq-bar w-[5px] rounded-full bg-gradient-to-t from-primary via-primary to-[var(--vsn-amber)]"
            style={{
              height: hovered ? undefined : b.height,
              animationDelay: `${b.delay}s`,
              animationPlayState: hovered ? "running" : "paused",
              transform: hovered ? undefined : "scaleY(1)",
            }}
          />
        ))}
      </span>
      <span className="font-display font-bold tracking-tight text-foreground">
        <span className="text-gradient">VSN</span>
        <span className="text-muted"> Studio</span>
      </span>
    </span>
  );

  if (link) {
    return (
      <Link href={link} className="inline-flex items-center">
        {content}
      </Link>
    );
  }
  return content;
}
