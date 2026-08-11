"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-xl",
                t.kind === "success" && "border-primary/40",
                t.kind === "error" && "border-red-400/50",
                t.kind === "info" && "border-border"
              )}
            >
              {t.kind === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
              {t.kind === "error" && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
              {t.kind === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
              <p className="flex-1 text-sm text-foreground">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="rounded p-0.5 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
