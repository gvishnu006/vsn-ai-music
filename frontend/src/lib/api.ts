import type {
  Comment,
  GenerationParams,
  GenerationResult,
  PublicProfile,
  Report,
  Song,
  UserProfile,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: string }).error ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export interface ApiClient {
  getToken: () => Promise<string | null>;
  demoMode: boolean;
}

export const api = {
  getToken: null as unknown as () => Promise<string | null>,
  demoMode: true,

  configure(client: ApiClient) {
    this.getToken = client.getToken;
    this.demoMode = client.demoMode;
  },

  async generate(
    params: GenerationParams,
    onProgress?: (status: string) => void
  ): Promise<GenerationResult> {
    onProgress?.("Connecting to the studio…");
    const token = await this.getToken();
    if (!token) throw new Error("You need to sign in to generate songs.");
    const res = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = body as { error?: string; code?: string };
      if (err.code === "quota_exceeded") {
        throw new Error("Daily limit reached. Come back tomorrow!");
      }
      throw new Error(err.error || "Generation failed");
    }
    onProgress?.("Saving your track…");
    return body as GenerationResult;
  },

  async listSongs(
    scope: "public" | "mine" | "liked",
    token?: string | null
  ): Promise<Song[]> {
    const q = scope === "public" ? "" : `?scope=${scope}`;
    const t = token ?? (await this.getToken());
    return request<{ songs: Song[] }>(`/api/songs${q}`, {}, t).then((r) => r.songs);
  },

  async getSong(id: string): Promise<Song> {
    return request<{ song: Song }>(`/api/songs/${id}`).then((r) => r.song);
  },

  async toggleLike(id: string, liked: boolean): Promise<{ likeCount: number; liked: boolean }> {
    const token = await this.getToken();
    return request<{ likeCount: number; liked: boolean }>(
      `/api/songs/${id}/like`,
      { method: "POST", body: JSON.stringify({ liked }) },
      token
    );
  },

  async addComment(songId: string, text: string): Promise<Comment> {
    const token = await this.getToken();
    return request<{ comment: Comment }>(
      `/api/songs/${songId}/comments`,
      { method: "POST", body: JSON.stringify({ text }) },
      token
    ).then((r) => r.comment);
  },

  async listComments(songId: string): Promise<Comment[]> {
    return request<{ comments: Comment[] }>(`/api/songs/${songId}/comments`).then(
      (r) => r.comments
    );
  },

  async saveEdit(song: Song): Promise<Song> {
    const token = await this.getToken();
    return request<{ song: Song }>(
      `/api/songs/${song.id}/edit`,
      { method: "POST", body: JSON.stringify(song) },
      token
    ).then((r) => r.song);
  },

  async saveEditForm(id: string, form: FormData): Promise<Song> {
    const token = await this.getToken();
    const res = await fetch(`${API_BASE}/api/songs/${id}/edit`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || "Could not save edited song.");
    }
    return (body as { song: Song }).song;
  },

  async deleteSong(id: string): Promise<void> {
    const token = await this.getToken();
    return request(`/api/songs/${id}`, { method: "DELETE" }, token);
  },

  async getProfile(token?: string | null): Promise<UserProfile> {
    const t = token ?? (await this.getToken());
    return request<{ profile: UserProfile }>("/api/me", {}, t).then((r) => r.profile);
  },

  async updateProfile(patch: {
    displayName?: string;
    photoURL?: string;
    bio?: string;
  }): Promise<UserProfile> {
    const token = await this.getToken();
    return request<{ profile: UserProfile }>(
      "/api/me",
      { method: "PATCH", body: JSON.stringify(patch) },
      token
    ).then((r) => r.profile);
  },

  async getPublicProfile(
    id: string,
    token?: string | null
  ): Promise<{ profile: PublicProfile; songs: Song[] }> {
    const t = token ?? (await this.getToken());
    return request(`/api/users/${id}`, {}, t);
  },

  async followUser(
    id: string,
    follow?: boolean
  ): Promise<{ following: boolean; followerCount: number }> {
    const token = await this.getToken();
    return request(
      `/api/users/${id}/follow`,
      { method: "POST", body: JSON.stringify(follow === undefined ? {} : { follow }) },
      token
    );
  },

  async listFollowers(id: string): Promise<PublicProfile[]> {
    return request<{ people: PublicProfile[] }>(`/api/users/${id}/followers`).then(
      (r) => r.people
    );
  },

  async listFollowing(id: string): Promise<PublicProfile[]> {
    return request<{ people: PublicProfile[] }>(`/api/users/${id}/following`).then(
      (r) => r.people
    );
  },

  async reportSong(
    songId: string,
    reason: string,
    details?: string
  ): Promise<Report> {
    const token = await this.getToken();
    return request<{ report: Report }>(
      `/api/songs/${songId}/report`,
      { method: "POST", body: JSON.stringify({ reason, details }) },
      token
    ).then((r) => r.report);
  },

  async adminStats(token?: string | null): Promise<{ openReports: number; totalReports: number }> {
    const t = token ?? (await this.getToken());
    return request(`/api/admin/stats`, {}, t);
  },

  async adminListReports(token?: string | null): Promise<Report[]> {
    const t = token ?? (await this.getToken());
    return request<{ reports: Report[] }>(`/api/admin/reports`, {}, t).then((r) => r.reports);
  },

  async adminDismissReport(id: string): Promise<void> {
    const token = await this.getToken();
    return request(`/api/admin/reports/${id}/dismiss`, { method: "POST" }, token);
  },

  async adminHideSong(id: string): Promise<void> {
    const token = await this.getToken();
    return request(`/api/admin/reports/${id}/hide`, { method: "POST" }, token);
  },

  async adminDeleteSong(id: string): Promise<void> {
    const token = await this.getToken();
    return request(`/api/admin/reports/${id}/delete-song`, { method: "POST" }, token);
  },

  async recordPlay(id: string): Promise<void> {
    fetch(`${API_BASE}/api/songs/${id}/play`, { method: "POST" }).catch(() => {});
  },
};
