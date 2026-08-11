const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const { requireAuth } = require("../auth");
const store = require("../store");
const { saveAudio, deleteAudio } = require("../storage");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/* GET /api/songs?scope=mine|public|liked&genre=&language= */
router.get("/", async (req, res) => {
  try {
    const scope = req.query.scope || "public";
    if (scope === "mine") {
      const auth = await resolveToken(req);
      if (!auth) return res.status(401).json({ error: "Authentication required." });
      const songs = await store.listMine(auth.uid);
      return res.json({ songs: songs.map(store.toClientSong) });
    }
    if (scope === "liked") {
      const auth = await resolveToken(req);
      if (!auth) return res.status(401).json({ error: "Authentication required." });
      const ids = await store.likedSongs(auth.uid);
      const songs = [];
      for (const id of ids) {
        const s = await store.getSong(id);
        if (s) songs.push(s);
      }
      return res.json({ songs: songs.map(store.toClientSong) });
    }
    const genre = req.query.genre || "";
    const language = req.query.language || "";
    const songs = await store.listPublic({ genre, language });
    res.json({ songs: songs.map(store.toClientSong) });
  } catch (err) {
    console.error("[songs list]", err);
    res.status(500).json({ error: "Could not load songs." });
  }
});

/* GET /api/songs/:id */
router.get("/:id", async (req, res) => {
  try {
    const song = await store.getSong(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found." });
    if (!song.isPublic && song.ownerId !== (await currentUid(req))) {
      return res.status(403).json({ error: "This song is private." });
    }
    res.json({ song: store.toClientSong(song) });
  } catch (err) {
    console.error("[song get]", err);
    res.status(500).json({ error: "Could not load song." });
  }
});

/* POST /api/songs/:id/play — increments play count */
router.post("/:id/play", async (req, res) => {
  try {
    await store.incrementPlay(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Could not record play." });
  }
});

/* POST /api/songs/:id/like — body: { liked?: boolean } */
router.post("/:id/like", requireAuth, async (req, res) => {
  try {
    const liked = req.body?.liked;
    const result = await store.toggleLike(req.params.id, req.user.uid, typeof liked === "boolean" ? liked : undefined);
    if (!result) return res.status(404).json({ error: "Song not found." });
    res.json(result);
  } catch (err) {
    console.error("[like]", err);
    res.status(500).json({ error: err.message || "Could not update like." });
  }
});

/* GET /api/songs/:id/comments */
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await store.listComments(req.params.id);
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: "Could not load comments." });
  }
});

/* POST /api/songs/:id/comments — body: { text } */
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const text = (req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "Comment is empty." });
    if (text.length > 600) return res.status(400).json({ error: "Comment too long (max 600 chars)." });
    const song = await store.getSong(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found." });

    const comment = await store.addComment(req.params.id, {
      songId: req.params.id,
      authorId: req.user.uid,
      authorName: req.user.displayName,
      authorPhoto: req.user.photoURL || "",
      text,
      createdAt: Date.now(),
    });
    res.json({ comment });
  } catch (err) {
    console.error("[comment]", err);
    res.status(500).json({ error: "Could not post comment." });
  }
});

/* POST /api/songs/:id/edit — multipart: audio file + fields.
   Saves an edited copy as a NEW song entry (lineage via remixedFrom). */
router.post("/:id/edit", requireAuth, upload.single("audio"), async (req, res) => {
  try {
    const original = await store.getSong(req.params.id);
    if (!original) return res.status(404).json({ error: "Song not found." });
    if (original.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "You can only edit your own songs." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No edited audio uploaded." });
    }

    let editSettings = null;
    if (req.body.editSettings) {
      try {
        editSettings = JSON.parse(req.body.editSettings);
      } catch {
        editSettings = null;
      }
    }
    let waveform = null;
    if (req.body.waveform) {
      try {
        waveform = JSON.parse(req.body.waveform);
      } catch {
        waveform = null;
      }
    }

    const id = crypto.randomUUID();
    const filename = `${id}.wav`;
    const audioUrl = await saveAudio(filename, req.file.buffer);

    const song = {
      id,
      title: (req.body.title || "").trim() || `${original.title} (Edit)`,
      prompt: original.prompt,
      lyrics: original.lyrics || "",
      genre: original.genre,
      language: original.language,
      voiceStyle: original.voiceStyle,
      instrumental: original.instrumental,
      duration: Number(req.body.duration) || original.duration,
      audioUrl,
      coverUrl: original.coverUrl || "",
      ownerId: req.user.uid,
      ownerName: req.user.displayName,
      ownerPhoto: req.user.photoURL || "",
      isPublic: true,
      remixedFrom: original.id,
      playCount: 0,
      likeCount: 0,
      createdAt: Date.now(),
      edited: true,
      editSettings,
      waveform: waveform || original.waveform || [],
      status: "ready",
      vocalsNote: original.vocalsNote || "",
    };

    await store.createSong(song);
    res.json({ song: store.toClientSong(song) });
  } catch (err) {
    console.error("[edit]", err);
    res.status(500).json({ error: err.message || "Could not save edited song." });
  }
});

/* POST /api/songs/:id/report — body: { reason, details? } */
const REPORT_REASONS = [
  "copyright",
  "spam",
  "offensive",
  "misleading",
  "other",
];

router.post("/:id/report", requireAuth, async (req, res) => {
  try {
    const song = await store.getSong(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found." });
    if (song.ownerId === req.user.uid) {
      return res.status(400).json({ error: "You can't report your own song." });
    }
    const reason = (req.body?.reason || "").trim();
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: "Pick a valid report reason." });
    }
    if (await store.hasOpenReport(req.params.id, req.user.uid)) {
      return res.status(409).json({ error: "You already reported this song." });
    }
    const report = await store.addReport({
      songId: req.params.id,
      songTitle: song.title,
      songOwnerId: song.ownerId,
      reporterId: req.user.uid,
      reporterName: req.user.displayName,
      reason,
      details: (req.body?.details || "").trim().slice(0, 1000),
      status: "open",
      createdAt: Date.now(),
    });
    res.json({ report });
  } catch (err) {
    console.error("[report]", err);
    res.status(500).json({ error: "Could not submit report." });
  }
});

/* DELETE /api/songs/:id */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const song = await store.getSong(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found." });
    if (song.ownerId !== req.user.uid) {
      return res.status(403).json({ error: "You can only delete your own songs." });
    }
    await store.deleteSong(req.params.id);
    if (song.audioUrl) {
      const filename = song.audioUrl.split("/").pop()?.split("?")[0];
      if (filename && filename.endsWith(".wav")) await deleteAudio(filename);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[delete]", err);
    res.status(500).json({ error: "Could not delete song." });
  }
});

/* ---------- helpers ---------- */
function extractBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function resolveToken(req) {
  const token = extractBearer(req);
  if (!token) return null;
  if (token.startsWith("demo-")) {
    return { uid: token.slice("demo-".length), displayName: "Guest Creator" };
  }
  const { auth } = require("../firebase");
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, displayName: decoded.name || "Creator" };
  } catch {
    return null;
  }
}

async function currentUid(req) {
  const auth = await resolveToken(req);
  return auth ? auth.uid : null;
}

module.exports = router;
