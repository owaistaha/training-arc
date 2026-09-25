"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ZodType } from "zod";
import { parseStored, readRaw, subscribe, type StorageKey } from "./storage";

const serverSnapshot = () => undefined;

/**
 * Reads + validates a localStorage key. `ready` is false during SSR/hydration
 * (so we never redirect before we've actually looked), then `value` is the
 * parsed data or null if missing/corrupt.
 */
export function useStored<T>(key: StorageKey, schema: ZodType<T>): { ready: boolean; value: T | null } {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => readRaw(key), serverSnapshot);
  const value = useMemo(() => (raw === undefined ? null : parseStored(raw, schema)), [raw, schema]);
  return { ready: raw !== undefined, value };
}

/** Client-side redirect once we know the required state isn't there. */
export function useRedirect(when: boolean, to: string) {
  const router = useRouter();
  useEffect(() => {
    if (when) router.replace(to);
  }, [when, to, router]);
}
