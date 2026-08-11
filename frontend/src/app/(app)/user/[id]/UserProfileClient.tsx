"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Heart,
  PencilLine,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { SongCard } from "@/components/song/SongCard";
import { SongPlayer } from "@/components/player/SongPlayer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { PublicProfile, Song } from "@/lib/types";

export function UserProfileClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [peopleView, setPeopleView] = useState<"followers" | "following" | null>(null);
  const [people, setPeople] = useState<PublicProfile[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getPublicProfile(id, token);
        if (cancelled) return;
        setProfile(data.profile);
        setSongs(data.songs);
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const isSelf = Boolean(user && profile && user.uid === profile.uid);

  const toggleFollow = async () => {
    if (!profile) return;
    if (!token) {
      toast("Sign in to follow creators.", "error");
      router.push("/signin");
      return;
    }
    setBusy(true);
    const next = !profile.followedByMe;
    setProfile({ ...profile, followedByMe: next, followerCount: profile.followerCount + (next ? 1 : -1) });
    try {
      const res = await api.followUser(profile.uid, next);
      setProfile((prev) => (prev ? { ...prev, followedByMe: res.following, followerCount: res.followerCount } : prev));
    } catch {
      setProfile((prev) =>
        prev ? { ...prev, followedByMe: !next, followerCount: prev.followerCount + (next ? -1 : 1) } : prev
      );
      toast("Could not update follow.", "error");
    } finally {
      setBusy(false);
    }
  };

  const openPeople = async (kind: "followers" | "following") => {
    setPeopleView(kind);
    setPeople([]);
    try {
      const list =
        kind === "followers" ? await api.listFollowers(profile!.uid) : await api.listFollowing(profile!.uid);
      setPeople(list);
    } catch {
      toast("Could not load list.", "error");
    }
  };

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
        <Avatar name="?" className="mb-4 h-16 w-16 text-lg" />
        <h1 className="font-display text-2xl font-bold text-foreground">Creator not found</h1>
        <p className="mt-2 text-sm text-muted">This profile may have been removed.</p>
        <Button className="mt-6" onClick={() => router.push("/discover")}>
          <ArrowLeft className="h-4 w-4" /> Back to Discover
        </Button>
      </div>
    );
  }

  if (!profile) {
    return <p className="py-24 text-center text-muted">Loading profile…</p>;
  }

  const playingSong = songs.find((s) => s.id === playingId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-brand opacity-20" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar src={profile.photoURL} name={profile.displayName} className="h-20 w-20 text-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">{profile.displayName}</h1>
            <p className="mt-1 text-sm text-muted">
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            {profile.bio ? (
              <p className="mt-2 max-w-2xl text-sm text-foreground/85">{profile.bio}</p>
            ) : (
              <p className="mt-2 text-sm italic text-muted">No bio yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            {isSelf ? (
              <Button variant="secondary" onClick={() => router.push("/settings")}>
                <PencilLine className="h-4 w-4" /> Edit profile
              </Button>
            ) : (
              <Button onClick={() => void toggleFollow()} disabled={busy}>
                {profile.followedByMe ? (
                  <>
                    <UserCheck className="h-4 w-4" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Follow
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-3">
          <Stat label="Songs" value={profile.songCount} icon={<Heart className="h-4 w-4" />} />
          <button onClick={() => void openPeople("followers")} className="transition-transform hover:scale-105">
            <Stat label="Followers" value={profile.followerCount} icon={<Users className="h-4 w-4" />} />
          </button>
          <button onClick={() => void openPeople("following")} className="transition-transform hover:scale-105">
            <Stat label="Following" value={profile.followingCount} icon={<UserCheck className="h-4 w-4" />} />
          </button>
          <Stat label="Member" value={new Date(profile.createdAt).toLocaleDateString()} icon={<Calendar className="h-4 w-4" />} />
        </div>
      </Card>

      <h2 className="mb-4 mt-10 font-display text-lg font-semibold text-foreground">
        {isSelf ? "Your public songs" : `Songs by ${profile.displayName}`}
      </h2>
      {songs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          {isSelf ? "Publish a song from the Studio to see it here." : "No public songs yet."}
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {songs.map((s, i) => (
            <SongCard
              key={s.id}
              song={s}
              index={i}
              onPlay={() => setPlayingId((p) => (p === s.id ? null : s.id))}
            />
          ))}
        </div>
      )}

      {/* mini player */}
      {playingSong ? (
        <div className="fixed inset-x-0 bottom-20 z-40 px-4 sm:bottom-4 sm:px-6">
          <div className="card-lift mx-auto max-w-3xl rounded-2xl border border-border bg-surface/95 p-3 shadow-[var(--vsn-shadow)] backdrop-blur">
            <SongPlayer song={playingSong} className="border-0 p-0 shadow-none" showVolume={false} />
          </div>
        </div>
      ) : null}

      {/* followers / following modal */}
      {peopleView ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPeopleView(null)}
          role="dialog"
          aria-label={peopleView}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="font-display text-base font-semibold text-foreground capitalize">
                {peopleView}
              </h3>
              <button
                onClick={() => setPeopleView(null)}
                aria-label="Close"
                className="rounded-lg px-2 py-1 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[55vh] space-y-1 overflow-y-auto p-2">
              {people.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No one here yet.</p>
              ) : (
                people.map((p) => (
                  <button
                    key={p.uid}
                    onClick={() => {
                      setPeopleView(null);
                      router.push(`/user/${p.uid}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <Avatar src={p.photoURL} name={p.displayName} className="h-10 w-10" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {p.displayName}
                      </span>
                      <span className="block truncate text-xs text-muted">{p.bio || "Creator on VSN Studio"}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-4 py-2 text-sm"
      )}
    >
      <span className="text-primary">{icon}</span>
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted">{label}</span>
    </span>
  );
}
