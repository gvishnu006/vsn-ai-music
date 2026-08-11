"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Music2, Search, Shuffle } from "lucide-react";
import { SongCard } from "@/components/song/SongCard";
import { SongPlayer } from "@/components/player/SongPlayer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/fields";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DEMO_SONGS } from "@/lib/demo-data";
import { GENRES } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { Song } from "@/lib/types";

export function DiscoverClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [language, setLanguage] = useState("All");
  const [sort, setSort] = useState("new");
  const [playing, setPlaying] = useState<Song | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pub, likedSongs] = await Promise.all([
          api.listSongs("public"),
          token ? api.listSongs("liked", token) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: Song[] = [];
        for (const s of [...DEMO_SONGS, ...pub]) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          merged.push(s);
        }
        setSongs(merged);
        setLikedIds(new Set(likedSongs.map((s) => s.id)));
      } catch {
        if (!cancelled) toast("Could not load the community feed.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = songs.filter((s) => {
      if (genre !== "All" && s.genre !== genre) return false;
      if (language !== "All" && s.language !== language) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.prompt.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q)
      );
    });
    if (sort === "new") out = [...out].sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "liked") out = [...out].sort((a, b) => b.likeCount - a.likeCount);
    if (sort === "played") out = [...out].sort((a, b) => b.playCount - a.playCount);
    return out;
  }, [songs, query, genre, language, sort]);

  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of songs) counts.set(s.genre, (counts.get(s.genre) ?? 0) + 1);
    return counts;
  }, [songs]);

  const toggleLike = async (song: Song) => {
    if (!token) {
      toast("Sign in to like songs.", "error");
      router.push("/signin");
      return;
    }
    const liked = !likedIds.has(song.id);
    try {
      const res = await api.toggleLike(song.id, liked);
      const next = new Set(likedIds);
      if (res.liked) next.add(song.id);
      else next.delete(song.id);
      setLikedIds(next);
      setSongs((prev) =>
        prev.map((s) =>
          s.id === song.id ? { ...s, likeCount: res.likeCount } : s
        )
      );
    } catch {
      toast("Could not update like.", "error");
    }
  };

  const shufflePlay = () => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setPlaying(pick);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            <span className="text-gradient">Discover</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Fresh songs from the community — {songs.length} tracks and counting.
          </p>
        </div>
        <Button variant="secondary" onClick={shufflePlay} disabled={filtered.length === 0}>
          <Shuffle className="h-4 w-4" /> Shuffle play
        </Button>
      </div>

      {/* search + filters */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, prompts, creators…"
            aria-label="Search songs"
            className="w-full bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Filter by language"
            className="w-44"
          >
            <option value="All">All languages</option>
            {[...new Set(songs.map((s) => s.language))].sort().map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort songs"
            className="w-40"
          >
            <option value="new">Newest</option>
            <option value="liked">Most liked</option>
            <option value="played">Most played</option>
          </Select>
        </div>
      </div>

      {/* genre chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {["All", ...[...GENRES].sort((a, b) => (genreCounts.get(b) ?? 0) - (genreCounts.get(a) ?? 0))].map(
          (g) => {
            const count = g === "All" ? songs.length : genreCounts.get(g) ?? 0;
            return (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                  genre === g
                    ? "border-primary bg-gradient-brand text-white shadow"
                    : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                )}
              >
                {g}
                <span className={cn("ml-1.5 text-xs", genre === g ? "text-white/80" : "text-muted/70")}>
                  {count}
                </span>
              </button>
            );
          }
        )}
      </div>

      {loading ? (
        <p className="py-20 text-center text-muted">Loading the feed…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Music2 className="h-7 w-7" />
          </span>
          <p className="text-muted">No songs match those filters.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setQuery("");
              setGenre("All");
              setLanguage("All");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((song, i) => (
            <SongCard
              key={song.id}
              song={song}
              index={i}
              onPlay={() => setPlaying((p) => (p?.id === song.id ? null : song))}
            />
          ))}
        </div>
      )}

      {/* now playing bar */}
      {playing ? (
        <div className="fixed inset-x-0 bottom-20 z-40 px-4 sm:bottom-4 sm:px-6">
          <div className="card-lift mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-[var(--vsn-shadow)] backdrop-blur">
            <button
              onClick={() => {
                if (playing.id) void toggleLike(playing);
              }}
              aria-label="Like song"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                likedIds.has(playing.id)
                  ? "border-red-500/40 bg-red-500/10 text-red-500"
                  : "border-border text-muted hover:text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4", likedIds.has(playing.id) && "fill-current")} />
            </button>
            <SongPlayer song={playing} className="flex-1 border-0 p-0 shadow-none" showVolume={false} />
            <button
              onClick={() => router.push(`/remix?from=${playing.id}`)}
              className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow sm:flex"
            >
              <Shuffle className="h-4 w-4" /> Remix
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
