"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  GitBranch,
  ListMusic,
  PencilLine,
  Play,
  Plus,
  Shuffle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SongPlayer } from "@/components/player/SongPlayer";
import { SongCover } from "@/components/song/SongCover";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatDuration } from "@/components/song/SongCard";
import { DEMO_SONGS } from "@/lib/demo-data";
import {
  createPlaylist,
  deletePlaylist,
  loadPlaylists,
  toggleSongInPlaylist,
  type Playlist,
} from "@/lib/playlists";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "mine" | "remixes" | "edits" | "liked" | "playlists";

export function LibraryClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, token } = useAuth();

  const [tab, setTab] = useState<Tab>("mine");
  const [mine, setMine] = useState<Song[]>([]);
  const [liked, setLiked] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists());
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [my, likedSongs, pub] = await Promise.all([
        api.listSongs("mine", token),
        api.listSongs("liked", token),
        api.listSongs("public"),
      ]);
      const pubById = new Map([...pub, ...DEMO_SONGS].map((s) => [s.id, s]));
      setMine(my);
      setLiked(likedSongs.map((s) => pubById.get(s.id) ?? s));
      setAllSongs([...pub, ...DEMO_SONGS, ...my]);
    } catch {
      toast("Could not load your studio.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [my, likedSongs, pub] = await Promise.all([
          api.listSongs("mine", token),
          api.listSongs("liked", token),
          api.listSongs("public"),
        ]);
        if (cancelled) return;
        const pubById = new Map([...pub, ...DEMO_SONGS].map((s) => [s.id, s]));
        setMine(my);
        setLiked(likedSongs.map((s) => pubById.get(s.id) ?? s));
        setAllSongs([...pub, ...DEMO_SONGS, ...my]);
      } catch {
        if (!cancelled) toast("Could not load your studio.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  const playable = useMemo(() => {
    if (tab === "mine") return mine;
    if (tab === "remixes") return mine.filter((s) => s.remixedFrom);
    if (tab === "edits") return mine.filter((s) => s.edited);
    if (tab === "liked") return liked;
    return [];
  }, [tab, mine, liked]);

  const handleDelete = async (song: Song) => {
    try {
      await api.deleteSong(song.id);
      toast(`Deleted "${song.title}".`, "success");
      setConfirmDelete(null);
      void reload();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const handleNewPlaylist = () => {
    const name = window.prompt("Playlist name:");
    if (name?.trim()) {
      createPlaylist(name.trim());
      setPlaylists(loadPlaylists());
      setTab("playlists");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            My <span className="text-gradient">Studio</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {user?.displayName ? `Welcome back, ${user.displayName}.` : "Your creative space."} Your
            songs, edits and remixes live here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/studio")}>
            <Plus className="h-4 w-4" /> New song
          </Button>
        </div>
      </div>

      {/* tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["mine", "My songs"],
            ["remixes", "Remixes"],
            ["edits", "Edits"],
            ["liked", "Liked"],
            ["playlists", "Playlists"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
              tab === t
                ? "border-primary bg-gradient-brand text-white"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            {label}
            {t === "mine" && mine.length > 0 ? (
              <span className="ml-1.5 text-xs opacity-80">{mine.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted">Loading your studio…</p>
      ) : tab === "playlists" ? (
        <PlaylistsView
          playlists={playlists}
          allSongs={allSongs}
          onNew={handleNewPlaylist}
          onDelete={(id) => {
            deletePlaylist(id);
            setPlaylists(loadPlaylists());
          }}
          onToggle={(plId, songId) => {
            toggleSongInPlaylist(plId, songId);
            setPlaylists(loadPlaylists());
          }}
          onPlay={(id) => setPlayingId(playingId === id ? null : id)}
          playingId={playingId}
        />
      ) : playable.length === 0 ? (
        <Card className="flex flex-col items-center p-14 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white">
            <ListMusic className="h-7 w-7" />
          </span>
          <h2 className="font-display text-lg font-semibold text-foreground">Nothing here yet</h2>
          <p className="mt-1 text-sm text-muted">
            {tab === "liked" ? "Like songs on the Discover page and they'll show up here." : "Generate your first song — it takes seconds."}
          </p>
          {tab !== "liked" ? (
            <Button className="mt-5" onClick={() => router.push("/studio")}>
              <Plus className="h-4 w-4" /> Generate a song
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {playable.map((song, i) => (
            <LibraryCard
              key={song.id}
              song={song}
              index={i}
              expanded={playingId === song.id}
              onTogglePlay={() => setPlayingId(playingId === song.id ? null : song.id)}
              onEdit={() => router.push(`/editor/${song.id}`)}
              onRemix={() => router.push(`/remix?from=${song.id}`)}
              onDelete={() => setConfirmDelete(song.id)}
              onDownload={() => downloadSong(song)}
            />
          ))}
        </div>
      )}

      {/* delete confirm */}
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
                Delete this song?
              </h3>
              <p className="mt-2 text-sm text-muted">
                The audio and its record will be permanently removed. This can&apos;t be undone.
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    const song = playable.find((s) => s.id === confirmDelete);
                    if (song) void handleDelete(song);
                  }}
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

function LibraryCard({
  song,
  index,
  expanded,
  onTogglePlay,
  onEdit,
  onRemix,
  onDelete,
  onDownload,
}: {
  song: Song;
  index: number;
  expanded: boolean;
  onTogglePlay: () => void;
  onEdit: () => void;
  onRemix: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="card-lift rounded-2xl border border-border bg-surface shadow-[var(--vsn-shadow)]"
    >
      <div className="flex items-center gap-3 p-3">
        <button onClick={onTogglePlay} aria-label={expanded ? "Collapse player" : "Play song"}>
          <SongCover
            seed={song.title}
            playing={expanded}
            className="h-14 w-14 rounded-xl"
          />
        </button>
        <div className="min-w-0 flex-1">
          <Link href={`/song/${song.id}`} className="block">
            <h3 className="truncate font-display text-sm font-semibold text-foreground hover:text-primary">
              {song.title}
            </h3>
          </Link>
          <p className="truncate text-xs text-muted">
            {song.genre} · {song.language} · {formatDuration(song.duration)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {song.remixedFrom ? (
              <Badge tone="accent"><GitBranch className="h-3 w-3" /> Remix</Badge>
            ) : null}
            {song.edited ? <Badge tone="primary">Edited</Badge> : null}
          </div>
        </div>
        <button
          onClick={onTogglePlay}
          aria-label={expanded ? "Collapse player" : "Expand player"}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-white shadow"
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-border p-3">
          <SongPlayer song={song} className="border-0 p-0 shadow-none" showVolume={false} />
        </div>
      ) : null}

      <div className="flex gap-1 border-t border-border bg-surface-2/40 p-2">
        <ActionBtn icon={Play} label="Play" onClick={onTogglePlay} />
        <ActionBtn icon={PencilLine} label="Edit" onClick={onEdit} />
        <ActionBtn icon={Shuffle} label="Remix" onClick={onRemix} />
        <ActionBtn icon={Download} label="Download" onClick={onDownload} />
        <ActionBtn icon={Trash2} label="Delete" danger onClick={onDelete} />
      </div>
    </motion.div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition-colors",
        danger
          ? "text-muted hover:bg-red-500/10 hover:text-red-500"
          : "text-muted hover:bg-surface hover:text-primary"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PlaylistsView({
  playlists,
  allSongs,
  onNew,
  onDelete,
  onToggle,
  onPlay,
  playingId,
}: {
  playlists: Playlist[];
  allSongs: Song[];
  onNew: () => void;
  onDelete: (id: string) => void;
  onToggle: (plId: string, songId: string) => void;
  onPlay: (id: string) => void;
  playingId: string | null;
}) {
  const [openPl, setOpenPl] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const songById = useMemo(() => new Map(allSongs.map((s) => [s.id, s])), [allSongs]);

  if (playlists.length === 0) {
    return (
      <Card className="flex flex-col items-center p-14 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white">
          <ListMusic className="h-7 w-7" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">No playlists yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Group your favorites into playlists — saved locally on this device.
        </p>
        <Button className="mt-5" onClick={onNew}>
          <Plus className="h-4 w-4" /> Create playlist
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={onNew}>
          <Plus className="h-4 w-4" /> New playlist
        </Button>
      </div>
      {playlists.map((pl) => {
        const songs = pl.songIds.map((id) => songById.get(id)).filter(Boolean) as Song[];
        return (
          <Card key={pl.id} className="overflow-hidden">
            <button
              onClick={() => setOpenPl(openPl === pl.id ? null : pl.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <ListMusic className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-foreground">{pl.name}</p>
                <p className="text-xs text-muted">{songs.length} songs</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(pl.id);
                }}
                aria-label="Delete playlist"
                className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </button>
            {openPl === pl.id ? (
              <div className="border-t border-border">
                {songs.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
                    <button onClick={() => onPlay(s.id)} aria-label="Play">
                      <SongCover seed={s.title} playing={playingId === s.id} className="h-9 w-9 rounded-lg" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                      <p className="truncate text-xs text-muted">{s.ownerName} · {s.genre}</p>
                    </div>
                    <Link href={`/song/${s.id}`} className="text-xs text-primary hover:underline">
                      Open
                    </Link>
                    <button
                      onClick={() => onToggle(pl.id, s.id)}
                      aria-label="Remove from playlist"
                      className="rounded-lg p-1.5 text-muted hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {songs.length === 0 ? (
                  <p className="px-4 py-4 text-center text-sm text-muted">
                    Empty — add songs from Discover.
                  </p>
                ) : null}
                {addingTo === pl.id ? (
                  <div className="max-h-48 overflow-y-auto border-t border-border/60 p-2">
                    {allSongs.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onToggle(pl.id, s.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                      >
                        <SongCover seed={s.title} className="h-7 w-7 rounded" showWave={false} />
                        <span className="truncate flex-1 text-foreground">{s.title}</span>
                        <span className="text-xs text-muted">{s.genre}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="bg-surface-2/40 px-4 py-2">
                  <button
                    onClick={() => setAddingTo(addingTo === pl.id ? null : pl.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {addingTo === pl.id ? "Done adding" : "+ Add songs"}
                  </button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function downloadSong(song: Song) {
  if (!song.audioUrl) return;
  const a = document.createElement("a");
  a.href = song.audioUrl;
  a.download = `${song.title.replace(/[^\w\s-]/g, "") || "song"}.wav`;
  a.target = "_blank";
  a.click();
}
