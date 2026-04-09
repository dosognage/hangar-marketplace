import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Monthly newsletter cron
 *
 * Triggered automatically on the 1st of every month at 10:00 AM UTC
 * by Vercel Cron (see vercel.json).
 *
 * Security: Vercel passes the CRON_SECRET as a Bearer token.
 * Set CRON_SECRET in your Vercel environment variables — any long
 * random string works (e.g. openssl rand -hex 32).
 *
 * To write the email content, update the buildEmailHtml() function below.
 */

const RESEND_API = 'https://api.resend.com/emails'

// Use service-role key so we can query without RLS restrictions
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // ── Auth: verify this is called by Vercel Cron, not a random visitor ───
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabase()

    // Fetch all active subscribers (consented + not unsubscribed)
    const { data: subscribers, error } = await supabase
      .from('email_subscribers')
      .select('email, unsubscribe_token')
      .eq('marketing_consent', true)
      .is('unsubscribed_at', null)

    if (error) throw error
    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No active subscribers.' })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

    // Send to each subscriber individually so each gets their own unsubscribe token
    // For large lists (>500) switch to Resend Broadcasts or batch in chunks of 100
    let sent = 0
    const errors: string[] = []

    for (const sub of subscribers) {
      const unsubUrl = `${siteUrl}/api/unsubscribe?token=${sub.unsubscribe_token}`
      const html = buildEmailHtml({ unsubUrl, siteUrl })

      const sendRes = await fetch(RESEND_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Hangar Marketplace <newsletter@hangarmarketplace.com>',
          to: sub.email,
          subject: getSubjectLine(),
          html,
        }),
      })

      if (!sendRes.ok) {
        const detail = await sendRes.text()
        errors.push(`${sub.email}: ${detail}`)
      } else {
        sent++
      }
    }

    console.log(`[newsletter cron] sent=${sent} errors=${errors.length}`)
    return NextResponse.json({ sent, errors: errors.length, detail: errors })
  } catch (err: unknown) {
    console.error('[newsletter cron]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Email content ─────────────────────────────────────────────────────────
// Update this function each month with relevant content.
// Placeholders are in place until you write the first real edition.

function getSubjectLine(): string {
  const now   = new Date()
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year  = now.getFullYear()
  return `Hangar Marketplace — ${month} ${year} Update`
}

function buildEmailHtml({ unsubUrl, siteUrl }: { unsubUrl: string; siteUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hangar Marketplace Newsletter</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a3a5c;padding:28px 40px;">
              <p style="margin:0;color:white;font-size:20px;font-weight:700;">✈ Hangar Marketplace</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Aviation Properties</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Monthly Update</h1>

              <!-- ═══════════════════════════════════════════════════════════
                   CONTENT GOES HERE
                   Replace everything between these comments each month.
                   Suggested sections:
                     • New listings spotlight (with photos if possible)
                     • High-priority hangar requests near busy airports
                     • Fuel price trends at popular GA airports
                     • Platform news / new features
                   ═══════════════════════════════════════════════════════════ -->

              <p style="color:#374151;font-size:15px;line-height:1.7;">
                Thanks for being part of Hangar Marketplace. This is your monthly update —
                we'll be filling this with new listings, hangar requests, and aviation news
                very soon.
              </p>

              <p style="color:#374151;font-size:15px;line-height:1.7;">
                In the meantime, browse the latest available hangars or post a request for
                space at your home airport.
              </p>

              <!-- ═══════════════════════════════════════════════════════════ -->

              <a href="${siteUrl}"
                 style="display:inline-block;margin-top:8px;padding:12px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">
                Browse listings →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
                You're receiving this because you subscribed at hangarmarketplace.com.<br />
                <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${siteUrl}/privacy" style="color:#6b7280;text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
