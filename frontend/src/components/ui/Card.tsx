import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: ReactNode;
}

export function Card({ className, interactive, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-[var(--vsn-shadow)]",
        interactive && "card-lift cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
