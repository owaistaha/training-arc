import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/** Start every run with an empty tests/screenshots/ (no stale shots from earlier runs, whichever specs run). */
export default function globalSetup() {
  const dir = join(__dirname, "screenshots");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}
