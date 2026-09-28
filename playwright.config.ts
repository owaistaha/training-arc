import { defineConfig } from "@playwright/test";

const PORT = 3217;
// Set PLAYWRIGHT_BASE_URL to test a deployed site (e.g. a Vercel URL) instead of a local build.
const EXTERNAL_URL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  outputDir: "tests/.results",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: EXTERNAL_URL ?? `http://localhost:${PORT}`,
    // Mobile-first: 375 px base viewport.
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  },
  projects: [
    // Default suite: /api/plan is mocked with tests/fixtures/plan-warrior-4d.json (no Gemini calls).
    { name: "e2e", testDir: "tests/e2e" },
    // Real Gemini, uses free-tier quota: `npm run test:live`.
    { name: "live", testDir: "tests/live" },
  ],
  webServer: EXTERNAL_URL
    ? undefined
    : {
        // Production build (skips the dataset re-download; exercises.slim.json must exist — run `npm run slim` once).
        command: `npx next build && npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        timeout: 240_000,
        reuseExistingServer: false,
      },
});
