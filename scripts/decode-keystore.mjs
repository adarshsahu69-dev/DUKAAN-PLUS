import { readFileSync, writeFileSync } from "node:fs";

// Read base64 from stdin
const raw = readFileSync(0, "utf8").trim();

// Strip every character that is not valid standard or URL-safe base64
let clean = raw.replace(/[^A-Za-z0-9+/=_-]/g, "");

// Convert URL-safe base64 to standard base64
clean = clean.replace(/-/g, "+").replace(/_/g, "/");

// Fix missing padding
const pad = 4 - (clean.length % 4);
if (pad !== 4) {
  clean += "=".repeat(pad);
}

try {
  const buf = Buffer.from(clean, "base64");
  if (buf.length === 0) {
    throw new Error("decoded buffer is empty - the base64 secret may be truncated or invalid");
  }
  writeFileSync("dukaan-release.keystore", buf);
  console.log(
    "OK: raw input " + raw.length + " chars, " +
    clean.length + " base64 chars -> " +
    buf.length + " bytes -> dukaan-release.keystore"
  );
} catch (e) {
  console.error("FAIL: could not decode KEYSTORE_BASE64:", e.message);
  console.error("First 40 chars of raw input: " + JSON.stringify(raw.slice(0, 40)));
  console.error("Length of cleaned input: " + clean.length);
  process.exit(1);
}
