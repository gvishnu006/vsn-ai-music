const { fetchAudio, extractPeaks, HfModelError } = require("./hf");
const { synthesizeWav } = require("./synth");
const config = require("./config");

function buildPrompt(params) {
  const { prompt, genre, language, voiceStyle, instrumental } = params;
  const base = prompt.trim();

  if (instrumental) {
    return `${base}. ${genre} instrumental track, no vocals. Mood: ${prompt}.`;
  }

  const voice = voiceStyle ? voiceStyle.replace(/-/g, " ") : "warm";
  let text = base;
  if (!/[\n\r]/.test(base) && base.length < 220) {
    text = `"${base}"`;
  }
  return `${text}. A ${genre} song, sung by a ${voice} vocalist, lyrics in ${language}.`;
}

function wavDuration(buffer) {
  try {
    if (buffer.length < 44) return 0;
    const byteRate = buffer.readUInt32LE(28);
    const dataChunkStart = 36;
    let size = 0;
    if (buffer.toString("ascii", 36, 40) === "data") {
      size = buffer.readUInt32LE(40);
    }
    if (!byteRate) return 0;
    return Math.round(size / byteRate);
  } catch {
    return 0;
  }
}

async function generateInstrumental(params) {
  const prompt = buildPrompt(params);
  const tokens = Math.min(1500, Math.max(256, Math.round(params.duration * 50)));
  const buffer = await fetchAudio(config.hfModelMusic, {
    inputs: prompt,
    parameters: { max_new_tokens: tokens },
  });
  return { buffer, sourceModel: config.hfModelMusic, vocalsNote: "Instrumental only" };
}

async function generateWithVocals(params) {
  // Prefer a dedicated vocal/TTS model when configured.
  if (config.hfModelVocal) {
    try {
      const buffer = await fetchAudio(config.hfModelVocal, {
        inputs: buildPrompt(params),
      });
      return {
        buffer,
        sourceModel: config.hfModelVocal,
        vocalsNote: "Vocals synthesized",
      };
    } catch (err) {
      if (err instanceof HfModelError || err.name === "HfModelError") {
        console.warn("[engine] vocal model failed, falling back to music model:", err.message);
      } else {
        throw err;
      }
    }
  }

  // Fallback: full-song generation from the music model with vocals described.
  const prompt = buildPrompt(params);
  const tokens = Math.min(1500, Math.max(256, Math.round(params.duration * 50)));
  const buffer = await fetchAudio(config.hfModelMusic, {
    inputs: prompt,
    parameters: { max_new_tokens: tokens },
  });
  return {
    buffer,
    sourceModel: config.hfModelMusic,
    vocalsNote:
      "Vocals synthesized as part of the track (free-tier vocal model unavailable)",
  };
}

async function generateSong(params) {
  // Demo synthesis fallback: allows the full flow to work without HF keys.
  if (!config.hfToken && config.demoMode) {
    const buffer = synthesizeWav({
      duration: Math.min(60, params.duration || 30),
      genre: params.genre,
      seed: `${params.language}-${params.voiceStyle}`,
      instrumental: params.instrumental,
    });
    return {
      audioBuffer: buffer,
      sourceModel: "demo-synthesizer",
      vocalsNote: "Demo preview — add a Hugging Face token to generate with real AI models.",
      duration: Math.min(60, params.duration || 30),
      waveform: extractPeaks(buffer, 96),
    };
  }

  const result = params.instrumental
    ? await generateInstrumental(params)
    : await generateWithVocals(params);

  const duration = params.duration || wavDuration(result.buffer) || 30;
  const waveform = extractPeaks(result.buffer, 96);

  return {
    audioBuffer: result.buffer,
    sourceModel: result.sourceModel,
    vocalsNote: result.vocalsNote,
    duration,
    waveform,
  };
}

function defaultTitle(params) {
  const raw = (params.title || params.prompt || "Untitled").trim();
  if (raw.length <= 40) return raw || "Untitled";
  return `${raw.slice(0, 37)}…`;
}

module.exports = { generateSong, buildPrompt, wavDuration, defaultTitle };
