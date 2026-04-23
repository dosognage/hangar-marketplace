/**
 * 50-mile radius alerts for new listings and new hangar requests.
 *
 * There are two dispatchers here:
 *
 *   notifyBuyersOfNewListing(listing)
 *     Fired when a listing is published (broker auto-approve path, and the
 *     admin approval path for trial/paid listings). Finds every user whose
 *     home_airport_lat/lng sits within 50mi of the listing coordinates and
 *     sends them an email + in-app notification.
 *
 *   notifyListingOwnersOfNewRequest(request)
 *     Fired when a buyer posts a hangar request. Finds every approved listing
 *     within 50mi of the request's airport and notifies the listing owner.
 *     Skips the request author — no point telling them about themselves.
 *
 * Both dispatchers:
 *   - Run as fire-and-forget (void + .catch) from the caller.
 *   - Use hello@hangarmarketplace.com as the from-address.
 *   - Are non-fatal: a single failed send logs and the rest continue.
 *   - Dedupe per user_id so one person with three nearby listings only gets
 *     one email about a new request.
 */

import { supabaseAdmin } from './supabase-admin'
import { distanceMiles } from './geocode'
import { sendEmail } from './email'
import { createNotification } from './notifications'

const RADIUS_MILES = 50
const FROM_ADDRESS = 'Hangar Marketplace <hello@hangarmarketplace.com>'
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

type UserPrefRow = {
  user_id:          string
  home_airport_code: string | null
  home_airport_lat:  number | null
  home_airport_lng:  number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// New listing → nearby buyers
// ─────────────────────────────────────────────────────────────────────────────

export type NewListingPayload = {
  id:            string
  title:         string
  airport_code:  string
  airport_name:  string
  listing_type:  string
  latitude:      number
  longitude:     number
  asking_price:  number | null
  monthly_lease: number | null
}

export async function notifyBuyersOfNewListing(listing: NewListingPayload): Promise<void> {
  if (listing.latitude == null || listing.longitude == null) return

  // Pull every user who has opted in with a cached home airport position.
  // 50 miles is a narrow window so we can afford to filter in-memory rather
  // than push haversine into Postgres via an RPC.
  const { data: prefs, error } = await supabaseAdmin
    .from('user_preferences')
    .select('user_id, home_airport_code, home_airport_lat, home_airport_lng')
    .eq('notify_new_listings', true)
    .not('home_airport_lat', 'is', null)
    .not('home_airport_lng', 'is', null)

  if (error) {
    console.error('[listingAlerts] load prefs failed:', error.message)
    return
  }
  if (!prefs || prefs.length === 0) return

  const nearby = (prefs as UserPrefRow[]).filter(pref => {
    if (pref.home_airport_lat == null || pref.home_airport_lng == null) return false
    const miles = distanceMiles(
      { lat: listing.latitude,         lng: listing.longitude },
      { lat: pref.home_airport_lat,    lng: pref.home_airport_lng },
    )
    return miles <= RADIUS_MILES
  })

  if (nearby.length === 0) return

  // Resolve emails via admin.listUsers — we keep the list small (one page per
  // 1000 users is plenty at current scale).
  const emailsByUserId = await resolveUserEmails(nearby.map(p => p.user_id))

  const priceLabel =
    listing.listing_type === 'sale'
      ? (listing.asking_price ? `$${listing.asking_price.toLocaleString()}` : 'Contact for price')
      : (listing.monthly_lease ? `$${listing.monthly_lease.toLocaleString()}/mo` : 'Contact for rate')

  const typeLabel =
    listing.listing_type === 'sale'   ? 'For Sale'         :
    listing.listing_type === 'space'  ? 'Space Available'  :
                                        'For Lease'

  const listingUrl = `${SITE_URL}/listing/${listing.id}`

  await Promise.all(nearby.map(async pref => {
    const email = emailsByUserId.get(pref.user_id)

    // In-app bell always (we have a user id).
    void createNotification({
      userId: pref.user_id,
      type:   'inquiry',  // NOTE: reusing the existing type set for now.
      title:  `New ${typeLabel.toLowerCase()} listing near ${pref.home_airport_code ?? 'your airport'}`,
      body:   `${listing.title} at ${listing.airport_code}. ${priceLabel}.`,
      link:   `/listing/${listing.id}`,
    }).catch(e => console.error('[listingAlerts] notification insert failed:', e))

    if (!email) return  // email row missing — in-app only

    await sendEmail({
      to:      email,
      from:    FROM_ADDRESS,
      subject: `New ${typeLabel.toLowerCase()} listing near ${pref.home_airport_code ?? 'your area'}: ${listing.title}`,
      html:    renderNewListingEmail({
        homeAirport:  pref.home_airport_code ?? '',
        typeLabel,
        listing,
        priceLabel,
        listingUrl,
      }),
    }).catch(e => console.error('[listingAlerts] email send failed:', e))
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// New hangar request → nearby listing owners
// ─────────────────────────────────────────────────────────────────────────────

export type NewRequestPayload = {
  requestId:      string
  requesterId:    string
  airportCode:    string
  airportName:    string
  city:           string
  state:          string
  contactName:    string
  aircraftType?:  string | null
  duration?:      string | null
  budget?:        number | null
  moveInDate?:    string | null
  notes?:         string | null
  requestLat:     number
  requestLng:     number
}

type ListingOwnerRow = {
  id:           string
  user_id:      string
  title:        string
  airport_code: string
  latitude:     number | null
  longitude:    number | null
}

export async function notifyListingOwnersOfNewRequest(req: NewRequestPayload): Promise<void> {
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('id, user_id, title, airport_code, latitude, longitude')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)

  if (error) {
    console.error('[listingAlerts] load listings failed:', error.message)
    return
  }
  if (!listings || listings.length === 0) return

  // Filter to listings whose center is within 50mi of the request.
  const matched = (listings as ListingOwnerRow[]).filter(l => {
    if (l.latitude == null || l.longitude == null) return false
    return distanceMiles(
      { lat: req.requestLat, lng: req.requestLng },
      { lat: l.latitude,     lng: l.longitude    },
    ) <= RADIUS_MILES
  })

  if (matched.length === 0) return

  // Collapse to one notification per owner. If an owner has three nearby
  // listings they get one email that mentions the closest match (the first
  // in the matched list, since we don't sort — good enough).
  const uniqueByOwner = new Map<string, ListingOwnerRow>()
  for (const l of matched) {
    if (l.user_id === req.requesterId) continue           // don't self-notify
    if (!uniqueByOwner.has(l.user_id)) uniqueByOwner.set(l.user_id, l)
  }

  if (uniqueByOwner.size === 0) return

  const ownerIds = [...uniqueByOwner.keys()]
  const emailsByUserId = await resolveUserEmails(ownerIds)

  const details = [
    req.aircraftType && `Aircraft: ${req.aircraftType}`,
    req.duration     && `Duration: ${req.duration}`,
    req.budget       && `Budget: $${req.budget.toLocaleString()}/mo`,
    req.moveInDate   && `Move-in: ${req.moveInDate}`,
    req.notes        && `Notes: ${req.notes}`,
  ].filter(Boolean).join('<br/>')

  const requestUrl = `${SITE_URL}/requests`

  await Promise.all([...uniqueByOwner.entries()].map(async ([ownerId, listing]) => {
    void createNotification({
      userId: ownerId,
      type:   'broker_request_alert',
      title:  `New hangar request near ${listing.airport_code}`,
      body:   `${req.contactName} is looking for hangar space at ${req.airportName}, ${req.city}, ${req.state}.`,
      link:   '/requests',
    }).catch(e => console.error('[listingAlerts] request notification failed:', e))

    const email = emailsByUserId.get(ownerId)
    if (!email) return

    await sendEmail({
      to:      email,
      from:    FROM_ADDRESS,
      subject: `New hangar request near your listing at ${listing.airport_code}`,
      html:    renderNewRequestEmail({
        ownerListingTitle: listing.title,
        ownerAirport:      listing.airport_code,
        req,
        details,
        requestUrl,
      }),
    }).catch(e => console.error('[listingAlerts] request email failed:', e))
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve user_ids to primary email addresses via the admin API.
 * Pulls the first page (up to 1000 users) — fine for early-stage scale.
 * Replace with a direct auth.users query via a secure view if this becomes
 * a bottleneck.
 */
async function resolveUserEmails(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (userIds.length === 0) return out

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ perPage: 1000 })
    if (error) {
      console.warn('[listingAlerts] listUsers failed:', error.message)
      return out
    }
    const users: Array<{ id: string; email?: string | null }> = data?.users ?? []
    const wanted = new Set(userIds)
    for (const u of users) {
      if (wanted.has(u.id) && u.email) out.set(u.id, u.email)
    }
  } catch (e) {
    console.warn('[listingAlerts] listUsers threw:', e)
  }

  return out
}

function renderNewListingEmail(opts: {
  homeAirport: string
  typeLabel:   string
  listing:     NewListingPayload
  priceLabel:  string
  listingUrl:  string
}): string {
  const { homeAirport, typeLabel, listing, priceLabel, listingUrl } = opts
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a3a5c;padding:24px 40px;">
          <p style="margin:0;color:white;font-size:20px;font-weight:700;">Hangar Marketplace</p>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Aviation Properties</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#111827;">
            New ${typeLabel.toLowerCase()} listing near ${homeAirport || 'your home airport'}
          </h1>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
            A fresh listing just went live within 50 miles of ${homeAirport || 'your home airport'}.
          </p>
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:18px 22px;background:#fafafa;margin-bottom:26px;">
            <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">
              ${typeLabel}
            </span>
            <h2 style="margin:10px 0 4px;font-size:18px;color:#111827;">${escapeHtml(listing.title)}</h2>
            <p style="margin:0;color:#6b7280;font-size:14px;">${escapeHtml(listing.airport_name)} · ${escapeHtml(listing.airport_code)}</p>
            <p style="margin:8px 0 0;font-size:17px;font-weight:700;color:#2563eb;">${priceLabel}</p>
          </div>
          <a href="${listingUrl}" style="display:inline-block;padding:11px 26px;background:#2563eb;color:white;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">
            View this listing
          </a>
          <p style="margin:26px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
            You're getting this because ${homeAirport ? escapeHtml(homeAirport) : 'your home airport'} is set in your Hangar Marketplace settings.
            You can change or clear it anytime at <a href="${SITE_URL}/settings" style="color:#6366f1;">${SITE_URL}/settings</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function renderNewRequestEmail(opts: {
  ownerListingTitle: string
  ownerAirport:      string
  req:               NewRequestPayload
  details:           string
  requestUrl:        string
}): string {
  const { ownerListingTitle, ownerAirport, req, details, requestUrl } = opts
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a3a5c;padding:24px 40px;">
          <p style="margin:0;color:white;font-size:20px;font-weight:700;">Hangar Marketplace</p>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Aviation Properties</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Nearby Hangar Request</p>
          <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Pilot looking for space near ${escapeHtml(req.airportCode)}</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
            A buyer just posted a request within 50 miles of your listing <em>${escapeHtml(ownerListingTitle)}</em> at ${escapeHtml(ownerAirport)}.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#374151;line-height:1.8;">
            <strong>${escapeHtml(req.contactName)}</strong> is looking for hangar space at
            <strong>${escapeHtml(req.airportCode)} (${escapeHtml(req.airportName)})</strong>,
            ${escapeHtml(req.city)}, ${escapeHtml(req.state)}<br/>
            ${details}
          </div>
          <a href="${requestUrl}" style="display:inline-block;padding:11px 26px;background:#1a3a5c;color:white;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">
            View this request
          </a>
          <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
            You're getting this because one of your active listings sits within 50 miles of this request.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
