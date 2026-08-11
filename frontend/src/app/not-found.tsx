import Link from "next/link";
import { Music2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Logo size="lg" />
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Music2 className="h-8 w-8" />
      </span>
      <h1 className="font-display text-4xl font-bold text-foreground">
        4<span className="text-gradient">0</span>4
      </h1>
      <p className="max-w-sm text-sm text-muted">
        That track isn&apos;t on the playlist. It may have been moved or deleted.
      </p>
      <div className="flex gap-2">
        <Link
          href="/discover"
          className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-medium text-white shadow transition-transform active:scale-95"
        >
          Discover music
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
