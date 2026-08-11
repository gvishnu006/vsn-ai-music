const express = require("express");
const { requireAuth, optionalAuth } = require("../auth");
const store = require("../store");

const router = express.Router();

/* GET /api/users/:id — public profile + their public songs */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const uid = req.params.id;
    const profile = await store.getUser(uid);
    if (!profile) {
      return res.status(404).json({ error: "User not found." });
    }
    const songs = await store.listMine(uid);
    const publicSongs = songs
      .filter((s) => s.isPublic)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(store.toClientSong);
    const [following, followers, followedByMe] = await Promise.all([
      store.followingList(uid),
      store.followersList(uid),
      req.user ? store.isFollowing(req.user.uid, uid) : Promise.resolve(false),
    ]);
    res.json({
      profile: {
        uid,
        displayName: profile.displayName || "Creator",
        photoURL: profile.photoURL || "",
        bio: profile.bio || "",
        createdAt: profile.createdAt || Date.now(),
        songCount: publicSongs.length,
        followingCount: following.length,
        followerCount: followers.length,
        followedByMe,
      },
      songs: publicSongs,
    });
  } catch (err) {
    console.error("[users] get", err);
    res.status(500).json({ error: "Could not load profile." });
  }
});

/* POST /api/users/:id/follow — body: { follow?: boolean } (toggles when absent) */
router.post("/:id/follow", requireAuth, async (req, res) => {
  try {
    const target = req.params.id;
    if (target === req.user.uid) {
      return res.status(400).json({ error: "You can't follow yourself." });
    }
    const profile = await store.getUser(target);
    if (!profile) {
      return res.status(404).json({ error: "User not found." });
    }
    const follow =
      req.body && typeof req.body.follow === "boolean" ? req.body.follow : undefined;
    const result = await store.toggleFollow(req.user.uid, target, follow);
    res.json(result);
  } catch (err) {
    console.error("[users] follow", err);
    res.status(500).json({ error: "Could not update follow." });
  }
});

/* GET /api/users/:id/followers | /following — list of profiles */
async function listPeople(req, res, kind) {
  try {
    const uid = req.params.id;
    const profile = await store.getUser(uid);
    if (!profile) {
      return res.status(404).json({ error: "User not found." });
    }
    const ids =
      kind === "followers"
        ? await store.followersList(uid)
        : await store.followingList(uid);
    const people = [];
    for (const id of ids) {
      const p = await store.getUser(id);
      if (p) {
        people.push({
          uid: id,
          displayName: p.displayName || "Creator",
          photoURL: p.photoURL || "",
          bio: p.bio || "",
        });
      }
    }
    res.json({ people });
  } catch (err) {
    console.error("[users] people", err);
    res.status(500).json({ error: "Could not load list." });
  }
}

router.get("/:id/followers", async (req, res) => listPeople(req, res, "followers"));
router.get("/:id/following", async (req, res) => listPeople(req, res, "following"));

module.exports = router;
