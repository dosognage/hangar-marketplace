/**
 * Login alerts.
 *
 * On each successful sign-in, we hash a brief device fingerprint and check
 * whether the (user_id, ua_hash) combination has been seen before. If not,
 * we email the user a "new sign-in detected" alert. Either way, we record
 * the event in `user_login_events` for incident response.
 *
 * Why brief UA + hash instead of raw UA?
 *   - The full UA string changes on every minor browser version (e.g.
 *     "Chrome/127.0.0.0" → "Chrome/128.0.0.0"). Hashing that means every
 *     auto-update triggers an alert. Real users would learn to ignore them.
 *   - We extract just "browser family + platform" (e.g. "Chrome / macOS").
 *     Major updates (switching to a different browser, switching device,
 *     mobile vs desktop) still trigger alerts. Auto-updates don't.
 *
 * No location lookup yet — IP-to-city services are a per-request external
 * dependency. We log the raw IP for now and can backfill location later.
 */

import { createHash } from 'crypto'
import { supabaseAdmin } from './supabase-admin'
import { sendEmail, loginAlertEmail } from './email'

/** Pull a coarse "browser / platform" label out of a User-Agent header. */
export function briefUserAgent(rawUa: string | null | undefined): string {
  const ua = (rawUa ?? '').slice(0, 500) // hard cap to avoid pathological inputs
  if (!ua) return 'Unknown device'

  // Order matters: detect specific apps before generic engines.
  const browser =
    /OPR\//.test(ua) ? 'Opera'
    : /Edg\//.test(ua) ? 'Edge'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'

  const platform =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : 'unknown OS'

  return `${browser} on ${platform}`
}

function hash(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

export type RecordLoginInput = {
  userId: string
  email: string
  name?: string | null
  ip?: string | null
  userAgent?: string | null
}

/**
 * Records a sign-in event and sends the user a new-device alert email if
 * this is the first time we've seen this device for them.
 *
 * Designed to be fired-and-forgotten — failures are logged but never thrown,
 * because we don't want a flaky email service to block legitimate logins.
 */
export async function recordAndAlertLogin(input: RecordLoginInput): Promise<void> {
  const { userId, email, name, ip, userAgent } = input
  const brief = briefUserAgent(userAgent)
  const uaHash = hash(brief)

  let isKnownDevice = false
  try {
    const { data: prior } = await supabaseAdmin
      .from('user_login_events')
      .select('id')
      .eq('user_id', userId)
      .eq('user_agent_hash', uaHash)
      .limit(1)
      .maybeSingle()
    isKnownDevice = !!prior
  } catch (err) {
    // If the lookup fails we err on the side of NOT alerting — better than
    // spamming a user every login because the DB had a hiccup.
    console.error('[loginAlerts] lookup failed:', err)
    isKnownDevice = true
  }

  // Insert the event row. Best-effort; never block the login flow.
  try {
    await supabaseAdmin.from('user_login_events').insert([{
      user_id:          userId,
      email,
      ip:               ip ?? null,
      user_agent_hash:  uaHash,
      user_agent_brief: brief,
      alerted:          !isKnownDevice,
    }])
  } catch (err) {
    console.error('[loginAlerts] insert failed:', err)
  }

  // Fire alert only on new devices. Throttle: we never alert more than once
  // per (user, ua_hash) because that combo is now in the table.
  if (!isKnownDevice) {
    try {
      const { subject, html } = loginAlertEmail({
        name:        name ?? '',
        device:      brief,
        ip:          ip ?? 'unknown',
        occurredAt:  new Date(),
      })
      await sendEmail({ to: email, subject, html })
    } catch (err) {
      console.error('[loginAlerts] email failed:', err)
    }
  }
}
