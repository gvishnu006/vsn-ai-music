"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Flag, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Report } from "@/lib/types";

const REASON_LABELS: Record<string, string> = {
  copyright: "Copyright",
  spam: "Spam",
  offensive: "Offensive",
  misleading: "Misleading",
  other: "Other",
};

export function AdminClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, token } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.adminListReports(token);
        if (!cancelled) setReports(list);
      } catch {
        if (!cancelled) setDenied(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const act = async (id: string, fn: () => Promise<void>, okMsg: string) => {
    setBusyId(id);
    try {
      await fn();
      toast(okMsg, "success");
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  const open = reports.filter((r) => r.status === "open");
  const closed = reports.filter((r) => r.status !== "open");

  if (denied || (user && !user.isAdmin)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
          <ShieldCheck className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground">Admins only</h1>
        <p className="mt-2 text-sm text-muted">
          This dashboard is restricted to VSN moderators.
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => router.push("/discover")}>
          Back to Discover
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
            <ShieldCheck className="h-7 w-7 text-primary" /> Moderation
          </h1>
          <p className="mt-1 text-sm text-muted">
            Review community reports. Hide or remove songs that break the rules.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="accent">
            <Flag className="h-3 w-3" /> {open.length} open
          </Badge>
          <Badge tone="neutral">{closed.length} handled</Badge>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted">Loading reports…</p>
      ) : reports.length === 0 ? (
        <Card className="flex flex-col items-center p-14 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h2 className="font-display text-lg font-semibold text-foreground">
            All clear
          </h2>
          <p className="mt-1 text-sm text-muted">No reports yet. Nice community!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const isOpen = r.status === "open";
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border bg-surface p-4",
                  isOpen ? "border-accent/40" : "border-border opacity-70"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-semibold text-foreground">
                        {r.songTitle || "Unknown song"}
                      </h3>
                      <Badge tone={isOpen ? "accent" : "neutral"}>{REASON_LABELS[r.reason] ?? r.reason}</Badge>
                      <Badge tone="soft">{r.status}</Badge>
                      {r.action ? <Badge tone="amber">action: {r.action}</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Reported by {r.reporterName} · {new Date(r.createdAt).toLocaleString()}
                      {r.song ? ` · by ${r.song.ownerName} · ${r.song.playCount} plays` : ""}
                    </p>
                    {r.details ? (
                      <p className="mt-2 max-w-2xl text-sm text-foreground/80">{r.details}</p>
                    ) : null}
                    {r.handledAt ? (
                      <p className="mt-1 text-xs text-muted">
                        Handled {new Date(r.handledAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {isOpen ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/song/${r.songId}`)}
                      >
                        <Eye className="h-4 w-4" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === r.id}
                        onClick={() =>
                          void act(r.id, () => api.adminHideSong(r.id), "Song hidden from public.")
                        }
                      >
                        Hide song
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === r.id}
                        onClick={() => setConfirmDelete(r)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === r.id}
                        onClick={() =>
                          void act(r.id, () => api.adminDismissReport(r.id), "Report dismissed.")
                        }
                      >
                        <X className="h-4 w-4" /> Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6"
              role="dialog"
              aria-label="Delete song"
            >
              <h3 className="font-display text-lg font-semibold text-foreground">
                Delete &quot;{confirmDelete.songTitle}&quot;?
              </h3>
              <p className="mt-2 text-sm text-muted">
                Permanently removes the song and its audio. The report is closed afterwards.
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={busyId === confirmDelete.id}
                  onClick={() =>
                    void act(confirmDelete.id, () => api.adminDeleteSong(confirmDelete.id), "Song deleted.")
                  }
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
