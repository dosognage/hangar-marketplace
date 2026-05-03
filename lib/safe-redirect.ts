/**
 * Safe-redirect helper.
 *
 * Used to sanitise the `next` query parameter on login/signup so an
 * attacker can't craft a phishing link like:
 *
 *   https://hangarmarketplace.com/login?next=https://evil.com/fake-session-expired
 *
 * The victim logs into the real site, then `redirect(next)` bounces
 * them to evil.com — perfect environment for a "session expired,
 * please log in again" credential reharvest.
 *
 * Rules: a safe `next` must
 *   1. Be a non-empty string.
 *   2. Start with a single forward slash `/`.
 *   3. Not start with `//` (protocol-relative — browsers expand this
 *      to `https://anything-after`).
 *   4. Not start with `/\` (the browser can normalise `\` → `/` so
 *      `/\evil.com` becomes `//evil.com`).
 *   5. Not contain `\` anywhere (defence in depth against odd parsers).
 *   6. Not contain `://` (defence in depth — there's no legitimate
 *      reason an internal path would).
 *
 * If any rule fails we fall back to the supplied default (defaults to
 * the site root). Returning a guaranteed-internal path means callers
 * can pass the result straight into `redirect()` or a `<Link>` href
 * without further checks.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = '/',
): string {
  if (!next || typeof next !== 'string') return fallback

  // Strip surrounding whitespace — accidental whitespace shouldn't
  // either succeed or fail surprisingly.
  const candidate = next.trim()
  if (!candidate) return fallback

  // Must be a path, not an absolute URL.
  if (!candidate.startsWith('/')) return fallback

  // Reject protocol-relative URLs (//evil.com).
  if (candidate.startsWith('//')) return fallback

  // Reject backslash bypasses (/\evil.com, /foo\\bar).
  if (candidate.startsWith('/\\') || candidate.includes('\\')) return fallback

  // Defence in depth: reject anything that looks like a scheme.
  if (candidate.includes('://')) return fallback

  return candidate
}
