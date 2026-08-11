const express = require("express");
const cors = require("cors");
const config = require("./config");
const generateRoutes = require("./routes/generate");
const songsRoutes = require("./routes/songs");
const meRoutes = require("./routes/me");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");

const app = express();

const allowedOrigins = config.corsOrigin
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Local audio files (demo mode)
app.use("/audio", express.static(config.uploadsDir, { fallthrough: true }));

app.get("/", (req, res) => {
  res.json({
    service: "VSN AI Music Generator API",
    version: "1.0.0",
    docs: "/api/health",
    endpoints: [
      "POST /api/generate",
      "GET /api/songs",
      "GET /api/songs/:id",
      "GET /api/me",
      "GET /api/users/:id",
      "GET /api/admin/stats",
    ],
    demoMode: config.demoMode,
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "vsn-ai-music-backend",
    demoMode: config.demoMode,
    firebase: config.firebaseConfigured,
    huggingFace: Boolean(config.hfToken),
    dailyLimit: config.dailyLimit,
  });
});

app.use("/api/generate", generateRoutes);
app.use("/api/songs", songsRoutes);
app.use("/api/me", meRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// error handler
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Origin not allowed by CORS." });
  }
  console.error("[server]", err);
  res.status(500).json({ error: err.message || "Internal server error." });
});

app.listen(config.port, () => {
  console.log(`VSN backend listening on http://localhost:${config.port}`);
  console.log(`  demoMode=${config.demoMode} firebase=${config.firebaseConfigured} hf=${Boolean(config.hfToken)}`);
  console.log(`  dailyLimit=${config.dailyLimit}`);
  if (!config.hfToken) {
    console.log("  ⚠ HF_API_TOKEN not set — generation will return a clear error message.");
  }
});
