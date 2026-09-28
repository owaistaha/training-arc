import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PlanResponseSchema, ProfileSchema } from "../../src/lib/planSchema";
import { mockPlanApi, PLAN_FIXTURE } from "./mockPlan";
import ART_MANIFEST from "../../src/data/archetype-art.json";
import ARCHETYPES from "../../src/data/archetypes.json";

const ONBOARDING_URL = /\/onboarding\?step=\d+$/;

const SHOTS = join(__dirname, "..", "screenshots");
rmSync(SHOTS, { recursive: true, force: true }); // no stale shots from earlier runs
mkdirSync(SHOTS, { recursive: true });

let shotNo = 0;
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(350); // let 200–250 ms transitions settle
  const file = join(SHOTS, `${String(++shotNo).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
}

/** No horizontal scroll at 375 px. */
async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "page scrolls horizontally").toBeLessThanOrEqual(clientWidth);
}

/** Every visible button / radio / button-like link is at least 44×44. Inline text links are exempt. */
async function expectTapTargets(page: Page) {
  const offenders = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("button, [role=radio], a, summary"));
    return els
      .filter((el) => !el.closest("figcaption, footer") && el.offsetParent !== null) // inline text links are exempt
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((r) => r.w > 0 && (r.w < 44 || r.h < 44));
  });
  expect(offenders, "tap targets under 44 px").toEqual([]);
}

async function checkScreen(page: Page) {
  await expectNoHorizontalScroll(page);
  await expectTapTargets(page);
}

/** Arc picker: card art is 3:4 at ~300×400, and the whole card sits above the pinned CTA without scrolling. */
async function expectArcFitsAboveCta(page: Page) {
  const card = await page.locator("[data-archetype]").first().boundingBox();
  const art = await page.locator("[data-archetype] > div").first().boundingBox();
  const cta = await page.getByRole("button", { name: /This is my goal|Tap an archetype/ }).boundingBox();
  // ~300×400 (the card's 1 px border sits inside its 300 px width) and exactly 3:4.
  expect(art!.width).toBeGreaterThanOrEqual(296);
  expect(art!.width).toBeLessThanOrEqual(300);
  expect(Math.abs(art!.height - (art!.width * 4) / 3)).toBeLessThanOrEqual(1);
  expect(card!.y + card!.height, "card is covered by the CTA").toBeLessThanOrEqual(cta!.y - 16);
  // Nothing (card or page dots) may sit under the pinned footer's fade-out either.
  const fade = await page.locator("[data-pinned-footer]").boundingBox();
  const dots = await page.locator("[data-arc-dots]").boundingBox();
  expect(card!.y + card!.height, "card is under the footer fade").toBeLessThanOrEqual(fade!.y);
  expect(dots!.y + dots!.height, "page dots are under the footer fade").toBeLessThanOrEqual(fade!.y);
}

/** Every card shows its WebP art if the manifest lists it (loaded, 768×1024, alt from archetypes.json), else the silhouette. */
async function expectArchetypeArt(page: Page) {
  const manifest = ART_MANIFEST as Record<string, { src: string }>;
  for (const a of ARCHETYPES) {
    const card = page.locator(`[data-archetype="${a.id}"]`);
    await card.scrollIntoViewIfNeeded();
    if (manifest[a.id]) {
      const img = card.locator("img");
      await expect(img).toHaveAttribute("alt", a.artAlt);
      await expect(img).toHaveAttribute("width", "768");
      await expect(img).toHaveAttribute("height", "1024");
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 10_000 }).toBe(768);
      await expect(card.locator('svg[aria-label="Placeholder silhouette"]')).toHaveCount(0);
    } else {
      await expect(card.locator("img")).toHaveCount(0);
      await expect(card.locator('svg[aria-label="Placeholder silhouette"]')).toHaveCount(1);
    }
  }
  await page.locator(`[data-archetype="${ARCHETYPES[0].id}"]`).scrollIntoViewIfNeeded();
}

const ART_CREDIT = "Art: original characters generated with Google Gemini";

/** Both credits are in the site footer. */
async function expectCredits(page: Page) {
  const footer = page.locator("footer");
  await expect(footer).toContainText("© Gym visual — https://gymvisual.com/");
  await expect(footer).toContainText(ART_CREDIT);
}

/** Landing strip: 3 WebP characters, only the first visible one eager, all loaded, sitting behind the pinned CTA. */
async function expectLandingArt(page: Page) {
  const imgs = page.locator("[data-landing-art] img");
  await expect(imgs).toHaveCount(3);
  const loading = await imgs.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).loading));
  expect(loading.filter((l) => l === "eager")).toHaveLength(1);
  expect(loading.filter((l) => l === "lazy")).toHaveLength(2);
  for (let i = 0; i < 3; i++) {
    await expect.poll(() => imgs.nth(i).evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth), { timeout: 10_000 }).toBe(768);
  }
  const strip = await page.locator("[data-landing-art]").boundingBox();
  const cta = await page.getByRole("link", { name: /Start your arc|Continue your arc/ }).boundingBox();
  expect(cta!.y, "CTA should overlap the character strip").toBeLessThan(strip!.y + strip!.height);
  expect(cta!.y, "characters' upper bodies stay visible above the CTA").toBeGreaterThan(strip!.y + 120);
}

async function continueTo(page: Page, nextTitle: string | RegExp) {
  await page.getByRole("button", { name: /^(Continue|Choose my arc)$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: nextTitle })).toBeVisible();
}

const onboardingShots: string[] = [];

test("the plan fixture is a valid /api/plan response built from real dataset IDs", () => {
  const parsed = PlanResponseSchema.parse(PLAN_FIXTURE);
  const slimPath = join(__dirname, "../../src/data/exercises.slim.json");
  expect(existsSync(slimPath), "run `npm run slim` first").toBe(true);
  const dataset = new Map((JSON.parse(readFileSync(slimPath, "utf8")) as { id: string; gif: string }[]).map((e) => [e.id, e]));
  for (const day of parsed.plan.days) {
    expect(day.exercises.length).toBeGreaterThanOrEqual(4);
    for (const { exerciseId } of day.exercises) {
      expect(dataset.has(exerciseId), `${exerciseId} not in dataset`).toBe(true);
      expect(parsed.exercises[exerciseId]?.gif).toBe(dataset.get(exerciseId)!.gif);
    }
  }
});

test("full flow at 375 px: onboarding → arc → reveal → plan → workout", async ({ page, context, browser, request }) => {
  const planRequests = await mockPlanApi(context, { delayMs: 2500 });
  const consoleErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // ---------- Landing ----------
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Pick the physique");
  await checkScreen(page);
  await expectLandingArt(page);
  await expectCredits(page);
  await shot(page, "landing");

  // ---------- Onboarding ----------
  await page.getByRole("link", { name: "Start your arc" }).click();
  await expect(page).toHaveURL(/\/onboarding\?step=1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Who's starting this arc?" })).toBeVisible();
  await page.getByRole("radio", { name: /Male/ }).first().click();
  await checkScreen(page);
  onboardingShots.push(await shot(page, "onboarding-01-sex"));
  await continueTo(page, "How old are you?");

  // Validation: under 18 is blocked with a clear message.
  await page.locator("#field-age").fill("16");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "18 and over" })).toBeVisible();
  await shot(page, "onboarding-02-age-under-18-error");
  await page.locator("#field-age").fill("24");
  await checkScreen(page);
  onboardingShots.push(await shot(page, "onboarding-02-age"));
  await continueTo(page, "How tall are you?");

  await page.locator("#field-heightCm").fill("178");
  onboardingShots.push(await shot(page, "onboarding-03-height"));
  await continueTo(page, "What do you weigh today?");

  await page.locator("#field-weightKg").fill("72");
  onboardingShots.push(await shot(page, "onboarding-04-weight"));
  await continueTo(page, "Where do you want to land?");

  await page.locator("#field-targetWeightKg").fill("78");
  await expect(page.getByText("+6 kg · Bulk")).toBeVisible();
  await checkScreen(page);
  onboardingShots.push(await shot(page, "onboarding-05-target"));
  await continueTo(page, "Your shape right now?");

  await page.getByRole("radio", { name: /Slim/ }).click();
  await checkScreen(page);
  onboardingShots.push(await shot(page, "onboarding-06-shape"));
  await continueTo(page, "Which sounds most like you?");

  await page.getByRole("radio", { name: /Naturally lean/ }).click();
  onboardingShots.push(await shot(page, "onboarding-07-build"));
  await continueTo(page, "How long have you trained?");

  await page.getByRole("radio", { name: /Beginner/ }).click();
  onboardingShots.push(await shot(page, "onboarding-08-level"));
  await continueTo(page, "Days per week you can train?");

  await page.getByRole("radio", { name: /^4/ }).click();
  await checkScreen(page);
  onboardingShots.push(await shot(page, "onboarding-09-days"));
  await continueTo(page, "Where will you train?");

  await page.getByRole("radio", { name: /Gym/ }).click();
  await expect(page.getByRole("button", { name: "Choose my arc" })).toBeVisible();
  onboardingShots.push(await shot(page, "onboarding-10-equipment"));

  await expect(page).toHaveURL(/\/onboarding\?step=10$/);

  // In-app back pops history and keeps answers.
  await page.getByRole("button", { name: "Previous question" }).click();
  await expect(page).toHaveURL(/\?step=9$/);
  await expect(page.getByRole("radio", { name: /^4/ })).toHaveAttribute("aria-checked", "true");

  // Browser back goes to the previous question (not out of onboarding), answers intact.
  await page.goBack();
  await expect(page).toHaveURL(/\?step=8$/);
  await expect(page.getByRole("heading", { level: 1, name: "How long have you trained?" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Beginner/ })).toHaveAttribute("aria-checked", "true");
  await page.goBack();
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\?step=5$/);
  await expect(page.locator("#field-targetWeightKg")).toHaveValue("78");
  await shot(page, "onboarding-browser-back-to-step-5");

  // Browser forward works too.
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1, name: "Your shape right now?" })).toBeVisible();

  // Reload keeps the step and restores answers from ta.profile.v1.
  await page.reload();
  await expect(page).toHaveURL(/\?step=6$/);
  await expect(page.getByRole("radio", { name: /Slim/ })).toHaveAttribute("aria-checked", "true");

  // Walk forward again to the end.
  await continueTo(page, "Which sounds most like you?");
  await continueTo(page, "How long have you trained?");
  await continueTo(page, "Days per week you can train?");
  await continueTo(page, "Where will you train?");
  await continueTo(page, "Pick your arc");

  // ---------- Arc picker ----------
  await expect(page).toHaveURL(/\/arc$/);
  await expect(page.getByRole("button", { name: "Tap an archetype" })).toBeDisabled();
  await checkScreen(page);
  await expectArcFitsAboveCta(page);
  await expectArchetypeArt(page);
  await shot(page, "arc-picker");
  await page.getByRole("radio", { name: /The Titan/ }).scrollIntoViewIfNeeded();
  await shot(page, "arc-picker-swiped");
  const warrior = page.getByRole("radio", { name: /The Warrior/ });
  await warrior.scrollIntoViewIfNeeded();
  await warrior.click();
  await expect(warrior).toHaveAttribute("aria-checked", "true");
  await expectArcFitsAboveCta(page);
  await shot(page, "arc-picker-selected");
  await page.locator('[data-archetype="vanguard"]').scrollIntoViewIfNeeded();
  await shot(page, "arc-picker-vanguard");
  await page.getByRole("button", { name: /This is my goal/ }).click();

  // ---------- Reveal ----------
  await expect(page).toHaveURL(/\/reveal$/);
  await expect(page.getByRole("heading", { level: 1, name: "The Warrior" })).toBeVisible();
  await page.waitForTimeout(1300); // count-up finishes
  await expect(page.getByLabel("Daily calorie target")).toContainText("2,928");
  await shot(page, "reveal-building-plan");
  const seePlan = page.getByRole("button", { name: "See my training plan" });
  await expect(seePlan).toBeEnabled({ timeout: 40_000 });
  // The app sent exactly the profile (no extra fields) to /api/plan, once.
  expect(planRequests).toHaveLength(1);
  expect(ProfileSchema.parse(planRequests[0])).toEqual({
    sex: "male", age: 24, heightCm: 178, weightKg: 72, targetWeightKg: 78, bodyShape: "slim",
    bodyType: "ectomorph", experience: "beginner", daysPerWeek: 4, equipment: "gym", archetype: "warrior",
  });
  await expect(page.getByText("Not medical advice")).toBeVisible();
  await checkScreen(page);
  await shot(page, "reveal", true);
  await seePlan.click();

  // ---------- Week plan ----------
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("heading", { level: 1, name: /Warrior Arc/ })).toBeVisible();
  const dayLinks = page.locator('a[href^="/plan/"]');
  const dayCount = await dayLinks.count();
  expect(dayCount).toBe(4);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ta.plan.v1") || "null"));
  expect(stored.plan).toEqual(PLAN_FIXTURE.plan);
  await expectCredits(page);
  await checkScreen(page);
  await shot(page, "plan-week", true);

  // ---------- Workout day ----------
  await dayLinks.first().click();
  await expect(page).toHaveURL(/\/plan\/1$/);
  await expect(page.getByText("Day 1 of 4")).toBeVisible();
  const firstImg = page.locator("article img").first();
  await expect(firstImg).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>("article img");
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await expect(page.getByText("© Gym visual —").first()).toBeVisible();
  await expectCredits(page);
  await checkScreen(page);
  await shot(page, "workout-day");

  // Tick two sets on the first exercise.
  const firstCard = page.locator("article").first();
  await firstCard.getByRole("button", { name: /^Set 1 of/ }).click();
  await firstCard.getByRole("button", { name: /^Set 2 of/ }).click();
  await expect(firstCard.getByRole("button", { pressed: true })).toHaveCount(2);
  await firstCard.getByRole("group", { name: / sets$/ }).scrollIntoViewIfNeeded();
  await shot(page, "workout-day-sets-ticked");
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "workout-day-full", true);

  // ---------- Every GIF in every day loads (no 404s) ----------
  const gifStatus: { day: number; src: string; status: number; type: string }[] = [];
  for (let d = 1; d <= dayCount; d++) {
    await page.goto(`/plan/${d}`);
    await expect(page.getByText(`Day ${d} of ${dayCount}`)).toBeVisible();
    const imgs = page.locator("article img");
    const n = await imgs.count();
    expect(n).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < n; i++) {
      const img = imgs.nth(i);
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 20_000 })
        .toBe(true);
      const box = await img.boundingBox();
      expect(box!.width).toBeLessThanOrEqual(180);
      const src = (await img.getAttribute("src"))!;
      const res = await request.get(src);
      gifStatus.push({ day: d, src, status: res.status(), type: res.headers()["content-type"] ?? "" });
    }
  }
  const bad = gifStatus.filter((g) => g.status !== 200 || !g.type.includes("gif"));
  console.log(`GIFs checked: ${gifStatus.length}, failures: ${bad.length}`);
  expect(bad).toEqual([]);

  // ---------- Persistence: reload ----------
  await page.goto("/plan/1");
  await page.reload();
  await expect(page.locator("article").first().getByRole("button", { pressed: true })).toHaveCount(2);

  // ---------- Persistence: close the browser, reopen ----------
  const state = await page.context().storageState();
  const reopened = await browser.newContext({ storageState: state, viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mockPlanApi(reopened);
  const page2 = await reopened.newPage();
  await page2.goto("/plan");
  await expect(page2.getByRole("heading", { level: 1, name: /Warrior Arc/ })).toBeVisible();
  await expect(page2.locator('a[href="/plan/1"]')).toContainText("2/");
  await shot(page2, "plan-week-after-reopen-with-progress");
  await page2.goto("/");
  await expect(page2.getByRole("link", { name: "Continue your arc" })).toBeVisible();
  await reopened.close();

  expect(consoleErrors, "console errors").toEqual([]);

  // ---------- Onboarding contact sheet ----------
  const imgs = onboardingShots.map((f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`);
  const sheet = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
  await sheet.setContent(`<body style="margin:0;background:#000;padding:16px;display:grid;grid-template-columns:repeat(5,1fr);gap:12px">
    ${imgs.map((src, i) => `<figure style="margin:0"><img src="${src}" style="width:100%;border-radius:12px;display:block"><figcaption style="color:#999;font:12px sans-serif;text-align:center;margin-top:4px">Step ${i + 1}</figcaption></figure>`).join("")}
  </body>`);
  await sheet.screenshot({ path: join(SHOTS, "00-onboarding-contact-sheet.png"), fullPage: true });
  await sheet.close();
});

test("missing or corrupt storage sends the user to onboarding without crashing", async ({ page, context }) => {
  await mockPlanApi(context);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("ta.plan.v1", "{not json");
    localStorage.setItem("ta.profile.v1", JSON.stringify({ sex: "robot" }));
  });
  for (const path of ["/plan", "/plan/1", "/reveal", "/arc"]) {
    await page.goto(path);
    await expect(page).toHaveURL(ONBOARDING_URL);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  // Corrupt draft is ignored: onboarding starts fresh at step 1.
  await expect(page.getByRole("heading", { level: 1, name: "Who's starting this arc?" })).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.goto("/plan/3");
  await expect(page).toHaveURL(/\/onboarding\?step=1$/);

  // Deep-linking past unanswered questions is clamped to the first unanswered one.
  await page.evaluate(() => localStorage.setItem("ta.profile.v1", JSON.stringify({ sex: "female", age: 30 })));
  await page.goto("/onboarding?step=9");
  await expect(page).toHaveURL(/\/onboarding\?step=3$/);
  await expect(page.getByRole("heading", { level: 1, name: "How tall are you?" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("archetype art that fails to load falls back to the silhouette", async ({ page, context }) => {
  await mockPlanApi(context);
  const withArt = Object.keys(ART_MANIFEST)[0];
  test.skip(!withArt, "no converted art yet");
  await page.route(`**/archetypes/${withArt}.webp*`, (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "ta.profile.v1",
      JSON.stringify({ sex: "male", age: 24, heightCm: 178, weightKg: 72, targetWeightKg: 78, bodyShape: "slim", bodyType: "ectomorph", experience: "beginner", daysPerWeek: 4, equipment: "gym" }),
    ),
  );
  await page.goto("/arc");
  const card = page.locator(`[data-archetype="${withArt}"]`);
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('svg[aria-label="Placeholder silhouette"]')).toHaveCount(1);
  await expect(card.locator("img")).toHaveCount(0);
});

test("network failure on /reveal shows a retry, never an endless spinner", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "ta.profile.v1",
      JSON.stringify({ sex: "female", age: 29, heightCm: 165, weightKg: 70, targetWeightKg: 62, bodyShape: "average", bodyType: "endomorph", experience: "intermediate", daysPerWeek: 3, equipment: "home", archetype: "ninja" }),
    ),
  );
  await page.route("**/api/plan", (route) => route.abort("internetdisconnected"));
  await page.goto("/reveal");
  const retry = page.getByRole("button", { name: "Retry" });
  await expect(retry).toBeVisible();
  await expect(page.getByRole("button", { name: "See my training plan" })).toBeDisabled();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(SHOTS, "90-reveal-network-error.png") });

  await page.unroute("**/api/plan");
  await mockPlanApi(context);
  await retry.click();
  await expect(page.getByRole("button", { name: "See my training plan" })).toBeEnabled({ timeout: 40_000 });
});
