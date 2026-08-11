"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Pause, Play, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { Field, Input } from "@/components/ui/fields";
import { WaveformTimeline } from "@/components/editor/WaveformTimeline";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import {
  buildSettings,
  loadAudioBuffer,
  previewBuffer,
  renderEditedWav,
} from "@/lib/audio-engine";
import type { EditSettings, Song } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { formatDuration } from "@/components/song/SongCard";

export function EditorClient({ songId }: { songId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [song, setSong] = useState<Song | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [settings, setSettings] = useState<EditSettings>(() => buildSettings());
  const [title, setTitle] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(-1);
  const [saving, setSaving] = useState(false);
  const stopPreview = useRef<(() => void) | null>(null);
  const previewBufferRef = useRef<AudioBuffer | null>(null);
  const playStartRef = useRef(0);

  const trimEnd = settings.trimEnd > 0 ? settings.trimEnd : song?.duration ?? 30;
  const previewDuration = Math.max(0.1, trimEnd - settings.trimStart);

  // Load song + audio
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.getSong(songId);
        if (cancelled) return;
        setSong(s);
        setTitle(s.title);
        setSettings(
          buildSettings({
            ...(s.editSettings ?? {}),
            trimEnd: s.editSettings?.trimEnd ?? s.duration,
          })
        );
        if (s.audioUrl) {
          const buf = await loadAudioBuffer(s.audioUrl);
          if (!cancelled) setBuffer(buf);
        }
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      stopPreview.current?.();
    };
  }, [songId]);

  const stopPlayback = useCallback(() => {
    stopPreview.current?.();
    stopPreview.current = null;
    setPlaying(false);
    setPlayhead(-1);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const elapsed = (performance.now() - playStartRef.current) / 1000;
      setPlayhead(settings.trimStart + elapsed);
      if (elapsed < previewDuration) {
        raf = requestAnimationFrame(loop);
      } else {
        stopPlayback();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, settings.trimStart, previewDuration, stopPlayback]);

  const togglePreview = () => {
    if (playing) {
      stopPlayback();
      return;
    }
    if (!buffer) {
      toast("Audio not loaded yet.", "error");
      return;
    }
    previewBufferRef.current = buffer;
    const stop = previewBuffer(buffer, settings, () => {
      setPlaying(false);
      setPlayhead(-1);
    });
    stopPreview.current = stop;
    setPlaying(true);
    playStartRef.current = performance.now();
  };

  const patch = (p: Partial<EditSettings>) =>
    setSettings((s) => ({ ...s, ...p }));

  const handleSave = async () => {
    if (!song || !buffer) return;
    setSaving(true);
    try {
      const blob = await renderEditedWav(buffer, settings);
      const form = new FormData();
      form.append("audio", blob, `${song.id}-edit.wav`);
      form.append("title", title.trim() || `${song.title} (Edit)`);
      form.append("duration", String(Math.round(previewDuration)));
      form.append("editSettings", JSON.stringify({ ...settings, trimEnd: previewDuration }));
      form.append("waveform", JSON.stringify(song.waveform ?? []));
      const updated = await api.saveEditForm(song.id, form);
      toast("Edited version saved to your studio!", "success");
      router.push(`/song/${updated.id}`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg text-foreground">Could not open this song in the editor.</p>
        <p className="mt-2 text-sm text-muted">{loadError}</p>
        <Button className="mt-6" onClick={() => router.push("/library")}>
          Back to My Studio
        </Button>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-muted">Loading the editor…</p>
      </div>
    );
  }

  const isOwner = user?.uid === song.ownerId;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Edit <span className="text-gradient">{song.title}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Trim · mix · re-tempo · pitch · fades — then save as a new version.
          </p>
        </div>
        {!isOwner ? (
          <p className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-xs text-accent">
            You can only save edits to songs you own. Open the remix studio instead.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">
                Timeline
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {formatDuration(previewDuration)} of {formatDuration(song.duration)}
                </span>
                <button
                  onClick={togglePreview}
                  disabled={!buffer}
                  aria-label={playing ? "Stop preview" : "Play preview"}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[var(--vsn-glow)] disabled:opacity-40"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                </button>
              </div>
            </div>
            <WaveformTimeline
              waveform={song.waveform?.length ? song.waveform : Array(96).fill(0.5)}
              duration={song.duration}
              trimStart={settings.trimStart}
              trimEnd={trimEnd}
              playhead={playhead}
              onChange={(start, end) => patch({ trimStart: start, trimEnd: end })}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              Mixer
            </h2>
            <div className="space-y-5">
              <Slider
                label="Vocals"
                min={0}
                max={1}
                step={0.01}
                value={settings.vocalVolume}
                onChange={(v) => patch({ vocalVolume: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                label="Instruments"
                min={0}
                max={1}
                step={0.01}
                value={settings.instrumentalVolume}
                onChange={(v) => patch({ instrumentalVolume: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <p className="rounded-lg bg-surface-2/60 px-3 py-2 text-[11px] text-muted">
                Balance is approximated with EQ (no true stem separation on the free tier).
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              Tempo &amp; pitch
            </h2>
            <div className="space-y-5">
              <Slider
                label="Tempo"
                min={0.5}
                max={2}
                step={0.01}
                value={settings.tempo}
                onChange={(v) => patch({ tempo: v })}
                format={(v) => `${v.toFixed(2)}×`}
              />
              <Slider
                label="Pitch"
                min={-12}
                max={12}
                step={1}
                value={settings.pitch}
                onChange={(v) => patch({ pitch: v })}
                format={(v) => `${v > 0 ? "+" : ""}${v} st`}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              Fades
            </h2>
            <div className="space-y-5">
              <Slider
                label="Fade in"
                min={0}
                max={Math.min(10, previewDuration / 2)}
                step={0.1}
                value={settings.fadeIn}
                onChange={(v) => patch({ fadeIn: v })}
                format={(v) => `${v.toFixed(1)}s`}
              />
              <Slider
                label="Fade out"
                min={0}
                max={Math.min(10, previewDuration / 2)}
                step={0.1}
                value={settings.fadeOut}
                onChange={(v) => patch({ fadeOut: v })}
                format={(v) => `${v.toFixed(1)}s`}
              />
            </div>
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              Save version
            </h2>
            <Field label="New title" htmlFor="edit-title">
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
              />
            </Field>
            <div className="mt-4 space-y-2 text-xs text-muted">
              <p>• Saves as a brand new song in your studio</p>
              <p>• Original stays untouched</p>
              <p>• Rendered at 44.1 kHz stereo WAV</p>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={handleSave}
              disabled={!buffer || !isOwner}
              loading={saving}
            >
              <Save className="h-4 w-4" /> Save edited version
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => router.push(`/remix?from=${song.id}`)}
            >
              <Wand2 className="h-4 w-4" /> Remix instead
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted">
              Download current edit
            </h2>
            <Button
              variant="outline"
              className="w-full"
              disabled={!buffer}
              onClick={async () => {
                try {
                  const blob = await renderEditedWav(buffer!, settings);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${title.trim() || "edit"}.wav`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  toast("Could not render audio.", "error");
                }
              }}
            >
              <Download className="h-4 w-4" /> Export WAV
            </Button>
          </Card>
          <AnimatePresence>
            {!isOwner ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border bg-surface p-4 text-xs text-muted"
              >
                Tip: use the Remix studio to re-imagine someone else&apos;s track.
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
