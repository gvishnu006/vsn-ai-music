"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Save, Sparkles, User } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DAILY_GENERATION_LIMIT } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

export function SettingsClient() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();

  useEffect(() => {
    if (!token) router.replace("/signin");
  }, [token, router]);

  if (!user) {
    return <p className="py-24 text-center text-muted">Redirecting…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">
        <span className="text-gradient">Settings</span>
      </h1>
      <p className="mt-1 text-sm text-muted">Manage your profile and account.</p>

      <ProfileForm user={user} />

      <QuotaCard used={user.usedToday ?? 0} limit={user.dailyQuota ?? DAILY_GENERATION_LIMIT} />

      <Card className="mt-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <User className="h-4 w-4 text-primary" /> Account
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            View your public page and sign out of this session.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/user/${user.uid}`)}>
              My profile
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProfileForm({ user }: { user: UserProfile }) {
  const { toast } = useToast();
  const { refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [photoURL, setPhotoURL] = useState(user.photoURL ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profile = await api.updateProfile({
        displayName: displayName.trim() || undefined,
        photoURL: photoURL.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      await refreshProfile(profile);
      toast("Profile updated.", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-8 p-6">
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={photoURL} name={displayName || user.displayName} className="h-16 w-16 text-xl" />
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {displayName || user.displayName}
          </p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        <Field label="Display name">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your creator name"
            maxLength={60}
            aria-label="Display name"
          />
        </Field>
        <Field label="Profile photo URL">
          <Input
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://…"
            maxLength={2000}
            aria-label="Profile photo URL"
          />
        </Field>
        <Field label="Bio">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell listeners about your sound…"
            maxLength={300}
            rows={3}
            aria-label="Bio"
          />
          <p className="mt-1 text-xs text-muted">{bio.length}/300</p>
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function QuotaCard({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, (used / Math.max(limit, 1)) * 100);
  return (
    <Card className="mt-6 p-6">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" /> Daily quota
      </h2>
      <p className="text-sm text-muted">
        {used} of {limit} generations used today
        {limit - used > 0 ? ` — ${limit - used} left.` : " — see you tomorrow!"}
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}
