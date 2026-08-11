"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { Song } from "@/lib/types";
import { api } from "@/lib/api";
import { playDemoTone, stopDemoTone } from "@/lib/synth";
import { formatDuration } from "@/components/song/SongCard";
import { cn } from "@/lib/cn";

export function SongPlayer({
  song,
  className,
  onEnded,
  showVolume = true,
}: {
  song: Song;
  className?: string;
  onEnded?: () => void;
  showVolume?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [synthMode, setSynthMode] = useState(false);
  const playRecorded = useRef(false);

  const duration = song.duration || 30;
  const hasAudio = Boolean(song.audioUrl);

  const waveform = useMemo(() => {
    if (song.waveform && song.waveform.length > 4) return song.waveform;
    // deterministic fallback shape
    const out: number[] = [];
    for (let i = 0; i < 96; i++) {
      const env = 0.3 + 0.7 * Math.sin((i / 95) * Math.PI * 0.9);
      out.push(0.2 + 0.8 * env);
    }
    return out;
  }, [song.waveform]);

  const progress = duration > 0 ? current / duration : 0;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (hasAudio && audio) {
      if (audio.paused) {
        void audio.play();
      } else {
        audio.pause();
      }
      return;
    }
    // fallback: synthesized preview
    if (!synthMode) {
      setSynthMode(true);
      setPlaying(true);
      playDemoTone(song.genre);
    } else {
      setSynthMode(false);
      setPlaying(false);
      stopDemoTone();
    }
  }, [hasAudio, synthMode, song.genre]);

  const seek = useCallback(
    (clientX: number) => {
      const audio = audioRef.current;
      if (!hasAudio || !audio || !duration) return;
      const rect = audio.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      audio.currentTime = ratio * duration;
      setCurrent(audio.currentTime);
    },
    [hasAudio, duration]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      onEnded?.();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
    };
  }, [onEnded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => stopDemoTone();
  }, []);

  const onFirstPlay = () => {
    if (!playRecorded.current) {
      playRecorded.current = true;
      if (song.id && !song.id.startsWith("demo-")) {
        void api.recordPlay(song.id).catch(() => {});
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4", className)}>
      {hasAudio ? (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          preload="metadata"
          onPlay={onFirstPlay}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="pulse-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[var(--vsn-glow)] transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold text-foreground">{song.title}</p>
          <p className="truncate text-xs text-muted">
            {song.ownerName} · {song.genre} · {song.language}
          </p>
        </div>

        {showVolume ? (
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => setVolume((v) => (v > 0 ? 0 : 0.9))}
              aria-label={volume > 0 ? "Mute" : "Unmute"}
              className="text-muted hover:text-foreground"
            >
              {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-20 cursor-pointer accent-[var(--vsn-primary)]"
            />
          </div>
        ) : null}
      </div>

      {/* waveform */}
      <div
        className="flex h-14 cursor-pointer items-center gap-[2px]"
        onClick={(e) => seek(e.clientX)}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={current}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") seek((progress + 0.05) * e.currentTarget.getBoundingClientRect().width + e.currentTarget.getBoundingClientRect().left);
          if (e.key === "ArrowLeft") seek((progress - 0.05) * e.currentTarget.getBoundingClientRect().width + e.currentTarget.getBoundingClientRect().left);
        }}
      >
        {waveform.map((v, i) => {
          const frac = i / waveform.length;
          const played = frac <= progress;
          return (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-full transition-colors",
                played
                  ? "bg-gradient-to-t from-primary to-[var(--vsn-amber)]"
                  : "bg-border",
                playing && played && "breathe"
              )}
              style={{ height: `${Math.max(12, Math.round(v * 100))}%` }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-mono">{formatDuration(current)}</span>
        {synthMode ? (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">Preview synth</span>
        ) : null}
        <span className="font-mono">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
