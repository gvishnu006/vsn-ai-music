"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";
import { WaveformAnimation } from "./WaveformAnimation";
import { cn } from "@/lib/cn";

const DEFAULT_MESSAGES = [
  "Reading the room…",
  "Writing the melody…",
  "Teaching the AI your vibe…",
  "Laying down the beat…",
  "Recording the vocals…",
  "Mixing the track…",
  "Mastering your song…",
];

export function Loading({
  status,
  messages = DEFAULT_MESSAGES,
  className,
  compact = false,
}: {
  status?: string;
  messages?: string[];
  className?: string;
  compact?: boolean;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [messages.length]);

  const message = status ?? messages[idx];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center shadow-[var(--vsn-shadow)]",
        compact && "p-6",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 200px at 50% 0%, var(--vsn-primary-soft), transparent 70%)",
        }}
      />
      <div className="relative flex items-center justify-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-primary breathe" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber breathe" style={{ animationDelay: "0.3s" }} />
        <span className="h-2.5 w-2.5 rounded-full bg-accent breathe" style={{ animationDelay: "0.6s" }} />
      </div>

      <WaveformAnimation
        bars={36}
        playing
        animateIn
        height={compact ? 48 : 72}
        className="w-full max-w-sm"
      />

      <div className="relative flex flex-col items-center gap-2">
        <Logo size="sm" />
        <p className="text-sm text-muted">Building your song</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-primary font-medium"
          >
            {message}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 max-w-xs text-xs text-muted">
          Free AI generation is slower during peak hours — your song is in the queue. Hang tight!
        </p>
      </div>
    </motion.div>
  );
}
