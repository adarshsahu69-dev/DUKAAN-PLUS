// scripts/generate-png-icons.mjs
// Convert the SVG icons in web/public/ to PNGs needed by PWABuilder /
// Bubblewrap TWA validation (192, 512, maskable 192/512/1024, favicon,
// apple-touch). Run via "node scripts/generate-png-icons.mjs" — designed
// to be called from the PWA deploy workflow as a prebuild step so the
// generated PNGs are never committed (they're reproducible from the SVGs).
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "..", "web", "public");

// "any"-purpose icons may be committed as brand source assets; keep the
// committed file instead of regenerating it from the SVG so a provided logo
// survives CI rebuilds.
const COMMITTED = new Set(["icon-192.png", "icon-512.png"]);

const targets = [
  { src: "icon.svg", out: "icon-192.png", size: 192 },
  { src: "icon.svg", out: "icon-512.png", size: 512 },
  { src: "icon-maskable.svg", out: "icon-maskable-192.png", size: 192 },
  { src: "icon-maskable.svg", out: "icon-maskable-512.png", size: 512 },
  { src: "icon-maskable.svg", out: "icon-maskable-1024.png", size: 1024 },
  { src: "favicon.svg", out: "favicon-32.png", size: 32 },
  { src: "favicon.svg", out: "apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  if (COMMITTED.has(t.out) && existsSync(resolve(PUBLIC, t.out))) {
    console.log("skip (committed brand asset)", t.out);
    continue;
  }
  const svg = await readFile(resolve(PUBLIC, t.src));
  const png = await sharp(svg, { density: 384 })
    .resize(t.size, t.size, {
      fit: "contain",
      background: { r: 248, g: 244, b: 236, alpha: 1 },
    })
    .png();
  await writeFile(resolve(PUBLIC, t.out), png);
  console.log("wrote", t.out, `(${t.size}x${t.size})`);
}
