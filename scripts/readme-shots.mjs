/**
 * Builds the README images in docs/screenshots/ from the latest e2e screenshots.
 *   npm run test:e2e && npm run readme:shots
 * Desktop shots (1440×900) are re-encoded as WebP; five phone screens (375 px @2x)
 * are laid out side by side as one "mobile flow" image.
 */
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "tests/screenshots";
const OUT = "docs/screenshots";
const BG = "#0A0A0F"; // --color-bg
mkdirSync(OUT, { recursive: true });

const desktop = {
  "desktop-landing": "d01-desktop-landing.png",
  "desktop-arc-picker": "d04-desktop-arc-picker.png",
  "desktop-reveal": "d06-desktop-reveal.png",
  "desktop-plan": "d07-desktop-plan-week.png",
  "desktop-workout": "d10-desktop-workout-day.png",
};

for (const [name, file] of Object.entries(desktop)) {
  const out = join(OUT, `${name}.webp`);
  await sharp(join(SRC, file)).webp({ quality: 82 }).toFile(out);
  console.log(`${out.padEnd(42)} ${(statSync(out).size / 1024).toFixed(0)} KB`);
}

// Phone flow: landing → arc picker → reveal → week plan → workout day.
const phones = ["01-landing.png", "16-arc-picker-selected.png", "19-reveal.png", "20-plan-week.png", "21-workout-day.png"];
const W = 300; // rendered width of each phone screen
const H = Math.round((W * 812) / 375); // one 375×812 viewport
const GAP = 28;
const PAD = 40;
const RADIUS = 28;
const mask = Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`);
const border = Buffer.from(
  `<svg width="${W}" height="${H}"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${RADIUS}" ry="${RADIUS}" fill="none" stroke="#2A2A38" stroke-width="1"/></svg>`,
);

const tiles = await Promise.all(
  phones.map(async (file) => {
    const img = sharp(join(SRC, file));
    const { width } = await img.metadata();
    // Full-page shots are taller than one viewport: keep the first screen only.
    const first = await img.extract({ left: 0, top: 0, width, height: Math.round((width * 812) / 375) }).toBuffer();
    return sharp(first)
      .resize(W, H)
      .composite([{ input: mask, blend: "dest-in" }, { input: border }])
      .png()
      .toBuffer();
  }),
);

const out = join(OUT, "mobile-flow.webp");
await sharp({ create: { width: PAD * 2 + phones.length * W + (phones.length - 1) * GAP, height: PAD * 2 + H, channels: 4, background: BG } })
  .composite(tiles.map((input, i) => ({ input, left: PAD + i * (W + GAP), top: PAD })))
  .webp({ quality: 85 })
  .toFile(out);
console.log(`${out.padEnd(42)} ${(statSync(out).size / 1024).toFixed(0)} KB`);
