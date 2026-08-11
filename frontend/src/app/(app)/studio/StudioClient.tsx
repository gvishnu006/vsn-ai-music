"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Music2,
  PencilLine,
  Share2,
  Shuffle,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/fields";
import { Loading } from "@/components/ui/Loading";
import { SongPlayer } from "@/components/player/SongPlayer";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DAILY_GENERATION_LIMIT, DURATIONS, GENRES, LANGUAGES, SAMPLE_PROMPTS, VOICE_STYLES } from "@/lib/constants";
import type { GenerationResult, Song } from "@/lib/types";
import { cn } from "@/lib/cn";

export function StudioClient({ initialPrompt }: { initialPrompt: string }) {
  const { toast } = useToast();
  const { user, demoMode } = useAuth();

  const [prompt, setPrompt] = useState(initialPrompt);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string>("Pop");
  const [language, setLanguage] = useState<string>("English");
  const [voiceStyle, setVoiceStyle] = useState<string>("female-warm");
  const [instrumental, setInstrumental] = useState(false);
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(() =>
    user ? Math.max(0, user.dailyQuota - user.usedToday) : DAILY_GENERATION_LIMIT
  );
  const resultRef = useRef<HTMLDivElement>(null);

  const canGenerate = prompt.trim().length > 0 && !busy;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.generate(
        {
          prompt: prompt.trim(),
          title: title.trim() || undefined,
          genre,
          language,
          voiceStyle,
          instrumental,
          duration,
        },
        setStatus
      );
      setResult(res);
      setCredits(res.creditsRemaining);
      toast("Song created! Listen to it below.", "success");
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

  const handleDemoSample = (sample: string) => {
    setPrompt(sample);
    setTitle(sample.split(",")[0].replace(/^(a|an)\s+/i, ""));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Create <span className="text-gradient">your song</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Describe the vibe or paste lyrics. The AI does the rest.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-muted">Credits today:</span>
          <span className="font-display font-bold text-primary">{credits}</span>
          <span className="text-muted">/ {DAILY_GENERATION_LIMIT}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---------- form ---------- */}
        <Card className="p-6">
          <Field
            label={instrumental ? "Describe the instrumental" : "Prompt or lyrics"}
            hint="Be specific: mood, instruments, tempo, imagery — the AI follows the details."
            htmlFor="prompt"
          >
            <Textarea
              id="prompt"
              rows={4}
              maxLength={5000}
              placeholder={
                instrumental
                  ? "e.g. A sunrise acoustic guitar loop with warm strings and soft shakers…"
                  : "e.g. A hopeful anthem about chasing dreams at sunrise, with a soaring chorus…"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Field>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SAMPLE_PROMPTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleDemoSample(s)}
                className="rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {s.split(",")[0]}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Song title (optional)" htmlFor="title">
              <Input
                id="title"
                placeholder="Give it a name…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Genre" htmlFor="genre">
              <Select id="genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
            </Field>
            <Field label="Language" htmlFor="language">
              <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Voice style" htmlFor="voice">
              <Select id="voice" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}>
                {VOICE_STYLES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label} — {v.description}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Song length</p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                      duration === d.value
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-muted hover:border-primary/50"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Instrumental only</p>
                <p className="text-xs text-muted">Skip vocals, pure music</p>
              </div>
              <Toggle checked={instrumental} onChange={setInstrumental} label="Instrumental only" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate}
              loading={busy}
              className="sm:min-w-52"
            >
              <Wand2 className="h-5 w-5" />
              {busy ? "Generating…" : "Generate song"}
            </Button>
            <p className="text-xs text-muted">
              Free generation can take 30–120s while Hugging Face models warm up.
            </p>
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

        {/* ---------- sidebar ---------- */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold text-foreground">Pro tips</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-muted">
              <li className="flex gap-2"><Music2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Start with a mood + setting: &ldquo;melancholy piano under rain&rdquo;.</li>
              <li className="flex gap-2"><PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Paste full lyrics with [Verse]/[Chorus] markers for structure.</li>
              <li className="flex gap-2"><Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Not right? Use Remix to retry in a new genre — it keeps the lineage.</li>
            </ul>
          </Card>
          {demoMode ? (
            <Card className="border-primary/40 p-5">
              <Badge tone="primary" className="mb-2">Demo mode</Badge>
              <p className="text-sm text-muted">
                No Hugging Face token configured — songs use the built-in demo synthesizer so you can
                test the whole flow. Add <code className="rounded bg-surface-2 px-1">HF_API_TOKEN</code> to the backend for real AI vocals.
              </p>
            </Card>
          ) : null}
        </div>
      </div>

      {/* ---------- generation state ---------- */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {busy ? (
            <Loading key="loading" status={status} />
          ) : null}
        </AnimatePresence>

        {result ? (
          <motion.div
            key={result.song.id}
            ref={resultRef}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Badge tone="primary" className="text-sm">Your new track</Badge>
              <span className="text-xs text-muted">
                {credits} credit{credits === 1 ? "" : "s"} left today
              </span>
            </div>
            <SongCardWithActions song={result.song} />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function SongCardWithActions({ song }: { song: Song }) {
  const router = useRouter();
  return (
    <Card className="overflow-hidden">
      <SongPlayer song={song} className="border-0 shadow-none" />
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-3">
        <Button size="sm" variant="secondary" onClick={() => router.push(`/editor/${song.id}`)}>
          <PencilLine className="h-4 w-4" /> Edit
        </Button>
        <Button size="sm" variant="secondary" onClick={() => router.push(`/remix?from=${song.id}`)}>
          <Shuffle className="h-4 w-4" /> Remix
        </Button>
        <Button size="sm" variant="secondary" onClick={() => router.push(`/song/${song.id}`)}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const a = document.createElement("a");
            a.href = song.audioUrl || "";
            a.download = `${song.title || "song"}.wav`;
            a.target = "_blank";
            a.click();
          }}
        >
          <Download className="h-4 w-4" /> WAV
        </Button>
      </div>
    </Card>
  );
}
