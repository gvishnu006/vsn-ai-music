"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface WaveformAnimationProps {
  bars?: number;
  data?: number[];
  playing?: boolean;
  animateIn?: boolean;
  mirror?: boolean;
  gradient?: boolean;
  height?: number;
  className?: string;
  barClassName?: string;
  delay?: number;
}

/** Pseudo-random but deterministic amplitudes so SSR and client match. */
function seededProfile(count: number): number[] {
  const out: number[] = [];
  let seed = 42;
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const envelope = 0.35 + 0.65 * Math.sin((i / (count - 1)) * Math.PI * 0.85);
    const v = r * envelope;
    out.push(0.25 + 0.75 * v);
  }
  return out;
}

export function WaveformAnimation({
  bars = 32,
  data,
  playing = false,
  animateIn = false,
  mirror = false,
  gradient = true,
  height = 56,
  className,
  barClassName,
  delay = 0,
}: WaveformAnimationProps) {
  const profile = useMemo(
    () => data?.length ? data.slice(0, bars) : seededProfile(bars),
    [data, bars]
  );

  const durations = useMemo(
    () =>
      Array.from(
        { length: profile.length },
        (_, i) => 0.8 + ((i * 37) % 10) / 10 + (i % 3) * 0.15
      ),
    [profile.length]
  );

  return (
    <div
      className={cn("flex items-center justify-center gap-[3px]", className)}
      style={{ height }}
      aria-hidden
    >
      {profile.map((v, i) => {
        const hPct = Math.max(8, Math.round(v * 100));
        const isActive = playing;
        return (
          <motion.span
            key={i}
            className={cn(
              "w-[4px] rounded-full",
              gradient
                ? "bg-gradient-to-t from-primary via-primary to-[var(--vsn-amber)]"
                : "bg-wave",
              barClassName
            )}
            style={{
              height: `${hPct}%`,
              transformOrigin: mirror ? "center" : "bottom",
              animationDelay: `${delay + i * 0.07}s`,
              animationDuration: `${durations[i]}s`,
            }}
            initial={animateIn ? { scaleY: 0 } : undefined}
            animate={
              animateIn
                ? { scaleY: isActive ? [0.4, 1, 0.4] : 1 }
                : undefined
            }
            transition={
              animateIn
                ? {
                    scaleY: {
                      repeat: Infinity,
                      duration: durations[i],
                      ease: "easeInOut",
                      delay: delay + i * 0.07,
                    },
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
