/* LIVE test: calls the real /api/plan → Gemini. Uses free-tier quota.
 * Run on purpose only:  npm run test:live
 */
import { expect, test } from "@playwright/test";
import { PlanResponseSchema } from "../../src/lib/planSchema";

const PROFILE = {
  sex: "female",
  age: 29,
  heightCm: 165,
  weightKg: 70,
  targetWeightKg: 62,
  bodyShape: "average",
  bodyType: "endomorph",
  experience: "intermediate",
  daysPerWeek: 5,
  equipment: "home",
  archetype: "ninja",
} as const;

test("live: real Gemini plan through the UI, valid IDs, working GIFs, under 10 s", async ({ page, request }) => {
  await page.goto("/");
  await page.evaluate((p) => localStorage.setItem("ta.profile.v1", JSON.stringify(p)), PROFILE);

  const started = Date.now();
  const responsePromise = page.waitForResponse((r) => r.url().endsWith("/api/plan") && r.request().method() === "POST");
  await page.goto("/reveal");
  const res = await responsePromise;
  const latencyMs = Date.now() - started;
  expect(res.status()).toBe(200);

  const body = PlanResponseSchema.parse(await res.json());
  console.log(`source=${body.source}${body.fallbackReason ? ` (${body.fallbackReason})` : ""}, latency=${(latencyMs / 1000).toFixed(1)} s`);
  expect(body.source, `Gemini fell back to the template: ${body.fallbackReason}`).toBe("ai");
  expect(latencyMs).toBeLessThan(10_000);

  expect(body.plan.days).toHaveLength(PROFILE.daysPerWeek);
  for (const day of body.plan.days) {
    expect(day.exercises.length).toBeGreaterThanOrEqual(4);
    expect(day.exercises.length).toBeLessThanOrEqual(7);
    for (const ex of day.exercises) expect(body.exercises[ex.exerciseId], `missing info for ${ex.exerciseId}`).toBeTruthy();
  }

  // Every GIF the plan references exists at the pinned commit.
  const base = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/";
  for (const info of Object.values(body.exercises)) {
    const gif = await request.get(base + info.gif);
    expect(gif.status(), info.gif).toBe(200);
  }

  // And the UI picks it up.
  await page.getByRole("button", { name: "See my training plan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Shadow Ninja Arc/ })).toBeVisible();
  await expect(page.getByText("AI coach plan")).toBeVisible();
});
