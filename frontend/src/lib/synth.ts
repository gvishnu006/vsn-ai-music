/**
 * Lightweight Web Audio synth used to preview demo/placeholder tracks
 * before real generated audio exists. Generates a genre-flavored loop.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const SCALES: Record<string, number[]> = {
  pop: [0, 2, 4, 7, 9],
  lofi: [0, 3, 5, 7, 10],
  bollywood: [0, 2, 4, 7, 9, 11],
  rb: [0, 2, 3, 5, 7, 9],
  kpop: [0, 2, 4, 7, 9],
  ambient: [0, 5, 7, 12],
};

const NOTE_OFFSETS: Record<string, number> = {
  pop: 57,
  lofi: 45,
  bollywood: 50,
  rb: 43,
  kpop: 55,
  ambient: 48,
};

let activeNodes: AudioNode[] = [];
let activeOscs: OscillatorNode[] = [];

export function playDemoTone(genre: string): () => void {
  const ac = getCtx();
  if (!ac) return () => {};

  stopDemoTone();

  const scale = SCALES[genre.toLowerCase()] ?? SCALES.pop;
  const base = NOTE_OFFSETS[genre.toLowerCase()] ?? 57;
  const master = ac.createGain();
  master.gain.value = 0.16;
  master.connect(ac.destination);
  activeNodes.push(master);

  const start = ac.currentTime + 0.05;

  // Simple arpeggio loop over ~4 seconds
  for (let step = 0; step < 8; step++) {
    const note = scale[step % scale.length] + (step >= 4 ? 12 : 0) + base;
    const t = start + step * 0.5;
    const osc = ac.createOscillator();
    osc.type = genre.toLowerCase() === "ambient" ? "sine" : "triangle";
    osc.frequency.value = midiToFreq(note);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + 0.5);
    activeOscs.push(osc);
    activeNodes.push(g);
  }

  // Soft pad underneath
  if (genre.toLowerCase() !== "ambient") {
    const padNote = scale[0] + base;
    const pad = ac.createOscillator();
    pad.type = "sine";
    pad.frequency.value = midiToFreq(padNote - 12);
    const pg = ac.createGain();
    pg.gain.setValueAtTime(0.25, start);
    pg.gain.linearRampToValueAtTime(0.25, start + 4);
    pad.connect(pg);
    pg.connect(master);
    pad.start(start);
    pad.stop(start + 4.5);
    activeOscs.push(pad);
    activeNodes.push(pg);
  }

  const total = activeOscs.map((o) => o.stop.bind(o, undefined)).length;
  void total;

  return stopDemoTone;
}

export function stopDemoTone() {
  for (const o of activeOscs) {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  }
  for (const n of activeNodes) {
    try {
      n.disconnect();
    } catch {
      /* noop */
    }
  }
  activeOscs = [];
  activeNodes = [];
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
