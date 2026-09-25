#!/usr/bin/env node
// Converts hand-generated archetype art into app-ready WebP.
//
//   art-raw/<id>.png|jpg|jpeg|webp  →  public/archetypes/<id>.webp  (768×1024, 3:4, q≈82)
//
// Steps per image:
//   1. Flatten any transparency onto #0A0A0F (our --color-bg).
//   2. Watermark: look for a bright mark in one corner (Gemini-app style) and
//      crop it off. By default the crop margin is measured from the mark's
//      bounding box (+8 px); `--wm-margin` sets a fixed margin instead.
//      `--wm-mode paint` covers the mark with #0A0A0F instead of cropping
//      (no framing loss on a solid background).
//   3. Fit to 3:4. Too wide: centre-crop the sides. Too tall: pad the sides
//      with #0A0A0F, so heads and feet are never cut off.
//   4. Resize to 768×1024, feather the edges into #0A0A0F so they vanish on
//      the dark UI, export WebP.
//
// Usage:
//   npm run art                              all six archetypes
//   npm run art -- warrior ninja             only these
//   npm run art -- --wm-margin=10%           fixed watermark crop instead of measured
//   npm run art -- --watermark=off           never crop a corner
//   npm run art -- --wm-mode=paint           paint the corner instead of cropping
//
// Options (defaults in brackets):
//   --in=DIR            source folder                     [art-raw]
//   --out=DIR           output folder                     [public/archetypes]
//   --watermark=MODE    auto | on | off                   [auto]
//   --wm-margin=N       auto, or fixed px / %             [auto] (auto = mark's extent + 8 px;
//                                                                  % is of the shorter side)
//   --wm-search=N       corner area searched for a mark   [15%]
//   --wm-corner=C       br | bl | tr | tl                 [br]
//   --wm-mode=M         crop | paint                      [crop]
//   --fit=F             auto | cover | contain            [auto]
//   --feather=PX        edge fade into #0A0A0F, 0 = off   [16]
//   --quality=Q         WebP quality                      [82]

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BG = { r: 0x0a, g: 0x0a, b: 0x0f, alpha: 1 };
const BG_HEX = "#0A0A0F";
const OUT_W = 768;
const OUT_H = 1024;
const TARGET_RATIO = OUT_W / OUT_H; // 3:4
const EXTS = [".png", ".jpg", ".jpeg", ".webp"];
const SIZE_BUDGET_KB = 120;

// ---------- settings ----------
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const settings = {
  inDir: resolve(ROOT, flag("in", "art-raw")),
  outDir: resolve(ROOT, flag("out", "public/archetypes")),
  watermark: flag("watermark", "auto"),
  wmMargin: flag("wm-margin", "auto"),
  wmSearch: flag("wm-search", "15%"),
  wmCorner: flag("wm-corner", "br"),
  wmMode: flag("wm-mode", "crop"),
  fit: flag("fit", "auto"),
  feather: Number(flag("feather", "16")),
  quality: Number(flag("quality", "82")),
};

const fail = (msg) => {
  console.error(`[convert-art] ${msg}`);
  process.exit(1);
};
if (!["auto", "on", "off"].includes(settings.watermark)) fail(`--watermark must be auto|on|off`);
if (!["br", "bl", "tr", "tl"].includes(settings.wmCorner)) fail(`--wm-corner must be br|bl|tr|tl`);
if (!["crop", "paint"].includes(settings.wmMode)) fail(`--wm-mode must be crop|paint`);
if (!["auto", "cover", "contain"].includes(settings.fit)) fail(`--fit must be auto|cover|contain`);
const SIZE_RE = /^\d+(\.\d+)?(px|%)?$/;
if (settings.wmMargin !== "auto" && !SIZE_RE.test(settings.wmMargin)) fail(`--wm-margin must be auto, or look like 64, 64px or 8%`);
if (!SIZE_RE.test(settings.wmSearch)) fail(`--wm-search must look like 160, 160px or 15%`);
if (!(settings.quality >= 1 && settings.quality <= 100)) fail(`--quality must be 1-100`);
if (!(settings.feather >= 0)) fail(`--feather must be >= 0`);

const archetypeIds = JSON.parse(readFileSync(join(ROOT, "src/data/archetypes.json"), "utf8")).map((a) => a.id);
const requestedIds = args.filter((a) => !a.startsWith("--"));
for (const id of requestedIds) if (!archetypeIds.includes(id)) fail(`unknown archetype id "${id}" (known: ${archetypeIds.join(", ")})`);
const ids = requestedIds.length ? requestedIds : archetypeIds;

// ---------- helpers ----------
const WM_PAD = 8; // px of safety beyond the measured mark
const FALLBACK_MARGIN = "8%"; // used with --watermark=on when no mark is measurable

function sizePx(value, w, h) {
  const n = parseFloat(value);
  return Math.round(value.endsWith("%") ? (Math.min(w, h) * n) / 100 : n);
}

/** Region for a corner of size `m`. */
function cornerRect(corner, w, h, m) {
  const left = corner.endsWith("r") ? w - m : 0;
  const top = corner.startsWith("b") ? h - m : 0;
  return { left, top, width: m, height: m };
}

const OPPOSITE = { br: "bl", bl: "br", tr: "tl", tl: "tr" };

/**
 * Bright pixels (luma > 96) in a region: their share (the dark background scores ~0)
 * and their bounding box in region coordinates.
 */
async function brightPixels(buf, rect) {
  const { data, info } = await sharp(buf).extract(rect).greyscale().raw().toBuffer({ resolveWithObject: true });
  let bright = 0;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels] > 96) {
        bright++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { share: bright / (info.width * info.height), box: bright ? { minX, minY, maxX, maxY } : null };
}

/** How far in from the image edges the mark reaches (the larger of the two directions). */
function markDepth(corner, box, size) {
  const dx = corner.endsWith("r") ? size - box.minX : box.maxX + 1;
  const dy = corner.startsWith("b") ? size - box.minY : box.maxY + 1;
  return Math.max(dx, dy);
}

/**
 * Watermark heuristic: our art has a solid near-black background, so a corner
 * with visible bright pixels, where the mirrored corner has none, is almost
 * certainly a mark.
 */
async function detectWatermark(buf, w, h, search) {
  const here = await brightPixels(buf, cornerRect(settings.wmCorner, w, h, search));
  const there = await brightPixels(buf, cornerRect(OPPOSITE[settings.wmCorner], w, h, search));
  const found = here.share > 0.002 && here.share > there.share * 4 + 0.001;
  const depth = here.box ? markDepth(settings.wmCorner, here.box, search) : 0;
  return { found, depth };
}

function featherOverlay(f) {
  const stop = (id, x2, y2) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="${BG_HEX}" stop-opacity="1"/><stop offset="1" stop-color="${BG_HEX}" stop-opacity="0"/></linearGradient>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}"><defs>` +
      stop("t", 0, 1) +
      `<linearGradient id="b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${BG_HEX}"/><stop offset="1" stop-color="${BG_HEX}" stop-opacity="0"/></linearGradient>` +
      stop("l", 1, 0) +
      `<linearGradient id="r" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${BG_HEX}"/><stop offset="1" stop-color="${BG_HEX}" stop-opacity="0"/></linearGradient>` +
      `</defs>` +
      `<rect x="0" y="0" width="${OUT_W}" height="${f}" fill="url(#t)"/>` +
      `<rect x="0" y="${OUT_H - f}" width="${OUT_W}" height="${f}" fill="url(#b)"/>` +
      `<rect x="0" y="0" width="${f}" height="${OUT_H}" fill="url(#l)"/>` +
      `<rect x="${OUT_W - f}" y="0" width="${f}" height="${OUT_H}" fill="url(#r)"/>` +
      `</svg>`,
  );
}

async function cornerDeviation(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return Math.max(Math.abs(data[i] - BG.r), Math.abs(data[i + 1] - BG.g), Math.abs(data[i + 2] - BG.b));
  };
  const w = info.width - 1;
  const h = info.height - 1;
  return Math.max(px(0, 0), px(w, 0), px(0, h), px(w, h));
}

// ---------- main ----------
async function convert(id) {
  const src = EXTS.map((e) => join(settings.inDir, id + e)).find(existsSync);
  if (!src) return { id, status: "missing" };

  // 1. EXIF-orient + flatten transparency onto the app background.
  let buf = await sharp(src).rotate().flatten({ background: BG }).toColourspace("srgb").png().toBuffer();
  let { width: w, height: h } = await sharp(buf).metadata();
  const srcSize = `${w}×${h}`;
  const notes = [];

  // 2. Watermark.
  let wm = "off";
  if (settings.watermark !== "off") {
    const search = sizePx(settings.wmSearch, w, h);
    const det = await detectWatermark(buf, w, h, search);
    const remove = settings.watermark === "on" || det.found;
    wm = remove ? (settings.watermark === "on" ? "forced" : "detected") : "none found";
    // Margin: measured from the mark (auto) or fixed.
    const m =
      settings.wmMargin !== "auto"
        ? sizePx(settings.wmMargin, w, h)
        : det.found && det.depth
          ? Math.min(det.depth + WM_PAD, Math.floor(Math.min(w, h) / 4))
          : sizePx(FALLBACK_MARGIN, w, h);
    if (remove && m > 0) {
      if (settings.wmMode === "paint") {
        const r = cornerRect(settings.wmCorner, w, h, m);
        const patch = await sharp({ create: { width: r.width, height: r.height, channels: 4, background: BG } }).png().toBuffer();
        buf = await sharp(buf).composite([{ input: patch, left: r.left, top: r.top }]).png().toBuffer();
        notes.push(`painted ${m}px ${settings.wmCorner} corner`);
      } else {
        // Trim the mark's horizontal edge + the opposite side (keeps the figure centred)
        // and the mark's vertical edge.
        const fromTop = settings.wmCorner.startsWith("t");
        const rect = { left: m, top: fromTop ? m : 0, width: w - 2 * m, height: h - m };
        buf = await sharp(buf).extract(rect).png().toBuffer();
        ({ width: w, height: h } = rect);
        notes.push(`cropped ${m}px (sides + ${fromTop ? "top" : "bottom"})`);
      }
    }
  }

  // 3. Fit to 3:4.
  const ratio = w / h;
  const fit = settings.fit === "auto" ? (ratio > TARGET_RATIO ? "cover" : "contain") : settings.fit;
  if (Math.abs(ratio - TARGET_RATIO) > 0.002) {
    if (fit === "cover") {
      const cw = ratio > TARGET_RATIO ? Math.round(h * TARGET_RATIO) : w;
      const ch = ratio > TARGET_RATIO ? h : Math.round(w / TARGET_RATIO);
      buf = await sharp(buf)
        .extract({ left: Math.floor((w - cw) / 2), top: Math.floor((h - ch) / 2), width: cw, height: ch })
        .png()
        .toBuffer();
      notes.push(`centre-cropped to 3:4`);
    } else {
      const pw = ratio < TARGET_RATIO ? Math.round(h * TARGET_RATIO) - w : 0;
      const ph = ratio > TARGET_RATIO ? Math.round(w / TARGET_RATIO) - h : 0;
      buf = await sharp(buf)
        .extend({ left: Math.floor(pw / 2), right: Math.ceil(pw / 2), top: Math.floor(ph / 2), bottom: Math.ceil(ph / 2), background: BG })
        .png()
        .toBuffer();
      notes.push(`padded to 3:4 with ${BG_HEX}`);
    }
  }
  if (Math.min(w, h) < OUT_H * 0.75) notes.push(`⚠ small source (${srcSize}), will be upscaled`);

  // 4. Resize, feather, export.
  let img = sharp(buf).resize(OUT_W, OUT_H, { fit: "fill", kernel: "lanczos3" });
  if (settings.feather > 0) {
    img = sharp(await img.png().toBuffer()).composite([{ input: featherOverlay(Math.round(settings.feather)) }]);
  }
  mkdirSync(settings.outDir, { recursive: true });
  const out = join(settings.outDir, `${id}.webp`);
  await img.webp({ quality: settings.quality, effort: 6, smartSubsample: true }).toFile(out);

  const kb = Math.round(statSync(out).size / 1024);
  if (kb > SIZE_BUDGET_KB) notes.push(`⚠ ${kb} KB is over the ${SIZE_BUDGET_KB} KB budget (try --quality=75)`);
  const dev = await cornerDeviation(out);
  if (dev > 6) notes.push(`⚠ corners differ from ${BG_HEX} by ${dev} levels (grey halo? try --feather=24)`);
  const meta = await sharp(out).metadata();
  return { id, status: "ok", src: srcSize, out: `${meta.width}×${meta.height}`, kb, wm, notes };
}

async function main() {
  if (!existsSync(settings.inDir)) fail(`no input folder at ${settings.inDir}. Save the images as art-raw/<id>.png first.`);

  const known = new Set(ids.flatMap((id) => EXTS.map((e) => id + e)));
  const strays = readdirSync(settings.inDir).filter((f) => EXTS.includes(extname(f).toLowerCase()) && !known.has(f));
  if (strays.length && !requestedIds.length) console.warn(`[convert-art] ignoring unrecognised files: ${strays.join(", ")}`);

  console.log(
    `[convert-art] watermark=${settings.watermark} margin=${settings.wmMargin} corner=${settings.wmCorner} mode=${settings.wmMode} fit=${settings.fit} feather=${settings.feather}px q=${settings.quality}`,
  );
  let converted = 0;
  const missing = [];
  for (const id of ids) {
    try {
      const r = await convert(id);
      if (r.status === "missing") {
        missing.push(id);
        continue;
      }
      converted++;
      console.log(`  ✓ ${id.padEnd(10)} ${r.src.padEnd(11)} → ${r.out} ${String(r.kb).padStart(4)} KB  watermark: ${r.wm}${r.notes.length ? `  | ${r.notes.join("; ")}` : ""}`);
    } catch (err) {
      console.error(`  ✗ ${id}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  if (missing.length) console.log(`  – not found in ${settings.inDir}: ${missing.join(", ")}`);
  console.log(`[convert-art] ${converted} converted → ${settings.outDir}`);
}

main().catch((e) => fail(e.stack || String(e)));
