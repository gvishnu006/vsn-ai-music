import { cn } from "@/lib/cn";

export function Avatar({
  src,
  name,
  className,
}: {
  src?: string;
  name?: string;
  className?: string;
}) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-brand text-xs font-bold text-white",
        className
      )}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
    </span>
  );
}
