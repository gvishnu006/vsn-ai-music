"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Compass,
  Home,
  Library,
  LogOut,
  Settings,
  ShieldCheck,
  Shuffle,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/studio", label: "Create", icon: Wand2 },
  { href: "/library", label: "My Studio", icon: Library },
  { href: "/remix", label: "Remix", icon: Shuffle },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, demoMode, signOut } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* ------- Desktop sidebar ------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background-soft/60 backdrop-blur lg:flex">
        <div className="flex h-20 items-center px-6">
          <Logo link="/" size="md" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4" aria-label="Primary">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gradient-brand opacity-15"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-5 w-5" />
                <span className="relative z-10">{label}</span>
                {href === "/studio" ? (
                  <span className="relative z-10 ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    FREE
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-4 px-5 pb-5">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Zap className="h-3.5 w-3.5" /> Free tier
            </div>
            <p className="text-xs text-muted">
              Generate up to 10 songs per day, free. No card needed.
            </p>
          </div>
          <ThemeToggle compact />
          {user ? (
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Link
                href={`/user/${user.uid}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition-colors hover:bg-surface-2"
              >
                <Avatar src={user.photoURL} name={user.displayName} className="h-10 w-10" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {user.displayName}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {demoMode ? "Demo session" : user.email}
                  </span>
                </span>
              </Link>
              <Link
                href="/settings"
                title="Settings"
                aria-label="Settings"
                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Link>
              {user.isAdmin ? (
                <Link
                  href="/admin"
                  title="Moderation"
                  aria-label="Moderation"
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              ) : null}
              <button
                onClick={() => signOut()}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* ------- Mobile top bar ------- */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
        <Logo link="/" size="sm" />
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          {user ? (
            <Link href={`/user/${user.uid}`} aria-label="My profile">
              <Avatar src={user.photoURL} name={user.displayName} className="h-8 w-8" />
            </Link>
          ) : null}
        </div>
      </header>

      {/* ------- Content ------- */}
      <main className="pb-24 lg:pb-8">{children}</main>

      {/* ------- Mobile bottom tabs ------- */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-background/90 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur lg:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          if (href === "/studio") {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[var(--vsn-glow)]"
              >
                <Icon className="h-6 w-6" />
                <span className="sr-only">{label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
