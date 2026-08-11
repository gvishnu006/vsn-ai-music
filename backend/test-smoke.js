const assert = require("assert");
const fs = require("fs");
const path = require("path");
const config = require("./src/config");
const store = require("./src/store");

async function main() {
  const uidKey = "smoke-user";

  // cleanup
  try { fs.rmSync(config.dataDir, { recursive: true, force: true }); } catch {}

  // 1. profile
  const profile = await store.ensureUser(uidKey, { displayName: "Smoke", email: "s@x.com" });
  assert.ok(profile.uid === uidKey);
  console.log("PASS ensureUser");

  // 2. quota: allow exactly dailyLimit, then block
  for (let i = 0; i < config.dailyLimit; i++) {
    const r = await store.incrementUsage(uidKey);
    assert.ok(r.ok, `expected ok at ${i}`);
  }
  const over = await store.incrementUsage(uidKey);
  assert.ok(!over.ok && over.usedToday === config.dailyLimit);
  console.log(`PASS quota (limit=${config.dailyLimit}, blocked at ${over.usedToday})`);

  // 3. song lifecycle
  const wav = makeWav(8000);
  const song = await store.createSong({
    id: "s1",
    title: "Test Song",
    prompt: "p",
    genre: "Pop",
    language: "English",
    voiceStyle: "female-warm",
    instrumental: false,
    duration: 8,
    audioUrl: "http://localhost:4000/audio/s1.wav",
    ownerId: uidKey,
    ownerName: "Smoke",
    isPublic: true,
    playCount: 0,
    likeCount: 0,
    createdAt: Date.now(),
    waveform: [0.5],
    status: "ready",
  });
  assert.ok((await store.getSong("s1")).title === "Test Song");
  assert.equal((await store.listMine(uidKey)).length, 1);
  assert.equal((await store.listPublic()).length, 1);
  console.log("PASS song create/list");

  await store.incrementPlay("s1");
  assert.equal((await store.getSong("s1")).playCount, 1);
  console.log("PASS play count");

  const like1 = await store.toggleLike("s1", uidKey, undefined);
  assert.equal(like1.likeCount, 1);
  const like2 = await store.toggleLike("s1", uidKey, false);
  assert.equal(like2.likeCount, 0);
  assert.deepEqual(await store.likedSongs(uidKey), []);
  console.log("PASS likes");

  const c = await store.addComment("s1", { songId: "s1", authorId: uidKey, authorName: "Smoke", text: "nice!", createdAt: Date.now() });
  assert.equal((await store.listComments("s1")).length, 1);
  assert.ok(c.id);
  console.log("PASS comments");

  await store.updateSong("s1", { title: "Renamed" });
  assert.equal((await store.getSong("s1")).title, "Renamed");
  console.log("PASS update");

  await store.deleteSong("s1");
  assert.equal(await store.getSong("s1"), null);
  console.log("PASS delete");

  // 4. usage persists
  assert.equal((await store.getUsage(uidKey)).usedToday, config.dailyLimit);
  console.log("PASS usage persistence");

  console.log("\nALL SMOKE TESTS PASSED");
}

function makeWav(seconds) {
  const sampleRate = 8000;
  const n = sampleRate * seconds;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.round(Math.sin(i / 20) * 8000);
    buf.writeInt16LE(v, 44 + i * 2);
  }
  return buf;
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("SMOKE FAILED:", err);
  process.exit(1);
});
