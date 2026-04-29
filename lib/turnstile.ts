/**
 * Cloudflare Turnstile — server-side token verification.
 *
 * Each protected form embeds a <Turnstile/> widget. When the user passes the
 * challenge (usually invisibly), Cloudflare auto-injects a `cf-turnstile-response`
 * field into the form. The server action then calls verifyTurnstileToken() with
 * that field's value before doing any real work.
 *
 * Behaviour by environment:
 *   - In production: missing or invalid tokens are rejected.
 *   - In dev/test:   if TURNSTILE_SECRET_KEY is unset, this is a no-op so
 *                    local development doesn't require a Cloudflare account.
 *
 * Cloudflare endpoint docs:
 *   https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileVerifyResult = { ok: true } | { ok: false; error: string }

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  // Dev escape hatch: no secret configured locally → don't block development.
  // In production we treat a missing secret as a misconfiguration (fail closed).
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[turnstile] TURNSTILE_SECRET_KEY is not set in production')
      return { ok: false, error: 'Captcha is not configured. Please try again later.' }
    }
    return { ok: true }
  }

  if (!token) {
    return { ok: false, error: 'Please complete the captcha and try again.' }
  }

  const body = new FormData()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] }
    if (data.success) return { ok: true }
    console.warn('[turnstile] verification failed:', data['error-codes'])
    return { ok: false, error: 'Captcha verification failed. Please try again.' }
  } catch (err) {
    console.error('[turnstile] siteverify fetch failed:', err)
    // Fail closed — if Cloudflare is unreachable we'd rather block than
    // silently let abuse through. Real users see a transient error and retry.
    return { ok: false, error: 'Captcha service is temporarily unavailable.' }
  }
}
