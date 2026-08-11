"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Download,
  Heart,
  Mic,
  Music,
  PenLine,
  Shuffle,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WaveformAnimation } from "@/components/ui/WaveformAnimation";
import { SongCard } from "@/components/song/SongCard";
import { DEMO_SONGS } from "@/lib/demo-data";
import { SAMPLE_PROMPTS } from "@/lib/constants";
import { playDemoTone, stopDemoTone } from "@/lib/synth";
import { useAuth } from "@/lib/auth-context";

const FEATURES = [
  {
    icon: Wand2,
    title: "Prompt to Song",
    desc: "Type any idea or paste lyrics. The AI writes the melody, chords and arrangement around your vision.",
  },
  {
    icon: Mic,
    title: "12+ Regional Languages",
    desc: "Generate songs in English, Hindi, Tamil, Bengali, Spanish and 25 more languages with natural vocals.",
  },
  {
    icon: Shuffle,
    title: "Remix Anything",
    desc: "Re-imagine any public track in a new genre, tempo or voice. Build a whole remix family tree.",
  },
  {
    icon: PenLine,
    title: "Studio Editor",
    desc: "Trim, balance vocals vs instruments, shift tempo & pitch, and fade in/out like a real DAW.",
  },
  {
    icon: Download,
    title: "Download & Share",
    desc: "Export MP3/WAV and share a public link or embeddable player with your friends.",
  },
  {
    icon: Zap,
    title: "Free Daily Credits",
    desc: "Generate up to 10 songs a day completely free. No credit card, no subscription.",
  },
];

const STEPS = [
  { n: "01", title: "Describe it", desc: "Type a prompt or your own lyrics." },
  { n: "02", title: "Style it", desc: "Pick genre, language, voice and length." },
  { n: "03", title: "Generate", desc: "AI builds your song with vocals." },
  { n: "04", title: "Share it", desc: "Edit, remix, download and share." },
];

const GENRE_MARQUEE = [
  "Pop", "Hip-Hop", "Lo-Fi", "Bollywood", "K-Pop", "Ambient", "Rock", "R&B",
  "Jazz", "EDM", "Folk", "Afrobeats", "Reggaeton", "Cinematic", "Trap", "Soul",
];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleMake = (text: string) => {
    const q = encodeURIComponent(text || prompt);
    router.push(`/studio?prompt=${q}`);
  };

  const handlePlay = (songId: string) => {
    if (playingId === songId) {
      stopDemoTone();
      setPlayingId(null);
      return;
    }
    stopDemoTone();
    setPlayingId(songId);
    const song = DEMO_SONGS.find((s) => s.id === songId);
    playDemoTone(song?.genre ?? "pop");
  };

  return (
    <div className="overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-4 py-20 text-center">
        {/* Animated waveform background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(700px 380px at 50% -5%, var(--vsn-primary-soft), transparent 70%), radial-gradient(600px 300px at 90% 30%, var(--vsn-accent-soft), transparent 65%), radial-gradient(500px 300px at 8% 60%, var(--vsn-primary-soft), transparent 60%)",
            }}
          />
          <WaveformAnimation
            bars={48}
            playing
            gradient
            height={200}
            delay={0}
            className="absolute inset-x-0 top-6 opacity-20"
          />
          <WaveformAnimation
            bars={40}
            playing
            gradient
            height={140}
            delay={0.4}
            className="absolute inset-x-0 top-40 opacity-10"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Free AI music generation · No credit card
          </span>

          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Your Voice.
            <br />
            <span className="text-gradient">Your Sound.</span>
            <br />
            Your Vision.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
            Type a prompt or lyrics, pick a genre, language and voice — VSN Studio composes an
            AI-sung song in seconds. Edit it, remix it, download it, share it.
          </p>

          <div className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-border bg-surface/80 p-2 shadow-[var(--vsn-shadow)] backdrop-blur">
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2/70 p-1.5">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMake(prompt)}
                placeholder="e.g. A hopeful anthem about chasing dreams at sunrise…"
                aria-label="Song prompt"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
              />
              <Button onClick={() => handleMake(prompt)} size="md" className="shrink-0">
                <Wand2 className="h-4 w-4" />
                Make a song
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 px-1.5 pb-1.5">
              {SAMPLE_PROMPTS.slice(0, 4).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPrompt(p);
                    handleMake(p);
                  }}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  {p.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          {!user ? (
            <p className="mt-4 text-sm text-muted">
              <Link href="/signin" className="font-medium text-primary hover:underline">
                Sign in free
              </Link>{" "}
              to start creating — no card required.
            </p>
          ) : null}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-6 text-center"
        >
          {[
            ["48k+", "Songs created"],
            ["12M+", "Playback runs"],
            ["31", "Languages"],
          ].map(([n, label]) => (
            <div key={label}>
              <p className="font-display text-2xl font-bold text-gradient sm:text-3xl">{n}</p>
              <p className="text-xs text-muted sm:text-sm">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ================= GENRE MARQUEE ================= */}
      <section className="border-y border-border bg-background-soft/50 py-4" aria-hidden>
        <div className="relative overflow-hidden">
          <div className="marquee-track flex w-max gap-3">
            {[...GENRE_MARQUEE, ...GENRE_MARQUEE].map((g, i) => (
              <span
                key={i}
                className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Everything you need to <span className="text-gradient">make a hit</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            A full AI songwriting studio — generation, editing, remixing and sharing — all free.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Card
              key={f.title}
              interactive
              className="p-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06 }}
              >
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-[var(--vsn-glow)]">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
              </motion.div>
            </Card>
          ))}
        </div>
      </section>

      {/* ================= COMMUNITY TRACKS ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Fresh from the <span className="text-gradient">community</span>
            </h2>
            <p className="mt-2 text-muted">Tap a card to preview. Songs are re-imagined daily.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
              aria-label="Scroll left"
              className="rounded-full border border-border bg-surface p-3 text-muted transition-colors hover:text-primary"
            >
              ←
            </button>
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
              aria-label="Scroll right"
              className="rounded-full border border-border bg-surface p-3 text-muted transition-colors hover:text-primary"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="scrollbar-none -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4"
        >
          {DEMO_SONGS.map((song, i) => (
            <div key={song.id} className="w-56 shrink-0 snap-start">
              <SongCard
                song={song}
                index={i}
                onPlay={() => handlePlay(song.id)}
              />
              <div className="mt-2 flex justify-center">
                <AnimatePresence>
                  {playingId === song.id ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary breathe" />
                      Previewing — click again to stop
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="border-y border-border bg-background-soft/40 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-foreground">
            From idea to song in <span className="text-gradient">four steps</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-border bg-surface p-6"
              >
                <span className="font-display text-4xl font-extrabold text-gradient">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="px-4 py-24">
        <Card className="relative mx-auto max-w-4xl overflow-hidden p-10 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(500px 220px at 50% 0%, var(--vsn-primary-soft), transparent 70%), radial-gradient(400px 200px at 85% 100%, var(--vsn-accent-soft), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Your song is waiting to be written.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Join thousands creating their own music today — free forever on the daily tier.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => router.push("/studio")}>
                <Wand2 className="h-5 w-5" /> Start creating free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => router.push("/discover")}>
                <Heart className="h-4 w-4 text-accent" /> Browse the community
              </Button>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              <Music className="h-4 w-4" /> No credit card · 10 free generations/day · MP3 + WAV
              download
            </p>
          </div>
        </Card>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-border bg-background-soft/60 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Music className="h-4 w-4 text-primary" />
            <span>
              VSN AI Music Generator — <span className="text-gradient font-medium">Your Voice. Your Sound. Your Vision.</span>
            </span>
          </div>
          <div className="flex gap-6 text-sm text-muted">
            <Link href="/discover" className="hover:text-primary">Discover</Link>
            <Link href="/studio" className="hover:text-primary">Studio</Link>
            <Link href="/library" className="hover:text-primary">Library</Link>
            <Link href="/signin" className="hover:text-primary">Sign in</Link>
          </div>
          <p className="text-xs text-muted">© {new Date().getFullYear()} VSN Studio. Made with AI.</p>
        </div>
      </footer>
    </div>
  );
}
