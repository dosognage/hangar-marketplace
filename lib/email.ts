/**
 * Centralized email helpers for Hangar Marketplace.
 *
 * All outbound email goes through sendEmail() which wraps the Resend API.
 * Each template function returns a { subject, html } pair.
 *
 * FROM addresses:
 *   transactional  → notify@hangarmarketplace.com
 *   newsletter     → newsletter@hangarmarketplace.com
 *
 * DEV: Set RESEND_TEST_TO in .env.local to redirect all email to yourself.
 */

const RESEND_API  = 'https://api.resend.com/emails'
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const TEST_TO     = process.env.RESEND_TEST_TO

// ── Sender ─────────────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  html,
  from = `Hangar Marketplace <onboarding@resend.dev>`,
}: {
  to: string
  subject: string
  html: string
  from?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to)
    return
  }

  const recipient = TEST_TO ?? to
  const devBanner = TEST_TO
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:8px 14px;margin-bottom:16px;font-size:12px;border-radius:4px">
         <strong>DEV MODE:</strong> Originally addressed to <code>${to}</code>
       </div>`
    : ''

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: TEST_TO ? `[DEV] ${subject}` : subject,
      html: devBanner + html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[email] Resend error:', err)
  }
}

// ── Shared layout wrapper ──────────────────────────────────────────────────

function layout(bodyHtml: string, footerExtra = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a3a5c;padding:24px 40px;">
              <p style="margin:0;color:white;font-size:20px;font-weight:700;">✈ Hangar Marketplace</p>
              <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">
                Aviation Properties
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
                ${footerExtra}
                <a href="${SITE_URL}/privacy" style="color:#9ca3af;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}" style="color:#9ca3af;">hangarmarketplace.com</a>
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

function btn(label: string, href: string, color = '#2563eb'): string {
  return `<a href="${href}"
    style="display:inline-block;padding:11px 26px;background:${color};color:white;
           text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;margin-top:8px;">
    ${label}
  </a>`
}

// ── Templates ──────────────────────────────────────────────────────────────

/** Sent right after a new account is created. */
export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to Hangar Marketplace ✈',
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Welcome aboard, ${name}! 🎉</h1>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 14px;">
        Your Hangar Marketplace account is all set. Here's what you can do:
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="padding:8px 0;vertical-align:top;padding-right:12px;font-size:20px;">🏠</td>
          <td style="padding:8px 0;">
            <strong style="color:#111827;">Browse available hangars</strong><br/>
            <span style="color:#6b7280;font-size:14px;">Search by airport, state, size, and price.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;padding-right:12px;font-size:20px;">📋</td>
          <td style="padding:8px 0;">
            <strong style="color:#111827;">Post a hangar request</strong><br/>
            <span style="color:#6b7280;font-size:14px;">Tell owners what you need — they'll reach out when space opens up.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;padding-right:12px;font-size:20px;">📣</td>
          <td style="padding:8px 0;">
            <strong style="color:#111827;">List your hangar</strong><br/>
            <span style="color:#6b7280;font-size:14px;">Have space available? Listing is free — reach pilots in your area.</span>
          </td>
        </tr>
      </table>

      ${btn('Browse hangars now →', SITE_URL)}
      &nbsp;&nbsp;
      ${btn('Post a request →', `${SITE_URL}/requests/new`, '#111827')}

      <p style="margin-top:28px;color:#9ca3af;font-size:13px;">
        Questions? Reply to this email or call us at <a href="tel:9203858284" style="color:#6b7280;">(920) 385-8284</a>.
      </p>
    `),
  }
}

/** Sent to seekers when a listing at their requested airport is approved. */
export function newListingAtAirportEmail(opts: {
  seekerName: string
  airportCode: string
  airportName: string
  listingTitle: string
  listingId: string
  listingType: string
  price?: number | null
  unsubToken: string
}): { subject: string; html: string } {
  const { seekerName, airportCode, airportName, listingTitle, listingId, listingType, price, unsubToken } = opts
  const listingUrl  = `${SITE_URL}/listing/${listingId}`
  const unsubUrl    = `${SITE_URL}/api/unsubscribe?token=${unsubToken}`
  const priceStr    = price ? `$${price.toLocaleString()}` : 'Contact for price'
  const typeLabel   = listingType === 'lease' ? 'Lease' : listingType === 'sale' ? 'For Sale' : 'Space Available'

  return {
    subject: `New hangar available at ${airportCode} — ${listingTitle}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">
        New hangar just listed at ${airportCode} ✈
      </h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
        You have an active hangar request at ${airportName} (${airportCode}) — a new listing just went live.
      </p>

      <!-- Listing card -->
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;background:#fafafa;">
        <p style="margin:0 0 6px;">
          <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700;
                       padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">
            ${typeLabel}
          </span>
        </p>
        <h2 style="margin:8px 0 4px;font-size:18px;color:#111827;">${listingTitle}</h2>
        <p style="margin:0;color:#6b7280;font-size:14px;">
          ${airportName} · ${airportCode}
        </p>
        <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#2563eb;">${priceStr}</p>
      </div>

      ${btn('View this listing →', listingUrl)}
      &nbsp;&nbsp;
      ${btn('See all at ' + airportCode, `${SITE_URL}?airport=${airportCode}`, '#111827')}

      <p style="margin-top:24px;color:#9ca3af;font-size:13px;line-height:1.6;">
        Hi ${seekerName} — we're matching this because you have an active hangar request at ${airportCode}.
        If you've already found space, you can remove your request from your dashboard.
      </p>
    `, `<a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a> &nbsp;·&nbsp; `),
  }
}

/** Sent to owners when a new hangar request activates at their airport. */
export function newRequestAtAirportEmail(opts: {
  ownerName: string
  ownerListingTitle: string
  airportCode: string
  airportName: string
  seekerName: string
  aircraftType?: string | null
  wingspan?: number | null
  budget?: number | null
  duration?: string | null
  moveInDate?: string | null
  requestId: string
}): { subject: string; html: string } {
  const {
    ownerName, ownerListingTitle, airportCode, airportName,
    seekerName, aircraftType, wingspan, budget, duration, moveInDate, requestId,
  } = opts
  const requestsUrl = `${SITE_URL}/requests`

  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr>
           <td style="padding:5px 16px 5px 0;color:#6b7280;font-size:14px;white-space:nowrap;">${label}</td>
           <td style="padding:5px 0;font-size:14px;color:#111827;font-weight:600;">${value}</td>
         </tr>`
      : ''

  return {
    subject: `New hangar request at ${airportCode} — someone needs space!`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">
        Someone needs a hangar at ${airportCode} ⚡
      </h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
        You have a listing at ${airportName} — a pilot just posted a request for space there.
      </p>

      <!-- Request card -->
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;background:#fafafa;">
        <h2 style="margin:0 0 14px;font-size:17px;color:#111827;">Request by ${seekerName}</h2>
        <table cellpadding="0" cellspacing="0">
          ${row('Aircraft', aircraftType)}
          ${row('Wingspan', wingspan ? `${wingspan} ft` : null)}
          ${row('Budget', budget ? `$${budget.toLocaleString()}/mo` : null)}
          ${row('Duration', duration)}
          ${row('Move-in', moveInDate ? new Date(moveInDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : null)}
        </table>
      </div>

      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
        If you have space at <strong>${airportName}</strong> that could work for them, use the
        Reply button on their request card to reach out directly.
      </p>

      ${btn('View this request →', requestsUrl)}

      <p style="margin-top:24px;color:#9ca3af;font-size:13px;line-height:1.6;">
        Hi ${ownerName} — you're receiving this because your listing
        <em>${ownerListingTitle}</em> is at ${airportCode}.<br/>
        If this doesn't apply, simply ignore this email.
      </p>
    `),
  }
}

/** Sent to a user when their listing is approved. */
export function listingApprovedEmail(opts: {
  name: string
  title: string
  listingId: string
}): { subject: string; html: string } {
  const { name, title, listingId } = opts
  const listingUrl = `${SITE_URL}/listing/${listingId}`
  return {
    subject: `Your listing "${title}" is now live!`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#166534;">🎉 Your listing is live!</h1>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">
        Hi ${name},
      </p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Great news — your hangar listing <strong>${title}</strong> has been approved
        and is now live on Hangar Marketplace. Pilots at your airport can see it immediately.
      </p>
      ${btn('View your listing →', listingUrl)}
      <p style="margin-top:24px;color:#9ca3af;font-size:13px;">
        Need to make changes? Log in to your dashboard and click Edit on your listing.
      </p>
    `),
  }
}

/** Sent to a user when their listing is rejected. */
export function listingRejectedEmail(opts: {
  name: string
  title: string
}): { subject: string; html: string } {
  const { name, title } = opts
  return {
    subject: `Update on your listing "${title}"`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#991b1b;">Listing Not Approved</h1>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">Hi ${name},</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Unfortunately your listing <strong>${title}</strong> was not approved at this time.
        If you have questions or want to resubmit with changes, reply to this email or call us
        at <a href="tel:9203858284" style="color:#2563eb;">(920) 385-8284</a>.
      </p>
      ${btn('Edit and resubmit →', `${SITE_URL}/dashboard`, '#111827')}
    `),
  }
}

/** Sent to listing owners 3 days before their sponsorship expires. */
export function sponsorshipExpiryEmail(opts: {
  ownerName: string
  listingTitle: string
  listingId: string
  expiresAt: string
}): { subject: string; html: string } {
  const { ownerName, listingTitle, listingId, expiresAt } = opts
  const listingUrl = `${SITE_URL}/listing/${listingId}`
  const expiresLabel = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  return {
    subject: `Your sponsored listing expires in 3 days — "${listingTitle}"`,
    html: layout(`
      <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">Your sponsorship is expiring soon</h1>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">Hi ${ownerName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Your sponsored listing <strong>${listingTitle}</strong> is pinned to the top of search results until
        <strong>${expiresLabel}</strong>. After that, it will return to the standard listing order.
      </p>

      <div style="border:1px solid #c7d2fe;border-radius:8px;padding:16px 20px;background:#eef2ff;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#4338ca;font-weight:600;">
          Renew now to keep your listing at the top
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
          Sponsorship keeps your listing visible to pilots actively searching in your area — renewal takes less than a minute.
        </p>
      </div>

      ${btn('Renew sponsorship →', listingUrl, '#6366f1')}
      &nbsp;&nbsp;
      ${btn('View your listing', listingUrl, '#111827')}

      <p style="margin-top:28px;color:#9ca3af;font-size:13px;line-height:1.6;">
        Questions? Reply to this email or call us at <a href="tel:9203858284" style="color:#6b7280;">(920) 385-8284</a>.
      </p>
    `),
  }
}

/** Monthly newsletter — dynamic content driven by recent listings. */
export function newsletterEmail(opts: {
  unsubUrl: string
  recentListings: Array<{
    id: string
    title: string
    airport_name: string | null
    airport_code: string | null
    listing_type: string | null
    price: number | null
  }>
  month: string
  year: number
}): { subject: string; html: string } {
  const { unsubUrl, recentListings, month, year } = opts

  const listingCards = recentListings.length === 0
    ? `<p style="color:#6b7280;font-size:14px;">No new listings this month — check back soon!</p>`
    : recentListings.map(l => {
        const typeLabel = l.listing_type === 'lease' ? 'Lease' : l.listing_type === 'sale' ? 'For Sale' : 'Space Available'
        const priceStr  = l.price ? `$${l.price.toLocaleString()}` : 'Contact for price'
        return `
          <tr>
            <td style="padding:0 0 12px;">
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;background:#fafafa;">
                <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;
                             padding:2px 7px;border-radius:999px;text-transform:uppercase;margin-bottom:6px;">
                  ${typeLabel}
                </span>
                <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#111827;">${l.title}</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">
                  ${[l.airport_name, l.airport_code].filter(Boolean).join(' · ')}
                </p>
                <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:#2563eb;">${priceStr}</p>
                <a href="${SITE_URL}/listing/${l.id}"
                   style="display:inline-block;margin-top:8px;padding:6px 14px;background:#111827;color:white;
                          border-radius:5px;text-decoration:none;font-size:12px;font-weight:600;">
                  View listing →
                </a>
              </div>
            </td>
          </tr>`
      }).join('')

  return {
    subject: `Hangar Marketplace — ${month} ${year} Update`,
    html: layout(`
      <h1 style="margin:0 0 6px;font-size:22px;color:#111827;">
        ${month} ${year} Hangar Market Update
      </h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">
        Here's what's new on Hangar Marketplace this month.
      </p>

      <h2 style="margin:0 0 14px;font-size:15px;color:#374151;text-transform:uppercase;
                 letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
        New Listings
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        ${listingCards}
      </table>

      ${btn('Browse all listings →', SITE_URL)}
      &nbsp;&nbsp;
      ${btn('Post a hangar request →', `${SITE_URL}/requests/new`, '#111827')}
    `, `<a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a> &nbsp;·&nbsp; `),
  }
}
