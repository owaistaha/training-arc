import { buildPlan } from "@/lib/buildPlan";
import { ProfileSchema } from "@/lib/planSchema";

// 15 s AI budget + template fallback must fit comfortably inside the function limit.
export const maxDuration = 30;

const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// Best-effort, per-instance only (serverless instances don't share memory).
const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** Returns true if this IP has used up its AI plans for the window; records the hit otherwise. */
function overLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "Request body too large." }, 413);

  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json({ error: "Request body too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Body must be valid JSON." }, 400);
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "Invalid profile.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      400,
    );
  }

  // Over the per-IP limit: skip Gemini and serve the template plan, rather than an error screen.
  const limited = overLimit(clientIp(req));
  const { response } = await buildPlan(parsed.data, limited ? { skipAiReason: "rate_limited_local" } : {});
  return json(response);
}
