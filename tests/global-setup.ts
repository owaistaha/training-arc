import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/** Start every run with an empty tests/screenshots/ (no stale shots from earlier runs, whichever specs run). */
export default function globalSetup() {
  // `npm run test:live` takes no screenshots, so leave the last e2e set alone.
  if (process.argv.includes("--project=live")) return;
  const dir = join(__dirname, "screenshots");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}
