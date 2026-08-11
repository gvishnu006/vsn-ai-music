"use client";

import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { WaveformAnimation } from "@/components/ui/WaveformAnimation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-border bg-background-soft/50 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 320px at 15% 10%, var(--vsn-primary-soft), transparent 70%), radial-gradient(500px 320px at 90% 90%, var(--vsn-accent-soft), transparent 65%)",
          }}
        />
        <Logo link="/" />
        <div className="relative">
          <WaveformAnimation bars={44} playing animateIn height={90} className="mb-6" />
          <h2 className="font-display text-3xl font-bold leading-tight text-foreground">
            Make songs the world
            <br />
            hasn&apos;t <span className="text-gradient">heard yet.</span>
          </h2>
          <p className="mt-3 max-w-sm text-muted">
            Generate AI-sung songs in 31 languages, remix the community&apos;s best ideas, and build
            your own catalog — free every day.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
            {[
              ["10", "Free daily songs"],
              ["31", "Languages"],
              ["15+", "Voice styles"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl border border-border bg-surface/60 p-3 backdrop-blur">
                <p className="font-display text-lg font-bold text-gradient">{n}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} VSN Studio</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <div className="lg:hidden">
            <Logo link="/" size="sm" />
          </div>
          <ThemeToggle compact />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4">
          <div className="w-full max-w-sm">
            {children}
            {footer ? (
              <p className="mt-6 text-center text-sm text-muted">{footer}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
