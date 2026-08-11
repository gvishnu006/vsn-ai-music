const express = require("express");
const { resolveUser, isAdminUser } = require("../auth");
const config = require("../config");
const store = require("../store");
const { deleteAudio } = require("../storage");

const router = express.Router();

async function requireAdmin(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!isAdminUser(user)) {
      return res.status(403).json({ error: "Admins only." });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Authentication required." });
  }
}

/* GET /api/admin/stats — quick moderation dashboard numbers */
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const reports = await store.listReports();
    const openReports = reports.filter((r) => r.status === "open");
    res.json({
      openReports: openReports.length,
      totalReports: reports.length,
    });
  } catch (err) {
    console.error("[admin stats]", err);
    res.status(500).json({ error: "Could not load stats." });
  }
});

/* GET /api/admin/reports — all reports (newest first) with song status */
router.get("/reports", requireAdmin, async (req, res) => {
  try {
    const reports = await store.listReports();
    const out = [];
    for (const r of reports) {
      const song = await store.getSong(r.songId);
      out.push({
        ...r,
        song: song ? store.toClientSong(song) : null,
      });
    }
    res.json({ reports: out });
  } catch (err) {
    console.error("[admin reports]", err);
    res.status(500).json({ error: "Could not load reports." });
  }
});

/* POST /api/admin/reports/:id/dismiss — mark report closed, no action */
router.post("/reports/:id/dismiss", requireAdmin, async (req, res) => {
  try {
    const report = await store.updateReport(req.params.id, {
      status: "dismissed",
      handledBy: req.user.uid,
      handledAt: Date.now(),
    });
    if (!report) return res.status(404).json({ error: "Report not found." });
    res.json({ report });
  } catch (err) {
    console.error("[admin dismiss]", err);
    res.status(500).json({ error: "Could not dismiss report." });
  }
});

/* POST /api/admin/reports/:id/hide — hide the song (unpublish) + close report */
router.post("/reports/:id/hide", requireAdmin, async (req, res) => {
  try {
    const report = await store.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    const song = await store.getSong(report.songId);
    if (!song) {
      return res.status(404).json({ error: "Song no longer exists." });
    }
    await store.updateSong(report.songId, { isPublic: false, hiddenBy: req.user.uid, hiddenAt: Date.now() });
    await store.updateReport(req.params.id, {
      status: "resolved",
      action: "hide",
      handledBy: req.user.uid,
      handledAt: Date.now(),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin hide]", err);
    res.status(500).json({ error: "Could not hide song." });
  }
});

/* POST /api/admin/reports/:id/delete-song — hard delete song + close report */
router.post("/reports/:id/delete-song", requireAdmin, async (req, res) => {
  try {
    const report = await store.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    const song = await store.getSong(report.songId);
    if (song) {
      await store.deleteSong(song.id);
      if (song.audioUrl) {
        const filename = song.audioUrl.split("/").pop()?.split("?")[0];
        if (filename && filename.endsWith(".wav")) await deleteAudio(filename).catch(() => {});
      }
    }
    await store.updateReport(req.params.id, {
      status: "resolved",
      action: "delete",
      handledBy: req.user.uid,
      handledAt: Date.now(),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin delete]", err);
    res.status(500).json({ error: "Could not delete song." });
  }
});

module.exports = router;
