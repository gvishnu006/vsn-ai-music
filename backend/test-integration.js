const fs = require("fs");
const store = require("./src/store");

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

async function main() {
  const fs = require("fs");
  const phase = process.argv[2];

  if (phase === "seed") {
    try { fs.rmSync("./data", { recursive: true, force: true }); } catch {}
    try { fs.rmSync("./uploads", { recursive: true, force: true }); } catch {}
    try { fs.rmSync("./tmp", { recursive: true, force: true }); } catch {}

    await store.ensureUser("seed-user", { displayName: "Seed", email: "s@e.com" });
    await store.createSong({
      id: "seed-song",
      title: "Original",
      prompt: "p",
      genre: "Pop",
      language: "English",
      voiceStyle: "female-warm",
      instrumental: false,
      duration: 8,
      audioUrl: "http://localhost:4000/audio/seed-song.wav",
      ownerId: "seed-user",
      ownerName: "Seed",
      isPublic: true,
      playCount: 0,
      likeCount: 0,
      createdAt: Date.now(),
      waveform: [0.5],
      status: "ready",
    });
    fs.mkdirSync("./tmp", { recursive: true });
    fs.writeFileSync("./tmp/edit.wav", makeWav(6));
    console.log("SEEDED");
    process.exit(0);
  }

  const form = new FormData();
  form.append("audio", new Blob([fs.readFileSync("./tmp/edit.wav")], { type: "audio/wav" }), "edit.wav");
  form.append("title", "Original (Edit)");
  form.append("duration", "6");
  form.append("editSettings", JSON.stringify({ trimStart: 1, trimEnd: 6, vocalVolume: 0.8, instrumentalVolume: 0.5, tempo: 1.1, pitch: 2, fadeIn: 0.5, fadeOut: 1 }));
  form.append("waveform", JSON.stringify([0.2, 0.5, 0.9, 0.4]));

  const res = await fetch("http://localhost:4000/api/songs/seed-song/edit", {
    method: "POST",
    headers: { Authorization: "Bearer demo-seed-user" },
    body: form,
  });
  const body = await res.json();
  console.log("status", res.status);
  if (!res.ok) { console.error(body); process.exit(1); }
  const song = body.song;
  console.log("PASS edit:", song.id, "| title:", song.title, "| edited:", song.edited, "| remixedFrom:", song.remixedFrom, "| audioUrl:", song.audioUrl);
  const stored = await store.getSong(song.id);
  console.log("PASS stored audio exists:", fs.existsSync("./uploads/" + song.id + ".wav"));
  console.log("PASS editSettings:", JSON.stringify(stored.editSettings));

  // liked scope check
  await store.toggleLike("seed-song", "seed-user", true);
  const liked = await store.likedSongs("seed-user");
  console.log("PASS likedSongs:", liked);
}

main().then(() => { console.log("INTEGRATION OK"); process.exit(0); }).catch((e) => { console.error("FAIL", e); process.exit(1); });
