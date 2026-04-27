/**
 * Centralized email helpers for Hangar Marketplace.
 *
 * All outbound email goes through sendEmail() which wraps the Resend API.
 * Each template function returns a { subject, html } pair.
 *
 * FROM addresses:
 *   transactional  → hello@hangarmarketplace.com
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
  from = `Hangar Marketplace <hello@hangarmarketplace.com>`,
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

// ── Modern layout wrapper ─────────────────────────────────────────────────
//
// Every customer-facing template (except the welcome email, which has its own
// voice on purpose) wraps its content with modernLayout(). The structure:
//
//   • Dark slate header with wordmark + tiny eyebrow tag
//   • Optional hero image / gradient band
//   • White content area with the caller's bodyHtml
//   • CTA row (title + button), if provided
//   • Muted footer with settings + contact links
//
// The helper stays email-safe: table-based layout, inline styles, no web
// fonts beyond the system stack, absolute URLs everywhere.

export type ModernEmailSection = {
  title?:  string   // small uppercase eyebrow above a block of content
  html:    string   // inner HTML (caller already HTML-encodes anything dynamic)
}

export type ModernEmailCTA = {
  label: string
  href:  string
  hint?: string     // small gray text below the button
}

export type ModernEmailArgs = {
  preheader?:   string                 // inbox preview line
  eyebrow?:     string                 // tiny uppercase chip in the dark header
  title:        string                 // big headline inside the card
  subtitle?:    string                 // optional gray explainer line
  heroUrl?:     string | null          // optional hero photo
  heroGradient?: string                // fallback / override for the hero band
  heroCaption?: string                 // optional centered text inside the gradient
  sections?:    ModernEmailSection[]
  cta?:         ModernEmailCTA
  secondaryCta?: ModernEmailCTA
  footerIntro?: string                 // why-am-I-getting-this line
  footerLinks?: Array<{ label: string; href: string }>
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function modernLayout(args: ModernEmailArgs): string {
  const {
    preheader,
    eyebrow,
    title,
    subtitle,
    heroUrl,
    heroGradient = 'linear-gradient(135deg,#0f172a 0%,#1e40af 60%,#60a5fa 100%)',
    heroCaption,
    sections = [],
    cta,
    secondaryCta,
    footerIntro,
    footerLinks,
  } = args

  const heroBlock = heroUrl
    ? `<tr><td style="padding:0;"><img src="${heroUrl}" alt="" width="600"
             style="display:block;width:100%;height:auto;border:0;" /></td></tr>`
    : heroCaption
      ? `<tr><td style="padding:0;">
           <div style="height:110px;background:${heroGradient};text-align:center;
                       color:white;font-size:24px;font-weight:700;line-height:110px;
                       letter-spacing:0.04em;">${htmlEscape(heroCaption)}</div>
         </td></tr>`
      : ''

  const sectionsHtml = sections.map(s => {
    const eyebrowRow = s.title
      ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#6b7280;
                  text-transform:uppercase;letter-spacing:0.08em;">${htmlEscape(s.title)}</p>`
      : ''
    return `
      <tr><td style="padding:22px 36px 0;">
        ${eyebrowRow}
        ${s.html}
      </td></tr>`
  }).join('')

  const ctaHtml = cta
    ? `<tr><td style="padding:28px 36px 8px;">
         <a href="${cta.href}"
            style="display:block;padding:14px 20px;background:#0f172a;color:white;text-decoration:none;
                   border-radius:10px;font-size:15px;font-weight:700;text-align:center;">
           ${htmlEscape(cta.label)}
         </a>
         ${cta.hint ? `<p style="margin:12px 0 0;text-align:center;font-size:12px;color:#94a3b8;">${htmlEscape(cta.hint)}</p>` : ''}
       </td></tr>`
    : ''

  const secondaryCtaHtml = secondaryCta
    ? `<tr><td style="padding:0 36px 8px;text-align:center;">
         <a href="${secondaryCta.href}" style="font-size:13px;color:#2563eb;text-decoration:none;font-weight:600;">
           ${htmlEscape(secondaryCta.label)} →
         </a>
       </td></tr>`
    : ''

  const footerLinksHtml = footerLinks && footerLinks.length > 0
    ? footerLinks.map(l => `<a href="${l.href}" style="color:#64748b;">${htmlEscape(l.label)}</a>`).join(' &nbsp;·&nbsp; ')
    : `<a href="${SITE_URL}/settings" style="color:#64748b;">Profile Settings</a>
       &nbsp;·&nbsp;
       <a href="mailto:hello@hangarmarketplace.com" style="color:#64748b;">Contact us</a>`

  const footerIntroHtml = footerIntro
    ? `<p style="margin:0 0 6px;font-size:12px;color:#64748b;line-height:1.6;">${footerIntro}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111827;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${htmlEscape(preheader)}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">

        <!-- Header -->
        <tr><td style="padding:20px 36px;background:#0f172a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:white;font-size:15px;font-weight:700;letter-spacing:0.02em;">
                <a href="${SITE_URL}" style="color:white;text-decoration:none;">✈ Hangar Marketplace</a>
              </td>
              ${eyebrow ? `<td align="right" style="color:#94a3b8;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">${htmlEscape(eyebrow)}</td>` : ''}
            </tr>
          </table>
        </td></tr>

        ${heroBlock}

        <!-- Title -->
        <tr><td style="padding:28px 36px 0;">
          <h1 style="margin:0 0 ${subtitle ? '6px' : '0'};font-size:22px;line-height:1.25;color:#0f172a;">
            ${htmlEscape(title)}
          </h1>
          ${subtitle ? `<p style="margin:0;color:#64748b;font-size:14px;line-height:1.55;">${htmlEscape(subtitle)}</p>` : ''}
        </td></tr>

        ${sectionsHtml}

        ${ctaHtml}
        ${secondaryCtaHtml}

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;margin-top:16px;">
          ${footerIntroHtml}
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            ${footerLinksHtml}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Shared layout wrapper (original — used by welcomeEmail) ──────────────

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
        Questions? Reply to this email or call us at <a href="mailto:hello@hangarmarketplace.com" style="color:#2563eb;">hello@hangarmarketplace.com</a>.
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
  const listingUrl = `${SITE_URL}/listing/${listingId}`
  const unsubUrl   = `${SITE_URL}/api/unsubscribe?token=${unsubToken}`
  const priceStr   = price ? `$${price.toLocaleString()}` : 'Contact for price'
  const typeLabel  = listingType === 'lease' ? 'For Lease' : listingType === 'sale' ? 'For Sale' : 'Space Available'

  return {
    subject: `New hangar at ${airportCode}: ${listingTitle}`,
    html: modernLayout({
      preheader: `${listingTitle} just listed at ${airportName}. ${priceStr}.`,
      eyebrow:   `Match at ${airportCode}`,
      title:     `New hangar just listed at ${airportCode}`,
      subtitle:  `${seekerName}, you have an open request at ${airportName}. A listing that matches is now live.`,
      heroCaption: airportCode,
      sections: [{
        title: 'The listing',
        html: `
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#f8fafc;">
            <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700;
                         padding:2px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">
              ${htmlEscape(typeLabel)}
            </span>
            <h2 style="margin:10px 0 4px;font-size:17px;color:#0f172a;">${htmlEscape(listingTitle)}</h2>
            <p style="margin:0;color:#64748b;font-size:13px;">${htmlEscape(airportName)} · ${htmlEscape(airportCode)}</p>
            <p style="margin:10px 0 0;font-size:17px;font-weight:700;color:#0f172a;">${htmlEscape(priceStr)}</p>
          </div>`,
      }],
      cta: {
        label: 'View this listing',
        href:  listingUrl,
      },
      secondaryCta: { label: `See all listings at ${airportCode}`, href: `${SITE_URL}?airport=${airportCode}` },
      footerIntro: `You're getting this because you have an open request at ${htmlEscape(airportCode)}. If you've already found space, you can remove your request from your dashboard.`,
      footerLinks: [
        { label: 'Unsubscribe',       href: unsubUrl },
        { label: 'Manage requests',   href: `${SITE_URL}/requests` },
        { label: 'Contact us',        href: 'mailto:hello@hangarmarketplace.com' },
      ],
    }),
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
    seekerName, aircraftType, wingspan, budget, duration, moveInDate,
  } = opts

  const rows: Array<[string, string | null | undefined]> = [
    ['Aircraft',  aircraftType],
    ['Wingspan',  wingspan ? `${wingspan} ft` : null],
    ['Budget',    budget   ? `$${budget.toLocaleString()} / mo` : null],
    ['Duration',  duration],
    ['Move-in',   moveInDate ? new Date(moveInDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null],
  ]
  const rowsHtml = rows
    .filter(([, v]) => !!v)
    .map(([label, value], i, arr) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;${i === arr.length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;'}">${htmlEscape(label)}</td>
        <td align="right" style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;${i === arr.length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;'}">${htmlEscape(String(value))}</td>
      </tr>`).join('')

  return {
    subject: `New hangar request at ${airportCode}`,
    html: modernLayout({
      preheader: `${seekerName} is looking for hangar space at ${airportName}. Your listing ${ownerListingTitle} could be a match.`,
      eyebrow:   `Match at ${airportCode}`,
      title:     `Someone needs a hangar at ${airportCode}`,
      subtitle:  `${ownerName}, a pilot just posted a request at ${airportName}. Your listing ${ownerListingTitle} is at this airport.`,
      heroCaption: airportCode,
      sections: [{
        title: `Request by ${seekerName}`,
        html: rowsHtml
          ? `<table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>`
          : `<p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">No additional details provided.</p>`,
      }, {
        title: 'Next step',
        html: `
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
            If your listing could work, open the request page and use Reply to reach out directly.
          </p>`,
      }],
      cta: {
        label: 'View this request',
        href:  `${SITE_URL}/requests`,
      },
      footerIntro: `You're getting this because your listing ${htmlEscape(ownerListingTitle)} is at ${htmlEscape(airportCode)}.`,
    }),
  }
}

/** Sent to a user immediately after their listing is submitted for review. */
export function listingSubmittedEmail(opts: {
  name: string
  title: string
  airportCode: string
}): { subject: string; html: string } {
  const { name, title, airportCode } = opts
  return {
    subject: `We received your listing: ${title}`,
    html: modernLayout({
      preheader: `Thanks ${name}. Your listing at ${airportCode} is in review and usually goes live within 24 hours.`,
      eyebrow:   'Under review',
      title:     'Listing received',
      subtitle:  `Thanks ${name}. We got your hangar listing at ${airportCode} and it's in the review queue.`,
      heroCaption: '✓',
      heroGradient: 'linear-gradient(135deg,#065f46 0%,#10b981 60%,#6ee7b7 100%)',
      sections: [{
        title: 'What happens next',
        html: `
          <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.65;">
            We'll review <strong>${htmlEscape(title)}</strong> for accuracy and completeness. If anything looks off, we'll reach out.
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
            Once approved, your listing goes live immediately and buyers can contact you directly. This usually takes less than 24 hours.
          </p>`,
      }],
      cta: {
        label: 'View your dashboard',
        href:  `${SITE_URL}/dashboard`,
      },
      footerIntro: `You're getting this because you just submitted a listing on Hangar Marketplace.`,
    }),
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
    subject: `Your listing is now live: ${title}`,
    html: modernLayout({
      preheader: `${title} is approved and visible to pilots searching your area.`,
      eyebrow:   'Approved',
      title:     'Your listing is live',
      subtitle:  `Great news ${name}. ${title} just cleared review and is visible to pilots searching your area.`,
      heroCaption: 'LIVE',
      heroGradient: 'linear-gradient(135deg,#14532d 0%,#16a34a 60%,#86efac 100%)',
      sections: [{
        title: 'What happens now',
        html: `
          <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.65;">
            Your listing is in search results, on your public profile, and in any alerts we send to nearby pilots.
          </p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
            Inquiries arrive by email and in your dashboard. You can edit photos, pricing, and details anytime.
          </p>`,
      }],
      cta: {
        label: 'View your listing',
        href:  listingUrl,
      },
      secondaryCta: { label: 'Edit listing', href: `${SITE_URL}/listing/${listingId}/edit` },
      footerIntro: `You're getting this because your listing was just approved on Hangar Marketplace.`,
    }),
  }
}

/** Sent to a user when their listing is rejected. */
export function listingRejectedEmail(opts: {
  name: string
  title: string
}): { subject: string; html: string } {
  const { name, title } = opts
  return {
    subject: `Update on your listing: ${title}`,
    html: modernLayout({
      preheader: `${title} wasn't approved this round. Reply to this email and we'll walk you through next steps.`,
      eyebrow:   'Action needed',
      title:     'Listing not approved',
      subtitle:  `Hi ${name}. We weren't able to approve ${title} as submitted, but we'd like to help you get it live.`,
      heroCaption: '!',
      heroGradient: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 60%,#fca5a5 100%)',
      sections: [{
        title: 'Common reasons',
        html: `
          <ul style="margin:0;padding:0 0 0 18px;color:#374151;font-size:14px;line-height:1.7;">
            <li>Photos were missing, blurry, or didn't show the space</li>
            <li>Pricing, dimensions, or airport details looked off</li>
            <li>The listing didn't match what we allow in this category</li>
          </ul>`,
      }, {
        title: 'Next step',
        html: `
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
            Reply to this email or call <a href="mailto:hello@hangarmarketplace.com" style="color:#2563eb;text-decoration:none;">hello@hangarmarketplace.com</a> and we'll tell you exactly what to tweak so the resubmission goes through.
          </p>`,
      }],
      cta: {
        label: 'Edit and resubmit',
        href:  `${SITE_URL}/dashboard`,
      },
      footerIntro: `You're getting this because your listing was just reviewed on Hangar Marketplace.`,
    }),
  }
}

/** Sent to a broker when their application is approved — VIP welcome. */
export function brokerApprovedEmail(opts: {
  name: string
  profileId: string
}): { subject: string; html: string } {
  const { name, profileId } = opts
  const profileUrl   = `${SITE_URL}/broker/${profileId}`
  const dashboardUrl = `${SITE_URL}/broker/dashboard`

  const perks = [
    ['Public broker profile',     'Your profile is live and buyers can find you directly.'],
    ['Verified badge on listings', 'Every listing you post shows a blue verified mark.'],
    ['Auto-approval',             'New listings go live instantly, no review queue.'],
    ['Priority placement',        'Your listings sit higher in search results.'],
    ['Broker analytics',          'Views, inquiries, and performance per listing.'],
  ]

  const perksHtml = perks.map(([title, desc]) => `
    <tr>
      <td style="padding:6px 0;vertical-align:top;width:28px;">
        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#2563eb;
                     text-align:center;line-height:20px;color:white;font-size:12px;font-weight:700;">✓</span>
      </td>
      <td style="padding:6px 0;">
        <strong style="color:#0f172a;font-size:14px;">${htmlEscape(title)}</strong><br/>
        <span style="color:#64748b;font-size:13px;">${htmlEscape(desc)}</span>
      </td>
    </tr>`).join('')

  return {
    subject: 'You\'re a verified broker on Hangar Marketplace',
    html: modernLayout({
      preheader: `Welcome ${name}. Your broker profile is live and every listing you post will carry the verified badge.`,
      eyebrow:   'Verified',
      title:     'Welcome to the Verified Broker Program',
      subtitle:  `${name}, your credentials cleared review. Your profile is live, your listings will carry the verified badge, and you get auto-approval on everything you post.`,
      heroCaption: 'VERIFIED',
      heroGradient: 'linear-gradient(135deg,#0c4a6e 0%,#2563eb 55%,#93c5fd 100%)',
      sections: [{
        title: 'What you just unlocked',
        html: `<table width="100%" cellpadding="0" cellspacing="0">${perksHtml}</table>`,
      }],
      cta: {
        label: 'Open your broker dashboard',
        href:  dashboardUrl,
      },
      secondaryCta: { label: 'View my public profile', href: profileUrl },
      footerIntro: `You're getting this because your broker application was just approved on Hangar Marketplace.`,
    }),
  }
}

/** Admin-facing: a user just submitted a broker application. */
export function newBrokerApplicationEmail(opts: {
  applicantName:  string
  applicantEmail: string
  brokerage:      string | null
  licenseState:   string | null
  licenseNumber:  string | null
  phone:          string | null
  website:        string | null
  bio:            string | null
  isUnlicensed:   boolean
}): { subject: string; html: string } {
  const { applicantName, applicantEmail, brokerage, licenseState, licenseNumber, phone, website, bio, isUnlicensed } = opts

  const rows: Array<[string, string | null]> = [
    ['Name',      applicantName],
    ['Email',     applicantEmail],
    ['Brokerage', brokerage],
    ['Phone',     phone],
    ['Website',   website],
    ['License',   isUnlicensed ? 'Unlicensed hangar specialist' : [licenseNumber, licenseState].filter(Boolean).join(' · ') || null],
  ]

  const rowsHtml = rows
    .filter(([, v]) => !!v)
    .map(([label, value], i, arr) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#64748b;white-space:nowrap;padding-right:16px;${i === arr.length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;'}">${htmlEscape(label)}</td>
        <td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:500;${i === arr.length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;'}">${htmlEscape(String(value))}</td>
      </tr>`).join('')

  return {
    subject: `New broker application: ${applicantName}`,
    html: modernLayout({
      preheader: `${applicantName}${brokerage ? ` (${brokerage})` : ''} just applied. Review at /admin.`,
      eyebrow:   'Admin inbox',
      title:     'New broker application',
      subtitle:  `${applicantName} just submitted an application to become a Verified Broker. Review and approve or reject from the admin panel.`,
      heroCaption: 'REVIEW',
      heroGradient: 'linear-gradient(135deg,#0c4a6e 0%,#2563eb 55%,#93c5fd 100%)',
      sections: [
        {
          title: 'Applicant',
          html:  `<table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>`,
        },
        ...(bio ? [{
          title: 'Bio',
          html: `<p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">${htmlEscape(bio)}</p>`,
        }] : []),
      ],
      cta: {
        label: 'Open admin panel',
        href:  `${SITE_URL}/admin`,
      },
      footerIntro: `You're getting this because your email is in ADMIN_EMAILS.`,
    }),
  }
}

/** Sent to a broker when their application is rejected. */
export function brokerRejectedEmail(opts: {
  name: string
}): { subject: string; html: string } {
  const { name } = opts
  return {
    subject: 'Update on your broker application',
    html: modernLayout({
      preheader: `We weren't able to approve ${name}'s broker application. Reply and we'll sort it out together.`,
      eyebrow:   'Action needed',
      title:     'Broker application update',
      subtitle:  `Hi ${name}, thanks for applying. We weren't able to approve your Verified Broker application this round, usually because of a mismatch between license details and state records.`,
      heroCaption: '?',
      heroGradient: 'linear-gradient(135deg,#7f1d1d 0%,#b91c1c 60%,#fca5a5 100%)',
      sections: [{
        title: 'Want to reapply',
        html: `
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
            Reply to this email or call us at <a href="mailto:hello@hangarmarketplace.com" style="color:#2563eb;text-decoration:none;">hello@hangarmarketplace.com</a>. Share your license number and state and we'll walk you through the resubmission so the next round goes clean.
          </p>`,
      }],
      cta: {
        label: 'Contact us',
        href:  'mailto:hello@hangarmarketplace.com',
      },
      footerIntro: `You're getting this because you applied to become a Verified Broker on Hangar Marketplace.`,
    }),
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
    subject: `Your sponsored listing expires in 3 days: ${listingTitle}`,
    html: modernLayout({
      preheader: `${listingTitle} stays pinned at the top until ${expiresLabel}. Renew to keep the placement.`,
      eyebrow:   '3 days left',
      title:     'Your sponsorship is expiring soon',
      subtitle:  `Hi ${ownerName}. ${listingTitle} is pinned to the top of search results until ${expiresLabel}. After that it returns to the standard order.`,
      heroCaption: '72 HRS',
      heroGradient: 'linear-gradient(135deg,#5b21b6 0%,#7c3aed 55%,#c4b5fd 100%)',
      sections: [{
        title: 'Why it matters',
        html: `
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
            Sponsorship keeps your listing visible to pilots actively searching in your area. Renewal takes under a minute and keeps the slot yours.
          </p>`,
      }],
      cta: {
        label: 'Renew sponsorship',
        href:  listingUrl,
      },
      secondaryCta: { label: 'View your listing', href: listingUrl },
      footerIntro: `You're getting this because your sponsored listing on Hangar Marketplace is expiring soon.`,
    }),
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

  const cards = recentListings.length === 0
    ? `<p style="margin:0;font-size:14px;color:#64748b;">No new listings this month. Check back soon.</p>`
    : recentListings.map(l => {
        const typeLabel = l.listing_type === 'lease' ? 'For Lease' : l.listing_type === 'sale' ? 'For Sale' : 'Space Available'
        const priceStr  = l.price ? `$${l.price.toLocaleString()}` : 'Contact for price'
        return `
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;background:#f8fafc;margin-bottom:10px;">
            <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;
                         padding:2px 8px;border-radius:999px;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.05em;">
              ${htmlEscape(typeLabel)}
            </span>
            <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#0f172a;">${htmlEscape(l.title)}</p>
            <p style="margin:0;font-size:13px;color:#64748b;">
              ${htmlEscape([l.airport_name, l.airport_code].filter(Boolean).join(' · '))}
            </p>
            <p style="margin:6px 0 10px;font-size:14px;font-weight:700;color:#0f172a;">${htmlEscape(priceStr)}</p>
            <a href="${SITE_URL}/listing/${l.id}"
               style="display:inline-block;padding:7px 14px;background:#0f172a;color:white;
                      border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">
              View listing
            </a>
          </div>`
      }).join('')

  return {
    subject: `${month} ${year} Hangar Market Update`,
    html: modernLayout({
      preheader: `The ${recentListings.length} newest listings on Hangar Marketplace this ${month}.`,
      eyebrow:   `${month} ${year}`,
      title:     `${month} ${year} Hangar Market Update`,
      subtitle:  `Here's what's new on Hangar Marketplace this month.`,
      sections: [{
        title: 'New listings',
        html:  cards,
      }],
      cta: {
        label: 'Browse all listings',
        href:  SITE_URL,
      },
      secondaryCta: { label: 'Post a hangar request', href: `${SITE_URL}/requests/new` },
      footerIntro: `You're on the Hangar Marketplace monthly list.`,
      footerLinks: [
        { label: 'Unsubscribe', href: unsubUrl },
        { label: 'Contact us',  href: 'mailto:hello@hangarmarketplace.com' },
      ],
    }),
  }
}
