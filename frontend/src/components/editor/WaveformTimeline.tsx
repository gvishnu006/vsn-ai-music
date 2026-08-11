"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface WaveformTimelineProps {
  waveform: number[];
  duration: number;
  trimStart: number;
  trimEnd: number;
  playhead?: number;
  onChange: (start: number, end: number) => void;
  className?: string;
}

export function WaveformTimeline({
  waveform,
  duration,
  trimStart,
  trimEnd,
  playhead = -1,
  onChange,
  className,
}: WaveformTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<"start" | "end" | null>(null);

  const timeToX = (t: number) => (t / duration) * 100;
  const xToTime = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.min(duration, Math.max(0, ((clientX - rect.left) / rect.width) * duration));
    },
    [duration]
  );

  const handleDrag = useCallback(
    (clientX: number) => {
      if (!drag) return;
      const t = xToTime(clientX);
      if (drag === "start") onChange(Math.min(t, trimEnd - 0.1), trimEnd);
      else onChange(trimStart, Math.max(t, trimStart + 0.1));
    },
    [drag, xToTime, trimStart, trimEnd, onChange]
  );

  const startPct = timeToX(Math.max(0, trimStart));
  const endPct = timeToX(Math.min(duration, trimEnd));

  return (
    <div className={cn("select-none", className)}>
      <div
        ref={trackRef}
        className="relative h-24 cursor-crosshair touch-none overflow-hidden rounded-xl border border-border bg-surface-2/60"
        onPointerDown={(e) => {
          const t = xToTime(e.clientX);
          onChange(Math.min(t, Math.max(0, trimEnd - 0.1)), Math.max(t + 0.1, trimEnd > 0 ? trimEnd : t + 1));
          setDrag("start");
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => drag && handleDrag(e.clientX)}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {/* waveform bars */}
        <div className="flex h-full items-center gap-[1.5px] px-1">
          {waveform.map((v, i) => (
            <span
              key={i}
              className="flex-1 rounded-full"
              style={{
                height: `${Math.max(10, Math.round(v * 100))}%`,
                background: "var(--vsn-primary)",
                opacity: 0.35,
              }}
            />
          ))}
        </div>

        {/* selected region */}
        <div
          className="absolute inset-y-0 bg-gradient-brand/20"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />

        {/* playhead */}
        {playhead >= 0 ? (
          <div
            className="absolute inset-y-0 w-[2px] bg-accent"
            style={{ left: `${timeToX(playhead)}%` }}
          >
            <span className="absolute -top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-accent" />
          </div>
        ) : null}

        {/* trim handles */}
        <div
          role="slider"
          aria-label="Trim start"
          aria-valuemin={0}
          aria-valuemax={trimEnd}
          aria-valuenow={trimStart}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onChange(Math.max(0, trimStart - 1), trimEnd);
            if (e.key === "ArrowRight") onChange(Math.min(trimEnd - 0.1, trimStart + 1), trimEnd);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDrag("start");
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          className="absolute inset-y-0 z-10 flex w-4 cursor-ew-resize items-center justify-center"
          style={{ left: `calc(${startPct}% - 8px)` }}
        >
          <span className="h-full w-1 rounded-full bg-primary shadow" />
        </div>
        <div
          role="slider"
          aria-label="Trim end"
          aria-valuemin={trimStart}
          aria-valuemax={duration}
          aria-valuenow={trimEnd}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onChange(trimStart, Math.max(trimStart + 0.1, trimEnd - 1));
            if (e.key === "ArrowRight") onChange(trimStart, Math.min(duration, trimEnd + 1));
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setDrag("end");
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          className="absolute inset-y-0 z-10 flex w-4 cursor-ew-resize items-center justify-center"
          style={{ left: `calc(${endPct}% - 8px)` }}
        >
          <span className="h-full w-1 rounded-full bg-primary shadow" />
        </div>
      </div>

      {/* ruler */}
      <div className="mt-1 flex justify-between px-2 font-mono text-[10px] text-muted">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f}>{formatSec(duration * f)}</span>
        ))}
      </div>
    </div>
  );
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
