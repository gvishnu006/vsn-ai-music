export type VoiceStyleId =
  | "female-warm"
  | "male-deep"
  | "female-bright"
  | "male-smooth"
  | "male-raspy"
  | "female-airy"
  | "duet"
  | "choir"
  | "autotune"
  | "soprano"
  | "bass"
  | "tenor"
  | "alto"
  | "rapper"
  | "gospel";

export interface EditSettings {
  trimStart: number;
  trimEnd: number;
  vocalVolume: number;
  instrumentalVolume: number;
  tempo: number;
  pitch: number;
  fadeIn: number;
  fadeOut: number;
}

export interface Song {
  id: string;
  title: string;
  prompt: string;
  lyrics?: string;
  genre: string;
  language: string;
  voiceStyle: string;
  instrumental: boolean;
  duration: number;
  audioUrl?: string;
  coverUrl?: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  isPublic: boolean;
  remixedFrom?: string;
  playCount: number;
  likeCount: number;
  createdAt: number;
  edited?: boolean;
  editSettings?: EditSettings;
  waveform?: number[];
  status?: "processing" | "ready" | "error";
  errorMessage?: string;
}

export interface Comment {
  id: string;
  songId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  createdAt: number;
}

export interface GenerationParams {
  prompt: string;
  genre: string;
  language: string;
  voiceStyle: string;
  instrumental: boolean;
  duration: number;
  title?: string;
  remixedFrom?: string;
}

export interface GenerationResult {
  song: Song;
  creditsRemaining: number;
  limit: number;
  queued?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  createdAt: number;
  dailyQuota: number;
  usedToday: number;
  followingCount?: number;
  followerCount?: number;
  isAdmin?: boolean;
}

export interface Report {
  id: string;
  songId: string;
  songTitle: string;
  songOwnerId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  action?: "hide" | "delete";
  createdAt: number;
  handledBy?: string;
  handledAt?: number;
  song?: Song | null;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  createdAt: number;
  songCount: number;
  followingCount: number;
  followerCount: number;
  followedByMe: boolean;
}

export interface GenerationStats {
  usedToday: number;
  limit: number;
  resetsAt: number;
}
