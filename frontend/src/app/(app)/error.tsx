"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <h1 className="font-display text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted">
        An unexpected error interrupted the studio. Try again — your songs are safe.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
