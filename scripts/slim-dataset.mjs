#!/usr/bin/env node
// Downloads the pinned exercises dataset and writes a slim, English-only copy
// to src/data/exercises.slim.json. Runs as `prebuild` (always) and `predev`
// (with --if-missing, so dev startup doesn't re-download 17 MB every time).
//
// Data (JSON) is MIT. Media (GIFs/images) is © Gym visual and is NOT copied —
// only the relative paths are kept; URLs are built at runtime (src/lib/media.ts).

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COMMIT = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";
const SOURCE_URL = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${COMMIT}/data/exercises.json`;
const EXPECTED_COUNT = 1324;
const MAX_BYTES = 3 * 1024 * 1024; // hard fail
const TARGET_BYTES = 1.5 * 1024 * 1024; // soft goal, warn only

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "src/data/exercises.slim.json");

function fail(msg) {
  console.error(`[slim-dataset] FAILED: ${msg}`);
  process.exit(1);
}

function validate(records) {
  if (!Array.isArray(records)) fail("output is not an array");
  if (records.length !== EXPECTED_COUNT) {
    fail(`expected ${EXPECTED_COUNT} records, got ${records.length}`);
  }
  const ids = new Set();
  for (const r of records) {
    if (!r.id || !r.name || !r.category || !r.equipment || !r.target || !r.gif) {
      fail(`record ${JSON.stringify(r.id)} is missing a required field`);
    }
    if (!Array.isArray(r.steps) || r.steps.length === 0) {
      fail(`record ${r.id} has no English steps`);
    }
    if (ids.has(r.id)) fail(`duplicate id ${r.id}`);
    ids.add(r.id);
  }
}

async function existingIsValid() {
  try {
    const data = JSON.parse(await readFile(OUT, "utf8"));
    validate(data);
    return data.length;
  } catch {
    return 0;
  }
}

async function main() {
  if (process.argv.includes("--if-missing")) {
    const n = await existingIsValid();
    if (n) {
      console.log(`[slim-dataset] ${OUT} already valid (${n} records), skipping download`);
      return;
    }
  }

  console.log(`[slim-dataset] downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) fail(`download returned HTTP ${res.status}`);
  const raw = await res.json();
  if (!Array.isArray(raw)) fail("source JSON is not an array");

  const slim = raw.map((e) => ({
    id: String(e.id),
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    target: e.target,
    secondary_muscles: Array.isArray(e.secondary_muscles) ? e.secondary_muscles : [],
    steps: e.instruction_steps?.en ?? [],
    gif: e.gif_url,
    image: e.image,
  }));

  validate(slim);

  const json = JSON.stringify(slim);
  const bytes = Buffer.byteLength(json);
  if (bytes > MAX_BYTES) fail(`output is ${(bytes / 1048576).toFixed(2)} MB (limit 3 MB)`);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, json);
  const { size } = await stat(OUT);
  const mb = (size / 1048576).toFixed(2);
  console.log(`[slim-dataset] wrote ${slim.length} records, ${mb} MB -> ${OUT}`);
  if (size > TARGET_BYTES) console.warn(`[slim-dataset] warning: above the ~1.5 MB goal`);
}

main().catch((err) => fail(err?.stack || String(err)));
