"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  format?: (v: number) => string;
  label?: string;
  className?: string;
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  format,
  label,
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = min + ratio * (max - min);
      const stepped = Math.round(next / step) * step;
      onChange(Math.min(max, Math.max(min, stepped)));
    },
    [min, max, step, onChange]
  );

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground">{label}</span>
          <span className="font-mono text-xs text-primary">
            {format ? format(value) : value}
          </span>
        </div>
      ) : null}
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format ? format(value) : String(value)}
        tabIndex={0}
        className="group relative flex h-6 cursor-pointer touch-none items-center"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => dragging && updateFromClientX(e.clientX)}
        onPointerUp={() => {
          setDragging(false);
          onCommit?.(value);
        }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          let next = value;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") next = value + step;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value - step;
          if (next !== value) {
            e.preventDefault();
            const clamped = Math.min(max, Math.max(min, next));
            onChange(clamped);
            onCommit?.(clamped);
          }
        }}
      >
        <div className="absolute h-1.5 w-full rounded-full bg-border" />
        <div
          className="absolute h-1.5 rounded-full bg-gradient-brand"
          style={{ width: `${pct}%` }}
        />
        <div
          className={cn(
            "absolute h-4 w-4 rounded-full bg-white shadow-md ring-2 ring-primary transition-transform",
            dragging ? "scale-110" : "group-hover:scale-110"
          )}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}
