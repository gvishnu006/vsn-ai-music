require("dotenv").config();
const path = require("path");
const fs = require("fs");

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (!raw) return null;
  if (raw.trim().startsWith("{")) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(raw.trim(), "utf8"));
  } catch {
    return null;
  }
}

const serviceAccount = readServiceAccount();

const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  demoMode: process.env.DEMO_MODE !== "0",

  hfToken: process.env.HF_API_TOKEN || "",
  hfModelMusic: process.env.HF_MODEL_MUSIC || "facebook/musicgen-small",
  hfModelVocal: process.env.HF_MODEL_VOCAL || "",
  hfEndpoint: process.env.HF_ENDPOINT || "https://api-inference.huggingface.co/models",

  dailyLimit: parseInt(process.env.DAILY_LIMIT || "10", 10),

  adminUids: (process.env.ADMIN_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  firebase: {
    serviceAccount,
    projectId:
      serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || "",
    clientEmail:
      serviceAccount?.client_email || process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey:
      serviceAccount?.private_key ||
      (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    storageBucket:
      serviceAccount?.project_id
        ? `${serviceAccount.project_id}.appspot.com`
        : process.env.FIREBASE_STORAGE_BUCKET || "",
  },

  dataDir: path.resolve(__dirname, "..", "data"),
  uploadsDir: path.resolve(__dirname, "..", "uploads"),
};

config.publicBaseUrl =
  config.publicBaseUrl ||
  `http://localhost:${config.port}`;

config.firebaseConfigured = Boolean(
  config.firebase.projectId &&
    (config.firebase.serviceAccount ||
      (config.firebase.clientEmail && config.firebase.privateKey))
);

module.exports = config;
