const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { db, configured } = require("./firebase");
const config = require("./config");

const DB_FILE = path.join(config.dataDir, "db.json");

function uid() {
  return crypto.randomUUID();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function nextMidnight() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.getTime();
}

/* ============================================================
   LOCAL FILE BACKEND (demo mode)
   ============================================================ */

const fileDb = {
  users: {},
  usage: {},
  songs: {},
  comments: {},
  likes: {},
  follows: {},
  reports: {},
};

let loaded = false;

function loadDb() {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      Object.assign(fileDb, parsed);
    }
  } catch (err) {
    console.error("[store] local db load failed:", err.message);
  }
}

function saveDb() {
  if (configured) return;
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(fileDb, null, 2));
  } catch (err) {
    console.error("[store] local db save failed:", err.message);
  }
}

function fileGetUser(uidKey) {
  return fileDb.users[uidKey] || null;
}

function fileSaveUser(uidKey, profile) {
  fileDb.users[uidKey] = { ...fileDb.users[uidKey], ...profile, uid: uidKey };
  saveDb();
  return fileDb.users[uidKey];
}

function fileGetUsage(uidKey) {
  const u = fileDb.usage[uidKey];
  if (!u || u.date !== todayKey()) return { usedToday: 0, limit: config.dailyLimit, resetsAt: nextMidnight() };
  return { usedToday: u.count, limit: config.dailyLimit, resetsAt: nextMidnight() };
}

function fileIncrementUsage(uidKey) {
  const key = todayKey();
  const cur = fileDb.usage[uidKey];
  const count = cur && cur.date === key ? cur.count : 0;
  if (count >= config.dailyLimit) {
    return { ok: false, usedToday: count, limit: config.dailyLimit, resetsAt: nextMidnight() };
  }
  fileDb.usage[uidKey] = { date: key, count: count + 1 };
  saveDb();
  return { ok: true, usedToday: count + 1, limit: config.dailyLimit, resetsAt: nextMidnight() };
}

function fileCreateSong(song) {
  fileDb.songs[song.id] = song;
  saveDb();
  return song;
}

function fileGetSong(id) {
  return fileDb.songs[id] || null;
}

function fileListPublic() {
  return Object.values(fileDb.songs).filter((s) => s.isPublic);
}

function fileListMine(ownerId) {
  return Object.values(fileDb.songs).filter((s) => s.ownerId === ownerId);
}

function fileUpdateSong(id, patch) {
  const song = fileDb.songs[id];
  if (!song) return null;
  fileDb.songs[id] = { ...song, ...patch, id };
  saveDb();
  return fileDb.songs[id];
}

function fileDeleteSong(id) {
  delete fileDb.songs[id];
  saveDb();
}

function fileIncrementPlay(id) {
  const song = fileDb.songs[id];
  if (!song) return;
  song.playCount = (song.playCount || 0) + 1;
  saveDb();
}

function fileToggleLike(id, uidKey, liked) {
  const song = fileDb.songs[id];
  if (!song) return null;
  const map = fileDb.likes[id] || {};
  const wasLiked = Boolean(map[uidKey]);
  const nowLiked = liked !== undefined ? liked : !wasLiked;
  if (nowLiked) map[uidKey] = true;
  else delete map[uidKey];
  fileDb.likes[id] = map;
  song.likeCount = Object.keys(map).length;
  saveDb();
  return { likeCount: song.likeCount, liked: nowLiked };
}

function fileAddComment(songId, comment) {
  const list = fileDb.comments[songId] || [];
  const doc = { id: uid(), ...comment };
  list.push(doc);
  fileDb.comments[songId] = list;
  saveDb();
  return doc;
}

function fileListComments(songId) {
  return (fileDb.comments[songId] || []).sort((a, b) => a.createdAt - b.createdAt);
}

function fileLikedSongs(uidKey) {
  const out = [];
  for (const [sid, map] of Object.entries(fileDb.likes)) {
    if (map[uidKey]) out.push(sid);
  }
  return out;
}

function fileToggleFollow(follower, target, follow) {
  if (follower === target) return null;
  const map = fileDb.follows[follower] || {};
  const wasFollowing = Boolean(map[target]);
  const nowFollowing = follow !== undefined ? follow : !wasFollowing;
  if (nowFollowing) map[target] = true;
  else delete map[target];
  if (Object.keys(map).length === 0) delete fileDb.follows[follower];
  else fileDb.follows[follower] = map;
  saveDb();
  return { following: nowFollowing, followerCount: fileFollowersList(target).length };
}

function fileIsFollowing(follower, target) {
  return Boolean(fileDb.follows[follower] && fileDb.follows[follower][target]);
}

function fileFollowingList(uidKey) {
  return Object.keys(fileDb.follows[uidKey] || {});
}

function fileFollowersList(uidKey) {
  const out = [];
  for (const [follower, targets] of Object.entries(fileDb.follows)) {
    if (targets[uidKey]) out.push(follower);
  }
  return out;
}

function fileAddReport(report) {
  const doc = { id: uid(), ...report };
  fileDb.reports[doc.id] = doc;
  saveDb();
  return doc;
}

function fileHasOpenReport(songId, reporterId) {
  return Object.values(fileDb.reports).some(
    (r) => r.songId === songId && r.reporterId === reporterId && r.status === "open"
  );
}

function fileListReports() {
  return Object.values(fileDb.reports).sort((a, b) => b.createdAt - a.createdAt);
}

function fileGetReport(id) {
  return fileDb.reports[id] || null;
}

function fileUpdateReport(id, patch) {
  const report = fileDb.reports[id];
  if (!report) return null;
  fileDb.reports[id] = { ...report, ...patch, id };
  saveDb();
  return fileDb.reports[id];
}

/* ============================================================
   FIRESTORE BACKEND
   ============================================================ */

function coll(name) {
  return db.collection(name);
}

async function fbEnsureUser(uidKey, data) {
  const ref = coll("users").doc(uidKey);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      uid: uidKey,
      displayName: data.displayName || "Creator",
      email: data.email || "",
      photoURL: data.photoURL || "",
      createdAt: Date.now(),
      dailyQuota: config.dailyLimit,
    });
    return (await ref.get()).data();
  }
  return snap.data();
}

async function fbGetUser(uidKey) {
  const snap = await coll("users").doc(uidKey).get();
  return snap.exists ? snap.data() : null;
}

async function fbIncrementUsage(uidKey) {
  const ref = coll("usage").doc(uidKey);
  const key = todayKey();
  const resetsAt = nextMidnight();
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      let count = 0;
      if (snap.exists && snap.data().date === key) count = snap.data().count;
      if (count >= config.dailyLimit) {
        return { ok: false, usedToday: count, limit: config.dailyLimit, resetsAt };
      }
      tx.set(ref, { date: key, count: count + 1 });
      return { ok: true, usedToday: count + 1, limit: config.dailyLimit, resetsAt };
    });
  } catch (err) {
    console.error("[store] usage transaction failed:", err.message);
    throw new Error("Could not update generation quota. Try again.");
  }
}

async function fbGetUsage(uidKey) {
  const snap = await coll("usage").doc(uidKey).get();
  if (!snap.exists || snap.data().date !== todayKey()) {
    return { usedToday: 0, limit: config.dailyLimit, resetsAt: nextMidnight() };
  }
  return { usedToday: snap.data().count, limit: config.dailyLimit, resetsAt: nextMidnight() };
}

async function fbCreateSong(song) {
  await coll("songs").doc(song.id).set(song);
  return song;
}

async function fbGetSong(id) {
  const snap = await coll("songs").doc(id).get();
  return snap.exists ? snap.data() : null;
}

async function fbListPublic({ genre, language, limit: lim = 100 } = {}) {
  let q = coll("songs").where("isPublic", "==", true);
  if (genre) q = q.where("genre", "==", genre);
  if (language) q = q.where("language", "==", language);
  const snap = await q.orderBy("createdAt", "desc").limit(Math.min(lim, 200)).get();
  return snap.docs.map((d) => d.data());
}

async function fbListMine(ownerId) {
  const snap = await coll("songs").where("ownerId", "==", ownerId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => d.data());
}

async function fbUpdateSong(id, patch) {
  await coll("songs").doc(id).update(patch);
  return fbGetSong(id);
}

async function fbDeleteSong(id) {
  await coll("songs").doc(id).delete();
}

async function fbIncrementPlay(id) {
  await coll("songs").doc(id).update({ playCount: db.FieldValue.increment(1) });
}

async function fbToggleLike(id, uidKey, liked) {
  const songRef = coll("songs").doc(id);
  const likeRef = coll("likes").doc(id);
  try {
    return await db.runTransaction(async (tx) => {
      const songSnap = await tx.get(songRef);
      if (!songSnap.exists) return null;
      const likeSnap = await tx.get(likeRef);
      const uids = likeSnap.exists ? likeSnap.data().uids || {} : {};
      const wasLiked = Boolean(uids[uidKey]);
      const nowLiked = liked !== undefined ? liked : !wasLiked;
      if (nowLiked) uids[uidKey] = true;
      else delete uids[uidKey];
      tx.set(likeRef, { uids });
      const likeCount = Object.keys(uids).length;
      tx.update(songRef, { likeCount });
      return { likeCount, liked: nowLiked };
    });
  } catch (err) {
    console.error("[store] like transaction failed:", err.message);
    throw new Error("Could not update like. Try again.");
  }
}

async function fbAddComment(songId, comment) {
  const ref = coll("comments").doc();
  const doc = { id: ref.id, ...comment };
  await ref.set(doc);
  return doc;
}

async function fbListComments(songId) {
  const snap = await coll("comments").where("songId", "==", songId).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => d.data());
}

async function fbLikedSongs(uidKey) {
  const snap = await coll("likes").where(`uids.${uidKey}`, "==", true).get();
  return snap.docs.map((d) => d.id);
}

async function fbToggleFollow(follower, target, follow) {
  if (follower === target) return null;
  const ref = coll("follows").doc(follower);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const uids = snap.exists ? snap.data().uids || {} : {};
      const wasFollowing = Boolean(uids[target]);
      const nowFollowing = follow !== undefined ? follow : !wasFollowing;
      if (nowFollowing) uids[target] = true;
      else delete uids[target];
      tx.set(ref, { uids });
      const followerCount = (await fbFollowersList(target)).length;
      return { following: nowFollowing, followerCount };
    });
  } catch (err) {
    console.error("[store] follow transaction failed:", err.message);
    throw new Error("Could not update follow. Try again.");
  }
}

async function fbIsFollowing(follower, target) {
  if (follower === target) return false;
  const snap = await coll("follows").doc(follower).get();
  return Boolean(snap.exists && snap.data().uids && snap.data().uids[target]);
}

async function fbFollowingList(uidKey) {
  const snap = await coll("follows").doc(uidKey).get();
  return snap.exists ? Object.keys(snap.data().uids || {}) : [];
}

async function fbFollowersList(uidKey) {
  const snap = await coll("follows").where(`uids.${uidKey}`, "==", true).get();
  return snap.docs.map((d) => d.id);
}

async function fbAddReport(report) {
  const ref = coll("reports").doc();
  const doc = { id: ref.id, ...report };
  await ref.set(doc);
  return doc;
}

async function fbHasOpenReport(songId, reporterId) {
  const snap = await coll("reports")
    .where("songId", "==", songId)
    .where("reporterId", "==", reporterId)
    .where("status", "==", "open")
    .limit(1)
    .get();
  return !snap.empty;
}

async function fbListReports() {
  const snap = await coll("reports").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((d) => d.data());
}

async function fbGetReport(id) {
  const snap = await coll("reports").doc(id).get();
  return snap.exists ? snap.data() : null;
}

async function fbUpdateReport(id, patch) {
  await coll("reports").doc(id).update(patch);
  const snap = await coll("reports").doc(id).get();
  return snap.exists ? snap.data() : null;
}

/* ============================================================
   PUBLIC API (auto-selects backend)
   ============================================================ */

function toClientSong(data) {
  if (!data) return null;
  return {
    id: data.id,
    title: data.title || "Untitled",
    prompt: data.prompt || "",
    lyrics: data.lyrics || "",
    genre: data.genre || "Pop",
    language: data.language || "English",
    voiceStyle: data.voiceStyle || "",
    instrumental: Boolean(data.instrumental),
    duration: data.duration || 30,
    audioUrl: data.audioUrl || "",
    coverUrl: data.coverUrl || "",
    ownerId: data.ownerId || "",
    ownerName: data.ownerName || "Creator",
    ownerPhoto: data.ownerPhoto || "",
    isPublic: data.isPublic !== false,
    remixedFrom: data.remixedFrom || null,
    playCount: data.playCount || 0,
    likeCount: data.likeCount || 0,
    createdAt: data.createdAt || Date.now(),
    edited: Boolean(data.edited),
    editSettings: data.editSettings || null,
    waveform: data.waveform || [],
    status: data.status || "ready",
    errorMessage: data.errorMessage || "",
    vocalsNote: data.vocalsNote || "",
  };
}

const api = {
  configured,

  async ensureUser(uidKey, data) {
    if (configured) return fbEnsureUser(uidKey, data);
    loadDb();
    return fileSaveUser(uidKey, data);
  },

  async getUser(uidKey) {
    if (configured) return fbGetUser(uidKey);
    loadDb();
    return fileGetUser(uidKey);
  },

  async incrementUsage(uidKey) {
    if (configured) return fbIncrementUsage(uidKey);
    loadDb();
    return fileIncrementUsage(uidKey);
  },

  async getUsage(uidKey) {
    if (configured) return fbGetUsage(uidKey);
    loadDb();
    return fileGetUsage(uidKey);
  },

  async createSong(song) {
    if (configured) return fbCreateSong(song);
    loadDb();
    return fileCreateSong(song);
  },

  async getSong(id) {
    if (configured) return fbGetSong(id);
    loadDb();
    return fileGetSong(id);
  },

  async listPublic(filters) {
    if (configured) return fbListPublic(filters);
    loadDb();
    return fileListPublic();
  },

  async listMine(ownerId) {
    if (configured) return fbListMine(ownerId);
    loadDb();
    return fileListMine(ownerId);
  },

  async updateSong(id, patch) {
    if (configured) return fbUpdateSong(id, patch);
    loadDb();
    return fileUpdateSong(id, patch);
  },

  async deleteSong(id) {
    if (configured) return fbDeleteSong(id);
    loadDb();
    fileDeleteSong(id);
  },

  async incrementPlay(id) {
    if (configured) return fbIncrementPlay(id);
    loadDb();
    fileIncrementPlay(id);
  },

  async toggleLike(id, uidKey, liked) {
    if (configured) return fbToggleLike(id, uidKey, liked);
    loadDb();
    return fileToggleLike(id, uidKey, liked);
  },

  async addComment(songId, comment) {
    if (configured) return fbAddComment(songId, comment);
    loadDb();
    return fileAddComment(songId, comment);
  },

  async listComments(songId) {
    if (configured) return fbListComments(songId);
    loadDb();
    return fileListComments(songId);
  },

  async likedSongs(uidKey) {
    if (configured) return fbLikedSongs(uidKey);
    loadDb();
    return fileLikedSongs(uidKey);
  },

  async toggleFollow(follower, target, follow) {
    if (configured) return fbToggleFollow(follower, target, follow);
    loadDb();
    return fileToggleFollow(follower, target, follow);
  },

  async isFollowing(follower, target) {
    if (configured) return fbIsFollowing(follower, target);
    loadDb();
    return fileIsFollowing(follower, target);
  },

  async followingList(uidKey) {
    if (configured) return fbFollowingList(uidKey);
    loadDb();
    return fileFollowingList(uidKey);
  },

  async followersList(uidKey) {
    if (configured) return fbFollowersList(uidKey);
    loadDb();
    return fileFollowersList(uidKey);
  },

  async addReport(report) {
    if (configured) return fbAddReport(report);
    loadDb();
    return fileAddReport(report);
  },

  async hasOpenReport(songId, reporterId) {
    if (configured) return fbHasOpenReport(songId, reporterId);
    loadDb();
    return fileHasOpenReport(songId, reporterId);
  },

  async listReports() {
    if (configured) return fbListReports();
    loadDb();
    return fileListReports();
  },

  async getReport(id) {
    if (configured) return fbGetReport(id);
    loadDb();
    return fileGetReport(id);
  },

  async updateReport(id, patch) {
    if (configured) return fbUpdateReport(id, patch);
    loadDb();
    return fileUpdateReport(id, patch);
  },

  toClientSong,
};

module.exports = api;
