import { NextResponse } from "next/server";

/**
 * Lightweight in-memory fixed-window rate limiter for abuse-prone endpoints
 * (auth, anonymous survey, paid AI calls), security-review skill §7.
 *
 * NOTE: in-memory state is per-process. On serverless (Vercel) each instance
 * has its own buckets, so this is a meaningful guard for a single instance /
 * dev but NOT a global limit in production, back it with a shared store
 * (Upstash/Vercel KV) before relying on it at scale. // TODO: shared store.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow unbounded across many IPs.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client identifier from proxy headers. */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

export function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: "rate_limited",
      message: "Too many requests. Please try again shortly.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Check a limit for a request scope; returns a 429 Response if exceeded. */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { ok, retryAfter } = rateLimit(
    `${scope}:${clientKey(request)}`,
    limit,
    windowMs
  );
  return ok ? null : tooManyRequests(retryAfter);
}
