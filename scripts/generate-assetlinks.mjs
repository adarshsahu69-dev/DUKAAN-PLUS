#!/usr/bin/env node
// Compute the SHA-256 fingerprint of the Android signing certificate
// from a keystore and emit a Digital Asset Links file
// (assetlinks.json) that the CI workflow writes to the PWA build.
//
// Usage:
//   node scripts/generate-assetlinks.mjs <keystore> <alias> <keystorePass> <outFile>
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const [, , keystore, alias, storePass, outFile] = process.argv;
if (!keystore || !alias || !storePass || !outFile) {
  console.error("Usage: node generate-assetlinks.mjs <keystore> <alias> <storePass> <outFile>");
  process.exit(1);
}

const fingerprint = execSync(
  `keytool -list -v -keystore "${keystore}" -alias "${alias}" -storepass "${storePass}" | grep -i 'SHA256:' | head -1 | awk '{print $2}'`,
  { stdio: ["ignore", "pipe", "pipe"] }
)
  .toString()
  .trim()
  .toLowerCase()
  .replace(/:/g, "");

if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
  console.error("Could not parse SHA-256 from keytool output:", fingerprint);
  process.exit(1);
}

const link = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.adarshsahu.dukaanplus",
      sha256_cert_fingerprints: [fingerprint],
    },
  },
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "web",
      site: "https://adarshsahu69-dev.github.io",
    },
  },
];

writeFileSync(outFile, JSON.stringify(link, null, 2));
console.log(`Wrote ${outFile} (sha256 ${fingerprint})`);
