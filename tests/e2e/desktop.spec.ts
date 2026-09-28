/* Desktop layout (≥ 1024 px). Phones keep the 375 px layout covered by flow.spec.ts. /api/plan is mocked. */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import ART_MANIFEST from "../../src/data/archetype-art.json";
import ARCHETYPES from "../../src/data/archetypes.json";
import { mockPlanApi } from "./mockPlan";

const SHOTS = join(__dirname, "..", "screenshots");
mkdirSync(SHOTS, { recursive: true }); // emptied once per run by tests/global-setup.ts

const DRAFT = {
  sex: "male", age: 24, heightCm: 178, weightKg: 72, targetWeightKg: 78,
  bodyShape: "slim", bodyType: "ectomorph", experience: "beginner", daysPerWeek: 4, equipment: "gym",
};

let shotNo = 0;
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(SHOTS, `d${String(++shotNo).padStart(2, "0")}-${name}.png`), fullPage });
}

async function box(l: Locator) {
  const b = await l.boundingBox();
  expect(b, "element has no box (hidden?)").not.toBeNull();
  return b!;
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "page scrolls horizontally").toBeLessThanOrEqual(clientWidth);
}

async function expectTapTargets(page: Page) {
  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("button, [role=radio], a, summary"))
      .filter((el) => !el.closest("figcaption, footer") && el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((r) => r.w > 0 && (r.w < 44 || r.h < 44)),
  );
  expect(offenders, "targets under 44 px").toEqual([]);
}

const footerPosition = (page: Page) =>
  page.locator("[data-pinned-footer]").evaluate((el) => getComputedStyle(el).position);

const loaded = (img: Locator) => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth);

test.describe("desktop 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });

  test("landing, onboarding, arc, reveal, plan and workout use the desktop layouts", async ({ page, context }) => {
    await mockPlanApi(context, { delayMs: 800 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    // ---------- Landing: text + CTA on the left, 6-character roster on the right ----------
    await page.goto("/");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("Pick the physique");
    const cta = page.getByRole("link", { name: "Start your arc" });
    expect(await footerPosition(page), "CTA is inline, not pinned").toBe("static");
    const stats = await box(page.getByText("sign-ups").locator("xpath=ancestor::ul"));
    const ctaBox = await box(cta);
    expect(ctaBox.y, "CTA sits under the stats").toBeGreaterThan(stats.y + stats.height);
    expect(ctaBox.y - (stats.y + stats.height), "CTA follows the stats closely").toBeLessThan(120);
    expect(ctaBox.y + ctaBox.height, "CTA visible without scrolling").toBeLessThanOrEqual(900);

    await expect(page.locator("[data-landing-art]"), "phone strip is hidden").toBeHidden();
    const roster = page.locator("[data-landing-roster] img");
    await expect(roster).toHaveCount(Object.keys(ART_MANIFEST).length);
    const loading = await roster.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).loading));
    expect(loading.filter((l) => l === "eager"), "only the first roster image is eager").toHaveLength(1);
    expect(loading[0]).toBe("eager");
    for (let i = 0; i < (await roster.count()); i++) await expect.poll(() => loaded(roster.nth(i)), { timeout: 10_000 }).toBe(768);
    const rosterBox = await box(page.locator("[data-landing-roster]"));
    expect(rosterBox.x, "roster is to the right of the CTA").toBeGreaterThan(ctaBox.x + ctaBox.width);
    expect(rosterBox.y + rosterBox.height, "roster fits the first screen").toBeLessThanOrEqual(900);
    await expect(page.locator("footer")).toContainText("Art: original characters generated with Google Gemini");
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await shot(page, "desktop-landing");

    // ---------- Onboarding: the CTA sits right under the answers ----------
    await cta.click();
    await expect(page).toHaveURL(/\/onboarding\?step=1$/);
    await page.getByRole("radio", { name: /Female/ }).click();
    const lastOption = await box(page.getByRole("radio", { name: /Female/ }));
    const next = page.getByRole("button", { name: "Continue" });
    expect(await footerPosition(page)).toBe("static");
    const nextBox = await box(next);
    const gap = nextBox.y - (lastOption.y + lastOption.height);
    expect(gap, "CTA directly under the answers").toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(64);
    expect(nextBox.width, "CTA matches the question column").toBeLessThanOrEqual(448);
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await shot(page, "desktop-onboarding-01");
    await next.click();
    await expect(page.getByRole("heading", { level: 1, name: "How old are you?" })).toBeVisible();
    await page.locator("#field-age").fill("16");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "18 and over" })).toBeVisible();
    await shot(page, "desktop-onboarding-02-error");

    // ---------- Arc picker: 3-column grid + bottom bar ----------
    await page.evaluate((d) => localStorage.setItem("ta.profile.v1", JSON.stringify(d)), DRAFT);
    await page.goto("/arc");
    const cards = page.locator("[data-archetype]");
    await expect(cards).toHaveCount(6);
    const c = await Promise.all([0, 1, 2, 3].map((i) => box(cards.nth(i))));
    expect(Math.abs(c[0].y - c[1].y), "cards 1–3 share a row").toBeLessThanOrEqual(1);
    expect(Math.abs(c[0].y - c[2].y)).toBeLessThanOrEqual(1);
    expect(c[3].y, "card 4 starts the second row").toBeGreaterThan(c[0].y + c[0].height);
    expect(c[1].x).toBeGreaterThan(c[0].x + c[0].width);
    for (const b of c) expect(b.width).toBeLessThanOrEqual(300);
    await expect(page.locator("[data-arc-dots]")).toBeHidden();
    expect(await footerPosition(page), "desktop CTA is a fixed bottom bar").toBe("fixed");
    for (const a of ARCHETYPES) {
      const img = page.locator(`[data-archetype="${a.id}"] img`);
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute("alt", a.artAlt);
      await expect.poll(() => loaded(img), { timeout: 10_000 }).toBe(768);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("radio", { name: /The Warrior/ }).click();
    const goal = page.getByRole("button", { name: /This is my goal · Warrior/ });
    await expect(goal).toBeEnabled();
    const goalBox = await box(goal);
    const credit = await box(page.locator("[data-pinned-footer] footer"));
    expect(goalBox.x, "CTA on the right, credit on the left").toBeGreaterThan(credit.x + credit.width);
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await shot(page, "desktop-arc-picker");
    // The last row can scroll clear of the bottom bar.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const lastCard = await box(cards.nth(5));
    const bar = await box(page.locator("[data-pinned-footer]"));
    expect(lastCard.y + lastCard.height, "last card clears the bottom bar").toBeLessThanOrEqual(bar.y);
    await shot(page, "desktop-arc-picker-row-2");
    await goal.click();

    // ---------- Reveal: art beside the numbers, CTA inline ----------
    await expect(page).toHaveURL(/\/reveal$/);
    const revealH1 = page.getByRole("heading", { level: 1, name: "The Warrior" });
    await expect(revealH1).toBeVisible();
    const warrior = ARCHETYPES.find((a) => a.id === "warrior")!;
    const art = page.getByRole("img", { name: warrior.artAlt });
    await expect.poll(() => loaded(art), { timeout: 10_000 }).toBe(768);
    const artBox = await box(art);
    const revealH1Box = await box(revealH1);
    expect(artBox.x + artBox.width, "art is left of the numbers").toBeLessThan(revealH1Box.x);
    expect(await footerPosition(page)).toBe("static");
    const seePlan = page.getByRole("button", { name: "See my training plan" });
    await expect(seePlan).toBeEnabled({ timeout: 20_000 });
    const seePlanBox = await box(seePlan);
    expect(seePlanBox.y + seePlanBox.height, "CTA visible without scrolling").toBeLessThanOrEqual(900);
    await expect(page.getByText("Not medical advice")).toBeVisible();
    await page.waitForTimeout(1300); // count-up
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await shot(page, "desktop-reveal");
    await seePlan.click();

    // ---------- Week plan: side panel + days in two columns ----------
    await expect(page).toHaveURL(/\/plan$/);
    const planH1 = page.getByRole("heading", { level: 1, name: /Warrior Arc/ });
    await expect(planH1).toBeVisible();
    const days = page.locator('a[href^="/plan/"]');
    await expect(days).toHaveCount(4);
    const d = await Promise.all([0, 1, 2].map((i) => box(days.nth(i))));
    expect(Math.abs(d[0].y - d[1].y), "days 1–2 share a row").toBeLessThanOrEqual(1);
    expect(d[2].y).toBeGreaterThan(d[0].y + d[0].height - 1);
    const planH1Box = await box(planH1);
    expect(d[0].x, "days are right of the side panel").toBeGreaterThan(planH1Box.x + 300);
    const regen = await box(page.getByRole("button", { name: "Regenerate plan" }));
    expect(regen.x + regen.width, "actions sit in the side panel").toBeLessThan(d[0].x);
    expect(regen.y + regen.height, "actions visible without scrolling").toBeLessThanOrEqual(900);
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await shot(page, "desktop-plan-week");

    // ---------- Workout day: cards in two columns, GIF beside the steps ----------
    await days.first().click();
    await expect(page).toHaveURL(/\/plan\/1$/);
    const articles = page.locator("article");
    const a0 = await box(articles.nth(0));
    const a1 = await box(articles.nth(1));
    expect(Math.abs(a0.y - a1.y), "exercise cards 1–2 share a row").toBeLessThanOrEqual(1);
    expect(a1.x).toBeGreaterThan(a0.x + a0.width);
    const gif = articles.first().locator("img");
    await expect.poll(() => gif.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 20_000 }).toBe(true);
    const gifBox = await box(gif);
    expect(gifBox.width).toBeLessThanOrEqual(180);
    const how = articles.first().getByRole("heading", { name: "How to do it" });
    const howBox = await box(how);
    expect(howBox.x, "steps are beside the GIF").toBeGreaterThanOrEqual(gifBox.x + gifBox.width);
    expect(Math.abs(howBox.y - gifBox.y), "steps start level with the GIF").toBeLessThan(40);
    await expect(articles.first().locator("summary"), "collapsible steps are phone-only").toBeHidden();
    await expect(articles.first().getByText("© Gym visual —")).toBeVisible();
    await articles.first().getByRole("button", { name: /^Set 1 of/ }).click();
    await expect(articles.first().getByRole("button", { pressed: true })).toHaveCount(1);
    await expectNoHorizontalScroll(page);
    await expectTapTargets(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "desktop-workout-day");
    await shot(page, "desktop-workout-day-full", true);

    expect(errors, "console errors").toEqual([]);
  });
});

test.describe("tablet 768×1024", () => {
  test.use({ viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: true, deviceScaleFactor: 1 });

  test("below 1024 px the phone layout is used, with no horizontal scroll", async ({ page, context }) => {
    await mockPlanApi(context);
    await page.goto("/");
    await expect(page.locator("[data-landing-art]")).toBeVisible();
    await expect(page.locator("[data-landing-roster]")).toBeHidden();
    expect(await footerPosition(page)).toBe("fixed");
    await expectNoHorizontalScroll(page);
    await shot(page, "tablet-landing");

    await page.evaluate((d) => localStorage.setItem("ta.profile.v1", JSON.stringify(d)), DRAFT);
    await page.goto("/arc");
    await expect(page.locator("[data-arc-dots]")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "tablet-arc-picker");

    await page.getByRole("radio", { name: /The Warrior/ }).click();
    await page.getByRole("button", { name: /This is my goal/ }).click();
    await expect(page.getByRole("button", { name: "See my training plan" })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole("button", { name: "See my training plan" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Warrior Arc/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto("/plan/1");
    await expect(page.getByText("Day 1 of 4")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await shot(page, "tablet-workout-day");
  });
});
