const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const config = require("./config");

let adminApp = null;
let db = null;
let auth = null;
let bucket = null;

if (config.firebaseConfigured) {
  const options = { storageBucket: config.firebase.storageBucket };
  if (config.firebase.serviceAccount) {
    options.credential = cert(config.firebase.serviceAccount);
  } else {
    options.credential = cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    });
  }

  if (getApps().length === 0) {
    try {
      adminApp = initializeApp(options);
    } catch (err) {
      // If partially initialized with different options, reuse the existing app.
      if (getApps().length === 0) throw err;
      adminApp = getApps()[0];
    }
  } else {
    adminApp = getApps()[0];
  }

  auth = getAuth(adminApp);
  db = getFirestore(adminApp);
  try {
    bucket = getStorage(adminApp).bucket();
  } catch (err) {
    console.warn("[firebase] Storage bucket not available:", err.message);
  }
} else {
  console.log(
    "[firebase] Not configured — running in DEMO mode (no Firebase). Set DEMO_MODE=0 in production."
  );
}

module.exports = { adminApp, db, auth, bucket, configured: config.firebaseConfigured };
