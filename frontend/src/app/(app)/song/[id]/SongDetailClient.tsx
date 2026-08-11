"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Flag,
  GitBranch,
  Heart,
  MessageSquare,
  Music2,
  PencilLine,
  Send,
  Share2,
  Shuffle,
} from "lucide-react";
import { SongPlayer } from "@/components/player/SongPlayer";
import { SongCover } from "@/components/song/SongCover";
import { SongCard, formatCount } from "@/components/song/SongCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DEMO_SONGS } from "@/lib/demo-data";
import { cn } from "@/lib/cn";
import type { Comment, Song } from "@/lib/types";

export function SongDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, token } = useAuth();

  const [song, setSong] = useState<Song | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [related, setRelated] = useState<Song[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("copyright");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found =
          (await api.getSong(id)) ?? DEMO_SONGS.find((s) => s.id === id) ?? null;
        if (cancelled) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        setSong(found);
        void api.recordPlay(found.id).catch(() => undefined);
        const [cmts, likedSongs, pub] = await Promise.all([
          api.listComments(found.id),
          token ? api.listSongs("liked", token) : Promise.resolve([]),
          api.listSongs("public"),
        ]);
        if (cancelled) return;
        setComments(cmts);
        setLiked(likedSongs.some((s) => s.id === found.id));
        const sameGenre = [...pub, ...DEMO_SONGS].filter(
          (s) => s.id !== found.id && s.genre === found.genre
        );
        setRelated(sameGenre.slice(0, 8));
      } catch {
        if (!cancelled) toast("Could not load this song.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, toast]);

  const isMine = Boolean(user && song && song.ownerId === user.uid);

  const toggleLike = useCallback(async () => {
    if (!song || !token) {
      toast("Sign in to like songs.", "error");
      router.push("/signin");
      return;
    }
    const next = !liked;
    setLiked(next);
    setSong((prev) =>
      prev ? { ...prev, likeCount: prev.likeCount + (next ? 1 : -1) } : prev
    );
    try {
      const res = await api.toggleLike(song.id, next);
      setLiked(res.liked);
      setSong((prev) => (prev ? { ...prev, likeCount: res.likeCount } : prev));
    } catch {
      setLiked(!next);
      setSong((prev) =>
        prev ? { ...prev, likeCount: prev.likeCount + (next ? -1 : 1) } : prev
      );
      toast("Could not update like.", "error");
    }
  }, [song, token, liked, router, toast]);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: song?.title ?? "VSN song", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard.", "success");
      }
    } catch {
      /* user dismissed share sheet */
    }
  }, [song, toast]);

  const download = useCallback(() => {
    if (!song?.audioUrl) {
      toast("No audio file yet for this song.", "error");
      return;
    }
    const a = document.createElement("a");
    a.href = song.audioUrl;
    a.download = `${song.title.replace(/[^\w\s-]/g, "") || "song"}.wav`;
    a.target = "_blank";
    a.click();
  }, [song, toast]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !song || !token) {
      toast("Sign in and write a comment first.", "error");
      return;
    }
    setSending(true);
    try {
      const c = await api.addComment(song.id, text);
      setComments((prev) => [...prev, c]);
      setCommentText("");
      toast("Comment posted.", "success");
    } catch {
      toast("Could not post comment.", "error");
    } finally {
      setSending(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song || !token) {
      toast("Sign in to report content.", "error");
      router.push("/signin");
      return;
    }
    setReportBusy(true);
    try {
      await api.reportSong(song.id, reportReason, reportDetails);
      setReportOpen(false);
      setReportDetails("");
      toast("Report submitted. Our moderators will review it.", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setReportBusy(false);
    }
  };

  // Keyboard shortcuts: L like · R remix · S share · D download
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }
      if (reportOpen) return;
      switch (e.key.toLowerCase()) {
        case "l":
          e.preventDefault();
          void toggleLike();
          break;
        case "r":
          e.preventDefault();
          if (song) router.push(`/remix?from=${song.id}`);
          break;
        case "s":
          e.preventDefault();
          void share();
          break;
        case "d":
          e.preventDefault();
          download();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleLike, share, download, song, reportOpen, router]);

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-muted">
          <Music2 className="h-8 w-8" />
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground">Song not found</h1>
        <p className="mt-2 text-sm text-muted">
          It may have been deleted or never existed.
        </p>
        <Button className="mt-6" onClick={() => router.push("/discover")}>
          <ArrowLeft className="h-4 w-4" /> Back to Discover
        </Button>
      </div>
    );
  }

  if (!song) {
    return <p className="py-24 text-center text-muted">Loading song…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* cover + actions */}
        <div>
          <div className="card-lift overflow-hidden rounded-3xl border border-border bg-surface shadow-[var(--vsn-shadow)]">
            <SongCover seed={song.title} title={song.title} className="aspect-square w-full" />
            <div className="flex flex-wrap gap-2 p-4">
              <button
                onClick={() => void toggleLike()}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                  liked
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-border text-muted hover:text-red-500"
                )}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                {liked ? "Liked" : "Like"} · {formatCount(song.likeCount)}
              </button>
              <button
                onClick={() => void share()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-muted hover:text-foreground"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              <Button className="flex-1" onClick={() => router.push(`/remix?from=${song.id}`)}>
                <Shuffle className="h-4 w-4" /> Remix this
              </Button>
              {isMine ? (
                <Button variant="secondary" onClick={() => router.push(`/editor/${song.id}`)}>
                  <PencilLine className="h-4 w-4" /> Edit
                </Button>
              ) : null}
              <Button variant="secondary" onClick={download} aria-label="Download audio">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => setReportOpen(true)}
                aria-label="Report this song"
                title="Report"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Avatar src={song.ownerPhoto} name={song.ownerName} className="h-11 w-11" />
            <div>
              <p className="text-sm font-semibold text-foreground">{song.ownerName}</p>
              <p className="text-xs text-muted">
                {song.isPublic ? "Public" : "Private"} · created{" "}
                {new Date(song.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* player + details */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{song.genre}</Badge>
            <Badge tone="neutral">{song.language}</Badge>
            {song.instrumental ? <Badge tone="primary">Instrumental</Badge> : null}
            {song.edited ? <Badge tone="amber">Edited</Badge> : null}
            {song.remixedFrom ? <Badge tone="accent"><GitBranch className="h-3 w-3" /> Remix</Badge> : null}
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">{song.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {formatCount(song.playCount)} plays · {formatCount(song.likeCount)} likes
          </p>

          <SongPlayer song={song} className="mt-6" />

          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted" aria-hidden>
            {[
              ["L", "Like"],
              ["R", "Remix"],
              ["S", "Share"],
              ["D", "Download"],
            ].map(([k, label]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5"
              >
                <kbd className="rounded bg-surface-2 px-1 font-sans font-semibold text-foreground">
                  {k}
                </kbd>
                {label}
              </span>
            ))}
          </div>

          {song.prompt ? (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Prompt
              </p>
              <p className="text-sm text-foreground/90">{song.prompt}</p>
            </div>
          ) : null}

          {song.lyrics ? (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Lyrics
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">
                {song.lyrics}
              </pre>
            </div>
          ) : null}

          {/* comments */}
          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" /> Comments ({comments.length})
            </h2>

            <form onSubmit={submitComment} className="mb-5 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={token ? "Share your thoughts…" : "Sign in to comment"}
                disabled={!token}
                aria-label="Write a comment"
                className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none"
              />
              <Button type="submit" disabled={!token || sending || !commentText.trim()}>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Post</span>
              </Button>
            </form>

            {comments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No comments yet — be the first.
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
                    <Avatar src={c.authorPhoto} name={c.authorName} className="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">{c.authorName}</span>{" "}
                        <span className="text-xs text-muted">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-foreground/85">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 ? (
        <div className="mt-14">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            More {song.genre} music
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {related.map((s, i) => (
              <SongCard key={s.id} song={s} index={i} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-10 text-center text-xs text-muted">
        VSN Studio — generate, edit and remix AI music in seconds.
      </p>

      {reportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportOpen(false)}
          role="dialog"
          aria-label="Report song"
        >
          <form
            onSubmit={submitReport}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"
          >
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Flag className="h-4 w-4 text-accent" /> Report &quot;{song.title}&quot;
            </h3>
            <p className="mt-1 text-sm text-muted">
              Tell us why this song should be reviewed. Reports are handled by moderators.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              aria-label="Report reason"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="copyright">Copyright / stolen content</option>
              <option value="spam">Spam or misleading</option>
              <option value="offensive">Offensive content</option>
              <option value="misleading">False information</option>
              <option value="other">Something else</option>
            </select>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
              Details (optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Add context for the moderators…"
              maxLength={1000}
              rows={3}
              aria-label="Report details"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none"
            />
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={reportBusy} className="flex-1">
                {reportBusy ? "Submitting…" : "Submit report"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
