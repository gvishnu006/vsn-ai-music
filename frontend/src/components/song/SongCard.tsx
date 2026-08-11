"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Music2, Play } from "lucide-react";
import type { Song } from "@/lib/types";
import { SongCover } from "./SongCover";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function SongCard({
  song,
  onPlay,
  index = 0,
  className,
}: {
  song: Song;
  onPlay?: (song: Song) => void;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn("group", className)}
    >
      <div className="card-lift relative overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--vsn-shadow)]">
        <Link href={`/song/${song.id}`} className="block">
          <SongCover seed={song.title} title={song.title} className="aspect-square w-full" />
        </Link>

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <button
          onClick={() => onPlay?.(song)}
          aria-label={song.status === "ready" ? `Play ${song.title}` : "Preview"}
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="pulse-ring flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-white shadow-xl">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </button>

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {song.instrumental ? (
            <Badge tone="primary">
              <Music2 className="h-3 w-3" /> Instrumental
            </Badge>
          ) : (
            <Badge tone="accent">{song.genre}</Badge>
          )}
        </div>

        <div className="p-3">
          <Link href={`/song/${song.id}`} className="block">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">
              {song.title}
            </h3>
          </Link>
          <p className="truncate text-xs text-muted">
            <Link href={`/user/${song.ownerId}`} className="transition-colors hover:text-primary">
              {song.ownerName}
            </Link>{" "}
            · {song.language} · {formatDuration(song.duration)}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Play className="h-3 w-3" /> {formatCount(song.playCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3 text-accent" /> {formatCount(song.likeCount)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function formatDuration(sec: number): string {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
