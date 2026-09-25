"use client";

import { profileKey, PlanResponseSchema, type Profile, type StoredPlan } from "./planSchema";
import { KEYS, writeJSON } from "./storage";

const CLIENT_TIMEOUT_MS = 30_000; // server gives up on AI at 15 s and returns a template

export class PlanRequestError extends Error {}

/**
 * Asks /api/plan for a plan and saves it. The server always answers a valid
 * profile with a plan (AI or template), so failures here mean network trouble
 * or a bad profile — the caller shows a retry button, never an endless spinner.
 */
export async function requestPlan(profile: Profile): Promise<StoredPlan> {
  let res: Response;
  try {
    res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch {
    throw new PlanRequestError("Couldn't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    throw new PlanRequestError(
      res.status === 400
        ? "Some of your answers look off. Restart onboarding to fix them."
        : "Something went wrong building your plan. Try again.",
    );
  }
  const parsed = PlanResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new PlanRequestError("The plan came back garbled. Try again.");

  const stored: StoredPlan = { ...parsed.data, createdAt: new Date().toISOString(), profileKey: profileKey(profile) };
  writeJSON(KEYS.plan, stored);
  return stored;
}

/** Local calendar date (not UTC), e.g. "2026-09-25". */
export function todayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
