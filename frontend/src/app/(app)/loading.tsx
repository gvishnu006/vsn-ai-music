import { Logo } from "@/components/ui/Logo";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6">
      <Logo size="lg" className="animate-pulse" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="h-6 w-1.5 animate-bounce rounded-full bg-gradient-brand"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <p className="text-sm text-muted">Loading your studio…</p>
    </div>
  );
}
