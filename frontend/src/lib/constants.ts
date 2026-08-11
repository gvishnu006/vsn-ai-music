export const DAILY_GENERATION_LIMIT = 10;

export const GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop",
  "Electronic",
  "Lo-Fi",
  "R&B",
  "Country",
  "Jazz",
  "Classical",
  "Ambient",
  "Dance",
  "Soul",
  "Reggaeton",
  "Folk",
  "Metal",
  "Afrobeats",
  "EDM",
  "Trap",
  "Indie",
  "Cinematic",
  "K-Pop",
  "Bollywood",
] as const;

export const LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "Portuguese",
  "Bengali",
  "Telugu",
  "Tamil",
  "Urdu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Russian",
  "German",
  "Italian",
  "Indonesian",
  "Thai",
  "Filipino",
  "Swahili",
  "Turkish",
  "Nepali",
  "Sinhala",
  "Hausa",
  "Vietnamese",
] as const;

export const VOICE_STYLES: {
  id: string;
  label: string;
  description: string;
}[] = [
  { id: "female-warm", label: "Warm Female", description: "Soft, rich, emotional" },
  { id: "male-deep", label: "Deep Male", description: "Low, resonant, powerful" },
  { id: "female-bright", label: "Bright Female", description: "Clear, uplifting, pop-ready" },
  { id: "male-smooth", label: "Smooth Male", description: "Silky, crooner-style" },
  { id: "male-raspy", label: "Raspy Male", description: "Gritty, rock & soul edge" },
  { id: "female-airy", label: "Airy Female", description: "Whispery, dreamy" },
  { id: "duet", label: "Duet", description: "Male + female harmony" },
  { id: "choir", label: "Choir", description: "Layered group vocals" },
  { id: "autotune", label: "Auto-Tuned", description: "Modern pop pitch FX" },
  { id: "soprano", label: "Soprano", description: "High classical female" },
  { id: "bass", label: "Bass Baritone", description: "Low male classical" },
  { id: "tenor", label: "Tenor", description: "High male classical" },
  { id: "alto", label: "Alto", description: "Warm low female" },
  { id: "rapper", label: "Rapper", description: "Rhythmic, fast delivery" },
  { id: "gospel", label: "Gospel", description: "Big, soulful, reverent" },
];

export const DURATIONS = [
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
  { label: "45s", value: 45 },
  { label: "60s", value: 60 },
] as const;

export const SAMPLE_PROMPTS = [
  "A hopeful anthem about chasing dreams at sunrise, acoustic guitar and warm strings",
  "Midnight lo-fi beats with mellow keys and a soft rainy day mood",
  "Upbeat Bollywood fusion about a festival night with family and fireworks",
  "A soulful ballad about missing a faraway friend, piano and cello",
  "Energetic K-pop dance track about confidence and bright lights",
  "Dreamy ambient soundscape for focus, flowing pads and gentle bells",
  "Funky retro groove with brass stabs about dancing all weekend",
  "Tender folk duet about home, mountains and open roads",
];

export const THEME_META: Record<
  "light" | "dark" | "neon",
  { label: string; dot: string; preview: string }
> = {
  light: { label: "Light", dot: "#FAF3E7", preview: "Warm paper light" },
  dark: { label: "Dark", dot: "#121826", preview: "Deep ink blue" },
  neon: { label: "Studio Neon", dot: "#00E5A0", preview: "Black neon glow" },
};
