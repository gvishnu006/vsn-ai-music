import type { Song } from "./types";

/** Hash a string to a 0..1 value. */
export function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const COVER_PALETTES = [
  ["#0B6E4F", "#F2A413", "#FF6B35"],
  ["#121826", "#2BB182", "#F5B301"],
  ["#46281C", "#FF7B4A", "#F5B301"],
  ["#00E5A0", "#0B6E4F", "#FFD23F"],
  ["#1F3A5F", "#2BB182", "#FF6B35"],
  ["#3B0F29", "#FF5E3A", "#F2A413"],
];

export function coverPalette(seed: string): string[] {
  const h = hashStr(seed);
  return COVER_PALETTES[Math.floor(h * COVER_PALETTES.length) % COVER_PALETTES.length];
}

export const DEMO_SONGS: Song[] = [
  {
    id: "demo-sunrise-anthem",
    title: "Sunrise Anthem",
    prompt: "A hopeful anthem about chasing dreams at sunrise, acoustic guitar and warm strings",
    genre: "Pop",
    language: "English",
    voiceStyle: "female-warm",
    instrumental: false,
    duration: 45,
    ownerId: "demo-user",
    ownerName: "Mira Dawn",
    ownerPhoto: "",
    isPublic: true,
    playCount: 12400,
    likeCount: 2310,
    createdAt: Date.now() - 86400000 * 6,
    status: "ready",
  },
  {
    id: "demo-midnight-lofi",
    title: "Midnight Lo-Fi",
    prompt: "Midnight lo-fi beats with mellow keys and a soft rainy day mood",
    genre: "Lo-Fi",
    language: "English",
    voiceStyle: "female-airy",
    instrumental: false,
    duration: 30,
    ownerId: "demo-user",
    ownerName: "Kai Tanaka",
    isPublic: true,
    playCount: 9800,
    likeCount: 1755,
    createdAt: Date.now() - 86400000 * 5,
    status: "ready",
  },
  {
    id: "demo-festival-night",
    title: "Festival Night",
    prompt: "Upbeat Bollywood fusion about a festival night with family and fireworks",
    genre: "Bollywood",
    language: "Hindi",
    voiceStyle: "duet",
    instrumental: false,
    duration: 60,
    ownerId: "demo-user",
    ownerName: "Aarav Mehta",
    isPublic: true,
    playCount: 21900,
    likeCount: 4022,
    createdAt: Date.now() - 86400000 * 4,
    status: "ready",
  },
  {
    id: "demo-faraway-friend",
    title: "Faraway Friend",
    prompt: "A soulful ballad about missing a faraway friend, piano and cello",
    genre: "R&B",
    language: "English",
    voiceStyle: "male-smooth",
    instrumental: false,
    duration: 45,
    ownerId: "demo-user",
    ownerName: "Sam Okafor",
    isPublic: true,
    playCount: 5620,
    likeCount: 890,
    createdAt: Date.now() - 86400000 * 3,
    status: "ready",
  },
  {
    id: "demo-neon-dance",
    title: "Neon Rush",
    prompt: "Energetic K-pop dance track about confidence and bright lights",
    genre: "K-Pop",
    language: "Korean",
    voiceStyle: "female-bright",
    instrumental: false,
    duration: 30,
    ownerId: "demo-user",
    ownerName: "Yuna Park",
    isPublic: true,
    playCount: 33100,
    likeCount: 6120,
    createdAt: Date.now() - 86400000 * 2,
    status: "ready",
  },
  {
    id: "demo-deep-focus",
    title: "Deep Focus",
    prompt: "Dreamy ambient soundscape for focus, flowing pads and gentle bells",
    genre: "Ambient",
    language: "English",
    voiceStyle: "female-warm",
    instrumental: true,
    duration: 60,
    ownerId: "demo-user",
    ownerName: "Elena Rossi",
    isPublic: true,
    playCount: 7400,
    likeCount: 1330,
    createdAt: Date.now() - 86400000,
    status: "ready",
  },
];
