const fs = require("fs");
const path = require("path");
const { bucket, configured } = require("./firebase");
const config = require("./config");

/**
 * Persist generated audio and return a public URL.
 * - Firebase configured: uploads to Storage, makes file public.
 * - Otherwise: writes to ./uploads and serves via express.static.
 */
async function saveAudio(filename, buffer, contentType = "audio/wav") {
  if (configured && bucket) {
    const file = bucket.file(`songs/${filename}`);
    await file.save(buffer, { contentType });
    try {
      await file.makePublic();
    } catch (err) {
      console.warn(
        "[storage] makePublic failed (ensure Storage read rules allow public access):",
        err.message
      );
    }
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
      `songs/${filename}`
    )}?alt=media`;
  }

  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(config.uploadsDir, filename), buffer);
  return `${config.publicBaseUrl}/audio/${filename}`;
}

async function deleteAudio(filename) {
  if (configured && bucket) {
    try {
      await bucket.file(`songs/${filename}`).delete();
    } catch {
      /* already gone */
    }
    return;
  }
  const localPath = path.join(config.uploadsDir, filename);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
  }
}

module.exports = { saveAudio, deleteAudio };
