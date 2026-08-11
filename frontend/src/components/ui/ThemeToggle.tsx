"use client";

import { motion } from "framer-motion";
import { Moon, Sun, Zap } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme-context";
import { THEME_META } from "@/lib/constants";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "neon", icon: Zap },
];

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn("flex gap-1 rounded-full border border-border bg-surface-2/60 p-1", className)}
      >
        {OPTIONS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            aria-label={THEME_META[value].label}
            title={THEME_META[value].label}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-full p-2 transition-all",
              theme === value
                ? "bg-gradient-brand text-white shadow"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Theme</p>
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = theme === value;
        return (
          <motion.button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
              active
                ? "border-primary bg-primary-soft/70"
                : "border-border hover:bg-surface-2"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                active ? "bg-gradient-brand text-white" : "bg-surface-2 text-muted"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">
                {THEME_META[value].label}
              </span>
              <span className="block text-xs text-muted">{THEME_META[value].preview}</span>
            </span>
            <span
              className="h-5 w-5 rounded-full border border-border"
              style={{ background: THEME_META[value].dot }}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
