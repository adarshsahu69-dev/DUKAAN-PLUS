#!/usr/bin/env node
// Usage:
//   1. Download a service account key from the Firebase console:
//        Project settings → Service accounts → Generate new private key
//      Save it as scripts/service-account.json (do NOT commit it).
//   2. npm install --prefix scripts
//   3. node scripts/set-admin-claim.mjs <UID>
//
// To find the UID, sign in once on the website, then look in the
// Firebase console under Authentication → Users.

import admin from "firebase-admin";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadServiceAccount() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath) {
    return JSON.parse(readFileSync(resolve(envPath), "utf8"));
  }
  const localPath = resolve(__dirname, "service-account.json");
  if (existsSync(localPath)) {
    return JSON.parse(readFileSync(localPath, "utf8"));
  }
  console.error(
    "✗ Missing service account. Set GOOGLE_APPLICATION_CREDENTIALS or place\n" +
      "  scripts/service-account.json (download from Firebase console).",
  );
  process.exit(1);
}

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node set-admin-claim.mjs <UID>");
  process.exit(1);
}

const sa = loadServiceAccount();
admin.initializeApp({ credential: admin.credential.cert(sa) });

const auth = admin.auth();
const db = admin.firestore();

const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, { role: "admin" });
await db.doc(`users/${uid}`).set(
  {
    email: user.email || null,
    displayName: user.displayName || (user.email || "").split("@")[0] || "Admin",
    role: "admin",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log(`✓ ${uid} (${user.email || "no-email"}) is now admin.`);
console.log("  The user must sign out and sign back in to pick up the new claim.");
process.exit(0);
