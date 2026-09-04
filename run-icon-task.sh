#!/usr/bin/env bash
set -euo pipefail

# Always operate from the repo root (this script lives at repo root).
cd "$(dirname "$0")"

# Ensure sharp is available (declared in scripts/package.json / workspaces).
if ! node -e "require('sharp')" >/dev/null 2>&1; then
  echo "sharp missing; installing scripts workspace..."
  npm install -w scripts --no-audit --no-fund
fi

SRC="/tmp/attachments/agent_1ce93280-4a42-47dc-9c2b-2fff00f39d68/4e2206ca-15db-411f-91ef-a976070d1931/b5322902-ffa8-4b0b-a1a2-ffeb7fb96f84/8eb8417c-3ad6-4037-9079-e2ecbd04020d.png"
DEST_192="web/public/icon-192.png"
DEST_512="web/public/icon-512.png"

echo "=== Step 1: Verify source PNG ==="
if [ ! -f "$SRC" ]; then
  echo "ERROR: Source PNG not found at $SRC"
  exit 1
fi

node -e "
const sharp = require('sharp');
sharp('$SRC').metadata().then(m => {
  console.log(JSON.stringify({exists: true, ...m}, null, 2));
}).catch(e => {
  console.log('ERR:', e.message);
  process.exit(1);
});
"

echo ""
echo "=== Step 2: Generate icons ==="
node -e "
const sharp = require('sharp');
(async () => {
  const src = '$SRC';
  for (const size of [192, 512]) {
    const out = size === 192 ? '$DEST_192' : '$DEST_512';
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(out);
    console.log('wrote', out, `(${size}x${size})`);
  }
})();
"

echo ""
echo "=== Step 3: Verify outputs ==="
node -e "
const sharp = require('sharp');
(async () => {
  for (const f of ['$DEST_192', '$DEST_512']) {
    const m = await sharp(f).metadata();
    const { size } = await require('fs').promises.stat(f);
    console.log(f, JSON.stringify({width: m.width, height: m.height, format: m.format, channels: m.channels, size}));
  }
})();
"

echo ""
echo "=== Step 4: Stage files ==="
git add .gitignore scripts/generate-png-icons.mjs "$DEST_192" "$DEST_512"

echo ""
echo "=== Step 5: Commit ==="
if git diff --cached --quiet; then
  echo "Nothing to commit (already committed by hook or no changes)"
else
  git commit -m "feat: add 192/512px app icon from provided brand asset"
fi

echo ""
echo "=== Step 6: Push ==="
git push || true

echo ""
echo "=== Step 7: Final status ==="
git status --short
HEAD=$(git rev-parse HEAD)
echo "HEAD: $HEAD"
git log -1 --format="%s"
node -e "
const sharp = require('sharp');
sharp('$SRC').metadata().then(m => console.log('Source dimensions:', m.width + 'x' + m.height));
"
echo "Done."
