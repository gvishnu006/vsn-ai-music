"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { GitBranch, Music2, Search, Shuffle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Toggle } from "@/components/ui/fields";
import { Loading } from "@/components/ui/Loading";
import { SongPlayer } from "@/components/player/SongPlayer";
import { Badge } from "@/components/ui/Badge";
import { SongCover } from "@/components/song/SongCover";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { GENRES, LANGUAGES, VOICE_STYLES, DAILY_GENERATION_LIMIT } from "@/lib/constants";
import { DEMO_SONGS } from "@/lib/demo-data";
import type { GenerationResult, Song } from "@/lib/types";
import { cn } from "@/lib/cn";

export function RemixClient({ initialFrom }: { initialFrom: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuth();

  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Song | null>(null);
  const [lineage, setLineage] = useState<Song[]>([]);
  const [genre, setGenre] = useState<string>("Pop");
  const [voiceStyle, setVoiceStyle] = useState<string>("female-warm");
  const [language, setLanguage] = useState<string>("English");
  const [instrumental, setInstrumental] = useState(false);
  const [promptOverride, setPromptOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(DAILY_GENERATION_LIMIT);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [publicSongs, mySongs] = await Promise.all([
          api.listSongs("public"),
          api.listSongs("mine", token),
        ]);
        const merged = [...DEMO_SONGS, ...publicSongs];
        const seen = new Set<string>();
        const unique = merged.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
        for (const s of mySongs) {
          if (!seen.has(s.id)) unique.push(s);
        }
        setSongs(unique);
        if (initialFrom) {
          const target = unique.find((s) => s.id === initialFrom);
          if (target) {
            setSelected(target);
            setGenre(target.genre);
            setVoiceStyle(target.voiceStyle);
            setLanguage(target.language);
          }
        }
      } catch {
        toast("Could not load songs for remixing.", "error");
      }
    })();
  }, [token, initialFrom, toast]);

  // Build lineage (walk remixedFrom chain)
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      const chain: Song[] = [selected];
      let current = selected;
      try {
        while (current.remixedFrom && chain.length < 6) {
          const parent = await api.getSong(current.remixedFrom);
          if (!parent || chain.some((s) => s.id === parent.id)) break;
          chain.push(parent);
          current = parent;
        }
      } catch {
        /* stop walking */
      }
      if (!cancelled) setLineage(chain);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q)
    );
  }, [songs, search]);

  const handleRemix = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.generate(
        {
          prompt: promptOverride.trim() || `A remix of "${selected.title}" — ${selected.genre}, ${selected.language}. ${selected.prompt}`,
          title: `Remix: ${selected.title}`,
          genre,
          language,
          voiceStyle,
          instrumental,
          duration: selected.duration || 30,
          remixedFrom: selected.id,
        },
        setStatus
      );
      setResult(res);
      setCredits(res.creditsRemaining);
      toast("Remix created and linked to the original!", "success");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast(msg, "error");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Remix <span className="text-gradient">studio</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pick any song — yours or the community&apos;s — and re-imagine it.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
          <Shuffle className="h-4 w-4 text-accent" />
          <span className="text-muted">Credits today:</span>
          <span className="font-display font-bold text-primary">{credits}</span>
          <span className="text-muted">/ {DAILY_GENERATION_LIMIT}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ---------- picker ---------- */}
        <Card className="flex max-h-[70vh] flex-col overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-2">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search songs to remix…"
                aria-label="Search songs"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s);
                  setLineage([]);
                  setGenre(s.genre);
                  setVoiceStyle(s.voiceStyle);
                  setLanguage(s.language);
                  setResult(null);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                  selected?.id === s.id
                    ? "bg-primary-soft/70"
                    : "hover:bg-surface-2"
                )}
              >
                <SongCover seed={s.title} className="h-11 w-11 shrink-0 rounded-lg" showWave={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                  <p className="truncate text-xs text-muted">
                    {s.ownerName} · {s.genre} · {s.language}
                  </p>
                </div>
                {s.remixedFrom ? (
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-accent" />
                ) : null}
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">No songs match.</p>
            ) : null}
          </div>
        </Card>

        {/* ---------- remix panel ---------- */}
        <div className="space-y-5">
          {!selected ? (
            <Card className="flex flex-col items-center justify-center p-14 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-brand text-white shadow-[var(--vsn-glow)]">
                <Music2 className="h-8 w-8" />
              </span>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Select a song to remix
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Pick anything from the community or your own studio. Your remix keeps a link back
                to the original in its family tree.
              </p>
            </Card>
          ) : (
            <>
              {/* lineage tree */}
              <Card className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border bg-surface-2/40 px-4 py-3">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Remix family tree
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto p-4">
                  {lineage.map((s, i) => (
                    <div key={s.id} className="flex shrink-0 items-center gap-2">
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2",
                          i === 0 ? "border-accent/50 bg-accent-soft" : "border-border bg-surface"
                        )}
                      >
                        <SongCover seed={s.title} className="h-8 w-8 rounded-md" showWave={false} />
                        <div>
                          <p className="max-w-36 truncate text-xs font-medium text-foreground">
                            {s.title}
                          </p>
                          <p className="text-[10px] text-muted">{s.genre}</p>
                        </div>
                      </div>
                      {i < lineage.length - 1 ? (
                        <span className="text-muted">←</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>

              <SongPlayer song={selected} className="border-0 shadow-none" />

              <Card className="p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                  Re-imagine <span className="text-gradient">“{selected.title}”</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="New genre">
                    <Select value={genre} onChange={(e) => setGenre(e.target.value)}>
                      {GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Voice">
                    <Select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
                      {VOICE_STYLES.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Language">
                    <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Field
                    label="Prompt twist (optional)"
                    hint="Leave empty to reuse the original's vibe with new style."
                  >
                    <Input
                      placeholder="e.g. make it darker and slower, add strings…"
                      value={promptOverride}
                      onChange={(e) => setPromptOverride(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Button size="lg" onClick={handleRemix} loading={busy} disabled={busy}>
                    <Wand2 className="h-5 w-5" />
                    {busy ? "Remixing…" : "Generate remix"}
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">Instrumental</span>
                    <Toggle checked={instrumental} onChange={setInstrumental} label="Instrumental remix" />
                  </div>
                </div>
                <AnimatePresence>
                  {error ? (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
                    >
                      {error}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </Card>
            </>
          )}

          <AnimatePresence mode="wait">
            {busy ? <Loading key="remix-loading" status={status} /> : null}
          </AnimatePresence>

          {result ? (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Badge tone="accent">New remix</Badge>
                <span className="text-xs text-muted">linked to the original</span>
              </div>
              <Card className="overflow-hidden">
                <SongPlayer song={result.song} className="border-0 shadow-none" />
                <div className="flex flex-wrap gap-2 border-t border-border bg-surface-2/40 px-4 py-3">
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/editor/${result.song.id}`)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/song/${result.song.id}`)}>
                    Open track page
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
