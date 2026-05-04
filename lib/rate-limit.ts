/**
 * In-memory per-IP rate limiter.
 *
 * Use this on any unauthenticated POST endpoint that can be abused at
 * scale: contact forms, signup attempts, password resets, bug reports,
 * unsubscribe requests, etc. Without it, one botnet can:
 *   - drain your Resend monthly send quota
 *   - flood admin inboxes with junk
 *   - DoS your function by exhausting concurrent execution slots
 *
 * Why in-memory and not Redis/Upstash?
 *   - Zero new dependencies, zero new env vars, zero new failure modes.
 *   - Each Vercel function instance keeps its own bucket — meaning a
 *     determined attacker can spread requests across cold-start instances
 *     to bypass it, but they still get blocked once an instance warms up.
 *   - Genuine scale (M2 in the audit) wants a durable shared store. This
 *     helper is the floor; it's deliberately simple and intentionally
 *     a stop-gap until M2 is addressed with proper infra.
 *
 * Sliding-window-on-a-single-event design: we just remember the last hit
 * time per key. If the next hit comes within `windowMs`, deny. Cheap
 * O(1) per request and covers the realistic abuse pattern (machine-gun
 * floods, not deliberate spacing).
 *
 * Cleanup: every Nth call we sweep stale entries so the Map can't grow
 * unbounded if an attacker rotates IPs.
 */

import type { NextRequest } from 'next/server'

/** Best-effort client IP extraction. Falls back to 'unknown' so that all
 *  requests without an IP header land in the same bucket — better than
 *  treating each as unique and bypassing the limit entirely. */
export function parseIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  )
}

type Bucket = Map<string, number>
const buckets = new Map<string, Bucket>()

/**
 * Reserve a per-bucket Map. Each endpoint passes a unique `bucketName`
 * so e.g. contact-form abuse doesn't share state with bug-report abuse.
 */
function getBucket(bucketName: string): Bucket {
  let b = buckets.get(bucketName)
  if (!b) {
    b = new Map()
    buckets.set(bucketName, b)
  }
  return b
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number }

/**
 * Check + record a rate-limit hit for the given key (typically IP).
 *
 * Returns `{ ok: true }` on first hit or after `windowMs` since the last hit.
 * Returns `{ ok: false, retryAfterMs }` while still inside the window.
 *
 *   const ip = parseIp(req)
 *   const result = checkAndRecord('contact', ip, 60_000)
 *   if (!result.ok) {
 *     return NextResponse.json(
 *       { error: 'Please wait a moment before sending another message.' },
 *       { status: 429, headers: { 'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)) } },
 *     )
 *   }
 */
export function checkAndRecord(
  bucketName: string,
  key: string,
  windowMs: number,
): RateLimitResult {
  const bucket = getBucket(bucketName)
  const now = Date.now()
  const last = bucket.get(key) ?? 0
  const elapsed = now - last

  if (last && elapsed < windowMs) {
    return { ok: false, retryAfterMs: windowMs - elapsed }
  }

  bucket.set(key, now)

  // Opportunistic cleanup so the Map can't grow unbounded if attackers
  // cycle IPs. Every ~500 entries we sweep anything older than 10x the
  // window. Cheap to amortise.
  if (bucket.size > 500) {
    const cutoff = now - windowMs * 10
    for (const [k, ts] of bucket) {
      if (ts < cutoff) bucket.delete(k)
    }
  }

  return { ok: true }
}
