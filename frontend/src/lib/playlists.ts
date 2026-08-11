"use client";

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

const KEY = "vsn-playlists";

export function loadPlaylists(): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Playlist[]) : [];
  } catch {
    return [];
  }
}

export function savePlaylists(list: Playlist[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function createPlaylist(name: string): Playlist {
  const list = loadPlaylists();
  const pl: Playlist = {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    songIds: [],
    createdAt: Date.now(),
  };
  savePlaylists([...list, pl]);
  return pl;
}

export function deletePlaylist(id: string) {
  savePlaylists(loadPlaylists().filter((p) => p.id !== id));
}

export function toggleSongInPlaylist(playlistId: string, songId: string): boolean {
  const list = loadPlaylists();
  const pl = list.find((p) => p.id === playlistId);
  if (!pl) return false;
  if (pl.songIds.includes(songId)) {
    pl.songIds = pl.songIds.filter((id) => id !== songId);
  } else {
    pl.songIds.push(songId);
  }
  savePlaylists(list);
  return pl.songIds.includes(songId);
}

export function playlistContains(playlistId: string, songId: string): boolean {
  return loadPlaylists().some((p) => p.id === playlistId && p.songIds.includes(songId));
}
