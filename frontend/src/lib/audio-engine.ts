/**
 * Client-side audio processing for the VSN Editor.
 * Uses the Web Audio API: trim, tempo, pitch, fades, and an
 * approximate vocal/instrumental balance (EQ-based, no true stems).
 */

import type { EditSettings } from "@/lib/types";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (typeof window === "undefined") throw new Error("Web Audio unavailable");
  if (!audioCtx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) throw new Error("AudioContext unsupported");
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load audio for editing.");
  const arrayBuf = await res.arrayBuffer();
  return getCtx().decodeAudioData(arrayBuf);
}

const DEFAULT_SETTINGS: EditSettings = {
  trimStart: 0,
  trimEnd: 0,
  vocalVolume: 1,
  instrumentalVolume: 1,
  tempo: 1,
  pitch: 0,
  fadeIn: 0,
  fadeOut: 0,
};

export function buildSettings(partial?: Partial<EditSettings>): EditSettings {
  return { ...DEFAULT_SETTINGS, ...partial };
}

export function semitoneToDetune(semitones: number): number {
  return Math.round(semitones * 100);
}

/**
 * Builds the processing graph onto the given context.
 * Returns { source, stopNodes } so callers can also render offline.
 */
function buildGraph(
  ctx: AudioContext | OfflineAudioContext,
  buffer: AudioBuffer,
  settings: EditSettings
) {
  const { trimStart, trimEnd, vocalVolume, instrumentalVolume, tempo, pitch, fadeIn, fadeOut } =
    settings;

  const trimEndClamped = trimEnd > 0 ? Math.min(trimEnd, buffer.duration) : buffer.duration;
  const start = Math.min(trimStart, Math.max(0, trimEndClamped - 0.05));
  const dur = Math.max(0.05, trimEndClamped - start);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = tempo;
  source.detune.value = semitoneToDetune(pitch);

  // Approximate vocal/instrumental balance via EQ
  const vocalBoost = ctx.createBiquadFilter();
  vocalBoost.type = "peaking";
  vocalBoost.frequency.value = 2400;
  vocalBoost.Q.value = 0.9;
  vocalBoost.gain.value = (Math.min(1, Math.max(0, vocalVolume)) - 0.5) * 14;

  const instrumentBoost = ctx.createBiquadFilter();
  instrumentBoost.type = "lowshelf";
  instrumentBoost.frequency.value = 220;
  instrumentBoost.gain.value = (Math.min(1, Math.max(0, instrumentalVolume)) - 0.5) * 12;

  const master = ctx.createGain();
  master.gain.value = 0.25 * (vocalVolume * 0.65 + instrumentalVolume * 0.35) + 0.5;

  source.connect(vocalBoost);
  vocalBoost.connect(instrumentBoost);
  instrumentBoost.connect(master);
  master.connect(ctx.destination);

  // Fades
  const t0 = ctx.currentTime ?? 0;
  const fades: [number, number][] = [];
  const fadeInT = Math.min(fadeIn, dur / 2);
  const fadeOutT = Math.min(fadeOut, dur / 2);
  if (fadeInT > 0) {
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.linearRampToValueAtTime(master.gain.value, t0 + fadeInT);
  }
  if (fadeOutT > 0) {
    const endT = t0 + dur - fadeOutT;
    master.gain.setValueAtTime(master.gain.value, endT);
    master.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  }
  void fades;

  return { source, start, dur };
}

/**
 * Live preview: plays the buffer through the processing graph.
 * Returns a stop function.
 */
export function previewBuffer(
  buffer: AudioBuffer,
  settings: EditSettings,
  onEnded?: () => void
): () => void {
  const ctx = getCtx();
  const { source, start, dur } = buildGraph(ctx, buffer, settings);
  source.onended = () => onEnded?.();
  source.start(0, start, dur);
  return () => {
    try {
      source.stop();
    } catch {
      /* noop */
    }
  };
}

/**
 * Offline render of the edited audio, exported as a 16-bit PCM WAV blob.
 */
export async function renderEditedWav(
  buffer: AudioBuffer,
  settings: EditSettings
): Promise<Blob> {
  const { trimStart, trimEnd, tempo } = settings;
  const end = trimEnd > 0 ? Math.min(trimEnd, buffer.duration) : buffer.duration;
  const start = Math.min(trimStart, Math.max(0, end - 0.05));
  const dur = Math.max(0.05, end - start);
  const length = Math.max(1, Math.floor((dur / Math.max(0.01, tempo)) * 44100));

  const offline = new OfflineAudioContext(2, length, 44100);
  buildGraph(offline, buffer, settings);
  const rendered = await offline.startRendering();

  const channelData = [rendered.getChannelData(0)];
  if (rendered.numberOfChannels > 1) channelData.push(rendered.getChannelData(1));

  return encodeWav(channelData, rendered.sampleRate);
}

function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const numChannels = channels.length;
  const numFrames = channels[0].length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][frame];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}
