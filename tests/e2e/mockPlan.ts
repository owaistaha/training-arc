import type { BrowserContext } from "@playwright/test";
import fixture from "../fixtures/plan-warrior-4d.json";

export { fixture as PLAN_FIXTURE };

/**
 * Serves the fixed plan fixture for every POST /api/plan in this context, so
 * e2e runs never call Gemini. Returns the list of request bodies the app sent.
 * `delayMs` keeps the "Building your plan…" state visible long enough to test.
 */
export async function mockPlanApi(context: BrowserContext, { delayMs = 0 } = {}) {
  const requests: unknown[] = [];
  await context.route("**/api/plan", async (route) => {
    requests.push(route.request().postDataJSON());
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(fixture),
    });
  });
  return requests;
}
