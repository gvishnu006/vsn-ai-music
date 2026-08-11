const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../auth");
const store = require("../store");
const { saveAudio } = require("../storage");
const { generateSong, defaultTitle } = require("../engine");
const config = require("../config");
const { HfRateLimitError, HfAuthError, HfModelError } = require("../hf");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const genre = typeof body.genre === "string" ? body.genre : "Pop";
  const language = typeof body.language === "string" ? body.language : "English";
  const voiceStyle = typeof body.voiceStyle === "string" ? body.voiceStyle : "female-warm";
  const instrumental = Boolean(body.instrumental);
  const duration = Math.min(120, Math.max(5, Number(body.duration) || 30));
  const title = typeof body.title === "string" ? body.title : "";
  const remixedFrom = typeof body.remixedFrom === "string" ? body.remixedFrom : null;

  if (!prompt) {
    return res.status(400).json({ error: "A prompt or lyrics are required." });
  }
  if (prompt.length > 5000) {
    return res.status(400).json({ error: "Prompt is too long (max 5000 characters)." });
  }

  try {
    const quota = await store.getUsage(req.user.uid);
    if (quota.usedToday >= config.dailyLimit) {
      return res.status(429).json({
        code: "quota_exceeded",
        error: "Daily limit reached. You can generate more songs tomorrow!",
        usedToday: quota.usedToday,
        limit: quota.limit,
      });
    }

    const gen = await generateSong({ prompt, genre, language, voiceStyle, instrumental, duration });

    const id = crypto.randomUUID();
    const filename = `${id}.wav`;
    const audioUrl = await saveAudio(filename, gen.audioBuffer);

    const song = {
      id,
      title: defaultTitle({ title, prompt }),
      prompt,
      lyrics: "",
      genre,
      language,
      voiceStyle,
      instrumental,
      duration: gen.duration,
      audioUrl,
      coverUrl: "",
      ownerId: req.user.uid,
      ownerName: req.user.displayName,
      ownerPhoto: req.user.photoURL || "",
      isPublic: true,
      remixedFrom,
      playCount: 0,
      likeCount: 0,
      createdAt: Date.now(),
      edited: false,
      editSettings: null,
      waveform: gen.waveform,
      status: "ready",
      vocalsNote: gen.vocalsNote || "",
    };

    await store.createSong(song);

    const used = await store.incrementUsage(req.user.uid);
    if (!used.ok) {
      return res.status(429).json({
        code: "quota_exceeded",
        error: "Daily limit reached. You can generate more songs tomorrow!",
        usedToday: used.usedToday,
        limit: used.limit,
      });
    }

    res.json({
      song: store.toClientSong(song),
      creditsRemaining: Math.max(0, used.limit - used.usedToday),
      limit: used.limit,
      queued: false,
    });
  } catch (err) {
    if (err instanceof HfRateLimitError) {
      return res.status(503).json({ error: err.message });
    }
    if (err instanceof HfAuthError) {
      return res.status(500).json({ error: err.message });
    }
    if (err instanceof HfModelError) {
      return res.status(502).json({ error: err.message });
    }
    console.error("[generate]", err);
    res.status(500).json({ error: err.message || "Generation failed. Please try again." });
  }
});

module.exports = router;
