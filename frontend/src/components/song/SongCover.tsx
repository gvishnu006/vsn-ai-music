"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { coverPalette } from "@/lib/demo-data";
import { WaveformAnimation } from "@/components/ui/WaveformAnimation";

export function SongCover({
  seed,
  title,
  playing,
  className,
  showWave = true,
}: {
  seed: string;
  title?: string;
  playing?: boolean;
  className?: string;
  showWave?: boolean;
}) {
  const [a, b, c] = coverPalette(seed);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        className
      )}
      style={{
        background: `radial-gradient(120% 120% at 20% 10%, ${a} 0%, ${b} 55%, ${c} 110%)`,
      }}
      role="img"
      aria-label={title ? `Cover art for ${title}` : "Cover art"}
    >
      <motion.div
        className="absolute inset-0"
        animate={
          playing
            ? { scale: [1, 1.06, 1], opacity: [0.25, 0.4, 0.25] }
            : { scale: 1, opacity: 0.25 }
        }
        transition={{ duration: 3.5, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(60% 60% at 80% 90%, ${c}66, transparent 70%)`,
        }}
      />
      {showWave ? (
        <WaveformAnimation
          bars={20}
          playing={playing}
          height={40}
          gradient={false}
          className="relative opacity-90"
          barClassName="bg-white/80"
        />
      ) : null}
    </div>
  );
}
