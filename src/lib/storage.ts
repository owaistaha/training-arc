// localStorage access. Every read and write is wrapped in try/catch: private
// mode, quota errors and corrupt JSON must never crash the app. Callers treat
// `null` as "missing or corrupt" and send the user back to /onboarding.
import type { ZodType } from "zod";

export const KEYS = {
  profile: "ta.profile.v1",
  plan: "ta.plan.v1",
  log: "ta.log.v1",
} as const;
export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

const CHANGE_EVENT = "ta:storage";

export function readRaw(key: StorageKey): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parseStored<T>(raw: string | null | undefined, schema: ZodType<T>): T | null {
  if (!raw) return null;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: StorageKey, schema: ZodType<T>): T | null {
  return parseStored(readRaw(key), schema);
}

export function writeJSON(key: StorageKey, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function removeKeys(...keys: StorageKey[]): void {
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

/** For useSyncExternalStore: fires on writes in this tab and in other tabs. */
export function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
