import { defineConfig } from "@playwright/test";

const PORT = 3217;

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/.results",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Mobile-first: 375 px base viewport.
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  },
  webServer: {
    // Production build (skips the dataset re-download; exercises.slim.json must exist — run `npm run slim` once).
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
