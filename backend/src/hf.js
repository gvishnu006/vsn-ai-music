const config = require("./config");

class HfRateLimitError extends Error {}
class HfAuthError extends Error {}
class HfModelError extends Error {}

function endpointFor(model) {
  return `${config.hfEndpoint}/${encodeURIComponent(model)}`;
}

async function fetchAudio(model, body, { maxRetries = 2 } = {}) {
  if (!config.hfToken) {
    throw new HfAuthError(
      "Hugging Face API token is missing. Add HF_API_TOKEN to the backend to enable real generation."
    );
  }

  let attempt = 0;
  let lastErr = null;

  while (attempt <= maxRetries) {
    const res = await fetch(endpointFor(model), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      lastErr = new HfRateLimitError(
        "Hugging Face's free tier is busy right now. Wait a minute and try again."
      );
    } else if (res.status === 401 || res.status === 403) {
      throw new HfAuthError("Hugging Face API token is invalid or expired.");
    } else if (res.status === 503) {
      // Model cold start / loading
      lastErr = new HfModelError(
        "The AI model is waking up (free tier cold start). Retrying…"
      );
    } else if (res.status === 404) {
      throw new HfModelError(
        "The configured AI model is not available on Hugging Face Inference. Check HF_MODEL_MUSIC / HF_MODEL_VOCAL."
      );
    } else if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HfModelError(`Hugging Face returned ${res.status}: ${text.slice(0, 200)}`);
    } else {
      const contentType = res.headers.get("content-type") || "";
      const buf = Buffer.from(await res.arrayBuffer());
      if (contentType.includes("application/json") || buf.length < 100) {
        const text = buf.toString("utf8").slice(0, 200);
        throw new HfModelError(`The model did not return audio (${text || "empty response"}).`);
      }
      return buf;
    }

    attempt++;
    if (attempt <= maxRetries) {
      const wait = Math.min(15000, 2000 * Math.pow(3, attempt));
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  throw lastErr || new HfModelError("Audio generation failed.");
}

/** WAV peak extraction for waveform visualization. */
function extractPeaks(buffer, buckets = 96) {
  try {
    if (!buffer || buffer.length < 44) return [];
    let offset = 12;
    let dataOffset = -1;
    let dataSize = 0;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString("ascii", offset, offset + 4);
      const size = buffer.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = size;
        break;
      }
      offset += 8 + size + (size % 2);
    }
    if (dataOffset < 0) return [];

    const bytesPerSample = 2;
    const usable = Math.max(0, Math.floor(dataSize / bytesPerSample));
    if (usable < 16) return [];
    const peaks = new Array(buckets).fill(0);
    for (let i = 0; i < buckets; i++) {
      const start = Math.floor((i / buckets) * usable);
      const end = Math.floor(((i + 1) / buckets) * usable);
      let max = 0;
      const step = Math.max(1, Math.floor((end - start) / 64));
      for (let j = start; j < end; j += step) {
        const sample = buffer.readInt16LE(dataOffset + j * 2);
        const abs = Math.abs(sample) / 32768;
        if (abs > max) max = abs;
      }
      peaks[i] = Math.max(0.06, Math.min(1, max * 2.2));
    }
    return peaks;
  } catch {
    return [];
  }
}

module.exports = {
  fetchAudio,
  extractPeaks,
  HfRateLimitError,
  HfAuthError,
  HfModelError,
};
