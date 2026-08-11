/**
 * Pure-JS WAV synthesizer used when no Hugging Face token is configured
 * (demo mode). Produces a short genre-flavored instrumental loop so the
 * whole product flow (generate -> edit -> remix -> download) works offline.
 */

const NOTE_NAMES = [0, 2, 4, 7, 9];

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeWavHeader(sampleRate, n) {
  const dataSize = n * 2;
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/**
 * @param {{ duration?: number, genre?: string, seed?: string, instrumental?: boolean }} params
 * @returns {Buffer} 16-bit PCM WAV, mono, 22050 Hz
 */
function synthesizeWav(params) {
  const duration = Math.max(5, Math.min(60, params.duration || 30));
  const genre = (params.genre || "Pop").toLowerCase();
  const seedStr = `${genre}-${params.seed || "vsn"}`;
  const seed = hashStr(seedStr);

  const sampleRate = 22050;
  const n = Math.floor(sampleRate * duration);
  const data = new Float64Array(n);

  const base = genre === "lofi" ? 45 : genre === "ambient" ? 40 : genre === "classical" ? 52 : 50 + Math.floor(seed * 8);
  const stepDur = 0.5 - seed * 0.18; // between 0.32s and 0.5s
  const steps = Math.floor(duration / stepDur);

  const addNote = (startS, freq, amp, type) => {
    const s = Math.floor(startS * sampleRate);
    const len = Math.floor(stepDur * 0.92 * sampleRate);
    for (let i = 0; i < len; i++) {
      const j = s + i;
      if (j >= n) break;
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.03);
      const release = Math.min(1, (stepDur * 0.92 - t) / 0.12);
      const env = Math.max(0, attack * release);
      let v;
      if (type === "sine") v = Math.sin(2 * Math.PI * freq * t);
      else if (type === "triangle") {
        v = 2 / Math.PI * Math.asin(Math.sin(2 * Math.PI * freq * t));
      } else {
        v = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
      }
      data[j] += v * amp * env;
    }
  };

  const addBass = () => {
    const beat = 0.5;
    const freq = midiToFreq(base - 12);
    const bSteps = Math.floor(duration / beat);
    for (let s = 0; s < bSteps; s++) {
      const start = s * beat;
      const len = Math.floor(0.22 * sampleRate);
      for (let i = 0; i < len; i++) {
        const j = Math.floor(start * sampleRate) + i;
        if (j >= n) break;
        const t = i / sampleRate;
        const env = Math.exp(-t * 22);
        data[j] += Math.sin(2 * Math.PI * freq * t) * 0.35 * env;
      }
    }
  };

  // arpeggio
  for (let s = 0; s < steps; s++) {
    const noteIdx = s % NOTE_NAMES.length;
    const octave = Math.floor(s / NOTE_NAMES.length) % 2;
    const midi = base + NOTE_NAMES[noteIdx] + octave * 12;
    const freq = midiToFreq(midi);
    const type = genre === "ambient" ? "sine" : s % 7 === 0 ? "saw" : "triangle";
    addNote(s * stepDur, freq, 0.16, type);
  }

  if (genre !== "ambient") addBass();

  // soft pad
  const padFreq = midiToFreq(base - 12);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    data[i] += Math.sin(2 * Math.PI * padFreq * t) * 0.04 * Math.sin((Math.PI * i) / n);
  }

  // normalize
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
  const gain = peak > 0 ? 0.7 / peak : 0;

  const header = makeWavHeader(sampleRate, n);
  const out = Buffer.alloc(44 + n * 2);
  header.copy(out, 0);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, data[i] * gain));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return out;
}

module.exports = { synthesizeWav };
