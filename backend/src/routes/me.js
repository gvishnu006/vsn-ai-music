const express = require("express");
const { requireAuth, isAdminUser } = require("../auth");
const store = require("../store");

const router = express.Router();

/* GET /api/me — creates the profile on first login and returns it with usage. */
router.get("/", requireAuth, async (req, res) => {
  try {
    const profile = await store.ensureUser(req.user.uid, {
      displayName: req.user.displayName,
      email: req.user.email || "",
      photoURL: req.user.photoURL || "",
    });
    const usage = await store.getUsage(req.user.uid);
    const [following, followers] = await Promise.all([
      store.followingList(req.user.uid),
      store.followersList(req.user.uid),
    ]);
    res.json({
      profile: {
        uid: profile.uid || req.user.uid,
        displayName: profile.displayName || req.user.displayName,
        email: profile.email || "",
        photoURL: profile.photoURL || "",
        bio: profile.bio || "",
        createdAt: profile.createdAt || Date.now(),
        dailyQuota: usage.limit,
        usedToday: usage.usedToday,
        followingCount: following.length,
        followerCount: followers.length,
        isAdmin: isAdminUser(req.user),
      },
      usage,
    });
  } catch (err) {
    console.error("[me]", err);
    res.status(500).json({ error: "Could not load profile." });
  }
});

/* PATCH /api/me — update display name, photo and bio */
router.patch("/", requireAuth, async (req, res) => {
  try {
    const { displayName, photoURL, bio } = req.body || {};
    const patch = {};
    if (typeof displayName === "string" && displayName.trim()) {
      patch.displayName = displayName.trim().slice(0, 60);
    }
    if (typeof photoURL === "string") patch.photoURL = photoURL.trim().slice(0, 2000);
    if (typeof bio === "string") patch.bio = bio.trim().slice(0, 300);
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Nothing to update." });
    }
    const profile = await store.ensureUser(req.user.uid, patch);
    res.json({
      profile: {
        uid: profile.uid || req.user.uid,
        displayName: profile.displayName || req.user.displayName,
        email: profile.email || "",
        photoURL: profile.photoURL || "",
        bio: profile.bio || "",
        createdAt: profile.createdAt || Date.now(),
      },
    });
  } catch (err) {
    console.error("[me] patch", err);
    res.status(500).json({ error: "Could not update profile." });
  }
});

/* GET /api/me/usage — daily generation quota */
router.get("/usage", requireAuth, async (req, res) => {
  try {
    const usage = await store.getUsage(req.user.uid);
    res.json(usage);
  } catch (err) {
    res.status(500).json({ error: "Could not load quota." });
  }
});

module.exports = router;
