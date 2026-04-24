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
import { sendEmail, modernLayout } from './email'
import { createNotification } from './notifications'

const RADIUS_MILES   = 50
const FROM_ADDRESS   = 'Hangar Marketplace <hello@hangarmarketplace.com>'
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const PHOTO_BUCKET   = 'listing-photos'

// Public URL for a stored listing photo.
function buildPhotoUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${storagePath}`
}

// Canonical amenity key → display label. Must stay in sync with the submit
// and edit forms. If a new key arrives we fall back to a tidy title-case.
const AMENITY_LABELS: Record<string, string> = {
  heat:             'Heat',
  power:            'Power',
  water:            'Water',
  air_conditioning: 'Air conditioning',
  bathroom:         'Bathroom',
  wifi:             'WiFi',
  fuel_nearby:      'Fuel nearby',
  floor_drain:      'Floor drain',
  compressed_air:   'Compressed air',
  office_space:     'Office space',
  loft_storage:     'Loft storage',
  security_system:  'Security system',
}

function labelAmenity(key: string): string {
  return AMENITY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatTypeLabel(listingType: string | null): string {
  return listingType === 'sale'  ? 'For Sale'
       : listingType === 'space' ? 'Space Available'
       :                            'For Lease'
}

function formatPriceLabel(
  listingType: string | null,
  askingPrice: number | null,
  monthlyLease: number | null,
): string {
  if (listingType === 'sale') {
    return askingPrice ? `$${askingPrice.toLocaleString()}` : 'Contact for price'
  }
  return monthlyLease ? `$${monthlyLease.toLocaleString()}/mo` : 'Contact for rate'
}

type UserPrefRow = {
  user_id:          string
  home_airport_code: string | null
  home_airport_lat:  number | null
  home_airport_lng:  number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// New listing → nearby buyers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal payload the dispatcher needs. We previously passed all the listing
 * fields from the caller but it bloated every call site; now the caller just
 * hands off the listing id and we fetch everything (including the hero photo)
 * in one query.
 */
export async function notifyBuyersOfNewListing(arg: string | { id: string }): Promise<void> {
  const listingId = typeof arg === 'string' ? arg : arg.id

  // Pull every field the email might want plus the first photo in display order.
  const { data: listing, error: listErr } = await supabaseAdmin
    .from('listings')
    .select(`
      id, title, property_type, listing_type,
      airport_code, airport_name, city, state,
      latitude, longitude,
      asking_price, monthly_lease, hoa_monthly, annual_property_tax,
      square_feet, door_width, door_height, hangar_depth,
      bedrooms, bathrooms, home_sqft, lot_acres,
      amenities, description,
      listing_photos ( storage_path, display_order )
    `)
    .eq('id', listingId)
    .single()

  if (listErr || !listing) {
    console.error('[listingAlerts] listing fetch failed:', listErr?.message)
    return
  }
  if (listing.latitude == null || listing.longitude == null) return

  // Pick the cover photo. Supabase puts listing_photos in whatever order the
  // inner select chose, so sort by display_order defensively.
  type PhotoRow = { storage_path: string; display_order: number | null }
  const photos = (Array.isArray(listing.listing_photos) ? listing.listing_photos : []) as PhotoRow[]
  const sorted = [...photos].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
  const heroPath = sorted[0]?.storage_path ?? null
  const heroUrl  = heroPath ? buildPhotoUrl(heroPath) : null

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

  type NearbyPref = UserPrefRow & { distanceMi: number }
  const nearby: NearbyPref[] = []
  for (const pref of (prefs as UserPrefRow[])) {
    if (pref.home_airport_lat == null || pref.home_airport_lng == null) continue
    const miles = distanceMiles(
      { lat: listing.latitude,         lng: listing.longitude },
      { lat: pref.home_airport_lat,    lng: pref.home_airport_lng },
    )
    if (miles <= RADIUS_MILES) nearby.push({ ...pref, distanceMi: miles })
  }

  if (nearby.length === 0) return

  // Resolve emails via admin.listUsers — we keep the list small (one page per
  // 1000 users is plenty at current scale).
  const emailsByUserId = await resolveUserEmails(nearby.map(p => p.user_id))

  const priceLabel = formatPriceLabel(listing.listing_type, listing.asking_price, listing.monthly_lease)
  const typeLabel  = formatTypeLabel(listing.listing_type)
  const listingUrl = `${SITE_URL}/listing/${listing.id}`

  await Promise.all(nearby.map(async pref => {
    const email = emailsByUserId.get(pref.user_id)

    // In-app bell always (we have a user id).
    void createNotification({
      userId: pref.user_id,
      type:   'inquiry',
      title:  `New ${typeLabel.toLowerCase()} listing near ${pref.home_airport_code ?? 'your airport'}`,
      body:   `${listing.title} at ${listing.airport_code}. ${priceLabel}.`,
      link:   `/listing/${listing.id}`,
    }).catch(e => console.error('[listingAlerts] notification insert failed:', e))

    if (!email) return  // email not resolvable — in-app only

    await sendEmail({
      to:      email,
      from:    FROM_ADDRESS,
      subject: `New ${typeLabel.toLowerCase()} listing near ${pref.home_airport_code ?? 'your area'}: ${listing.title}`,
      html:    renderNewListingEmail({
        homeAirport: pref.home_airport_code ?? '',
        distanceMi:  pref.distanceMi,
        typeLabel,
        priceLabel,
        listingUrl,
        heroUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listing:     listing as any,
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

type EmailListing = {
  id:                  string
  title:               string
  property_type:       string | null
  listing_type:        string | null
  airport_code:        string
  airport_name:        string
  city:                string | null
  state:               string | null
  asking_price:        number | null
  monthly_lease:       number | null
  hoa_monthly:         number | null
  annual_property_tax: number | null
  square_feet:         number | null
  door_width:          number | null
  door_height:         number | null
  hangar_depth:        number | null
  bedrooms:            number | null
  bathrooms:           number | null
  home_sqft:           number | null
  lot_acres:           number | null
  amenities:           string[] | null
  description:         string | null
}

/**
 * Build the spec rows for the listing card. Only rows with a value get
 * rendered so hangars, homes, and land all look natural without a bunch of
 * empty slots.
 */
function buildSpecRows(listing: EmailListing): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  const isHangar = !listing.property_type || listing.property_type === 'hangar'
  const isHome   = listing.property_type === 'airport_home' || listing.property_type === 'fly_in_community'

  if (isHangar) {
    if (listing.square_feet)  rows.push({ label: 'Square feet',  value: listing.square_feet.toLocaleString() })
    if (listing.door_width)   rows.push({ label: 'Door width',   value: `${listing.door_width} ft` })
    if (listing.door_height)  rows.push({ label: 'Door height',  value: `${listing.door_height} ft` })
    if (listing.hangar_depth) rows.push({ label: 'Depth',        value: `${listing.hangar_depth} ft` })
  }
  if (isHome) {
    if (listing.bedrooms)  rows.push({ label: 'Bedrooms',  value: String(listing.bedrooms) })
    if (listing.bathrooms) rows.push({ label: 'Bathrooms', value: String(listing.bathrooms) })
    if (listing.home_sqft) rows.push({ label: 'Home sq ft', value: listing.home_sqft.toLocaleString() })
  }
  if (listing.lot_acres) rows.push({ label: 'Lot size', value: `${listing.lot_acres} acres` })
  if (listing.hoa_monthly != null)
    rows.push({ label: 'HOA', value: listing.hoa_monthly === 0 ? 'No HOA' : `$${listing.hoa_monthly.toLocaleString()} / mo` })
  if (listing.annual_property_tax != null)
    rows.push({ label: 'Property tax', value: listing.annual_property_tax === 0 ? 'No property tax' : `$${listing.annual_property_tax.toLocaleString()} / yr` })

  return rows
}

function renderNewListingEmail(opts: {
  homeAirport: string
  distanceMi:  number
  typeLabel:   string
  listing:     EmailListing
  priceLabel:  string
  listingUrl:  string
  heroUrl:     string | null
}): string {
  const { homeAirport, distanceMi, typeLabel, listing, priceLabel, listingUrl, heroUrl } = opts

  const roundedDistance = distanceMi < 1
    ? 'less than 1 mile'
    : `${Math.round(distanceMi)} miles`

  const location    = [listing.city, listing.state].filter(Boolean).join(', ')
  const specs       = buildSpecRows(listing)
  const amenityKeys = Array.isArray(listing.amenities) ? listing.amenities : []
  const descriptionPreview = (listing.description ?? '').trim().slice(0, 260)

  // Headline section: type chip + title + location line + price/distance strip.
  const headlineSection = `
    <span style="display:inline-block;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700;
                 padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.05em;">
      ${escapeHtml(typeLabel)}
    </span>
    <p style="margin:12px 0 4px;color:#64748b;font-size:14px;">
      ${escapeHtml(listing.airport_name)} · ${escapeHtml(listing.airport_code)}${location ? ` · ${escapeHtml(location)}` : ''}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      <tr>
        <td style="padding:14px 18px;border-right:1px solid #e2e8f0;">
          <p style="margin:0 0 2px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Price</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(priceLabel)}</p>
        </td>
        <td style="padding:14px 18px;">
          <p style="margin:0 0 2px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Distance</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(roundedDistance)}</p>
        </td>
      </tr>
    </table>`

  const specsSection = specs.length === 0 ? null : {
    title: 'Property details',
    html: `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${specs.map((row, i) => `
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#64748b;${i === specs.length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;'}">${escapeHtml(row.label)}</td>
            <td align="right" style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;${i === specs.length - 1 ? '' : 'border-bottom:1px solid #f1f5f9;'}">${escapeHtml(row.value)}</td>
          </tr>`).join('')}
      </table>`,
  }

  const amenitiesSection = amenityKeys.length === 0 ? null : {
    title: 'Amenities',
    html: `
      <div style="font-size:0;line-height:0;">
        ${amenityKeys.map(k => `
          <span style="display:inline-block;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:600;
                       padding:6px 11px;border-radius:999px;margin:0 6px 6px 0;line-height:1.3;">
            ${escapeHtml(labelAmenity(k))}
          </span>`).join('')}
      </div>`,
  }

  const descriptionSection = !descriptionPreview ? null : {
    title: 'From the seller',
    html: `
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
        ${escapeHtml(descriptionPreview)}${listing.description && listing.description.length > 260 ? '…' : ''}
      </p>`,
  }

  const sections = [
    { html: headlineSection },
    specsSection,
    amenitiesSection,
    descriptionSection,
  ].filter((s): s is { title?: string; html: string } => !!s)

  return modernLayout({
    preheader: `${listing.title} · ${priceLabel} · ${roundedDistance} from ${homeAirport || 'your area'}.`,
    eyebrow:   homeAirport ? `Near ${homeAirport}` : 'Near you',
    title:     listing.title,
    heroUrl,
    heroCaption: heroUrl ? undefined : listing.airport_code,
    heroGradient: 'linear-gradient(135deg,#1a3a5c 0%,#2563eb 60%,#60a5fa 100%)',
    sections,
    cta: {
      label: 'View the full listing',
      href:  listingUrl,
      hint:  'Photos, map location, and direct contact with the seller.',
    },
    footerIntro: homeAirport
      ? `You're getting this because ${escapeHtml(homeAirport)} is set as your home airport on Hangar Marketplace, and this listing sits within 50 miles of it.`
      : `You're getting this because a home airport is set on your Hangar Marketplace account, and this listing sits within 50 miles of it.`,
    footerLinks: [
      { label: 'Change home airport', href: `${SITE_URL}/settings` },
      { label: 'Turn off alerts',     href: `${SITE_URL}/settings` },
      { label: 'Contact us',          href: 'mailto:hello@hangarmarketplace.com' },
    ],
  })
}

function renderNewRequestEmail(opts: {
  ownerListingTitle: string
  ownerAirport:      string
  req:               NewRequestPayload
  details:           string
  requestUrl:        string
}): string {
  const { ownerListingTitle, ownerAirport, req, details, requestUrl } = opts
  return modernLayout({
    preheader: `${req.contactName} is looking for hangar space at ${req.airportName}. Your listing ${ownerListingTitle} is within 50 miles.`,
    eyebrow:   `Near ${ownerAirport}`,
    title:     `Pilot looking for space near ${req.airportCode}`,
    subtitle:  `A buyer just posted a request within 50 miles of your listing ${ownerListingTitle} at ${ownerAirport}.`,
    heroCaption: req.airportCode,
    heroGradient: 'linear-gradient(135deg,#1a3a5c 0%,#2563eb 60%,#60a5fa 100%)',
    sections: [{
      title: 'The request',
      html: `
        <p style="margin:0 0 10px;font-size:14px;color:#0f172a;line-height:1.7;">
          <strong>${escapeHtml(req.contactName)}</strong> is looking for hangar space at
          <strong>${escapeHtml(req.airportCode)} (${escapeHtml(req.airportName)})</strong>,
          ${escapeHtml(req.city)}, ${escapeHtml(req.state)}.
        </p>
        ${details ? `<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${details}</p>` : ''}`,
    }, {
      title: 'Why you',
      html: `
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
          Your active listing <strong>${escapeHtml(ownerListingTitle)}</strong> sits within 50 miles of this request. If the space could work, reply through the request page.
        </p>`,
    }],
    cta: {
      label: 'View this request',
      href:  requestUrl,
    },
    footerIntro: `You're getting this because one of your active listings sits within 50 miles of this buyer's request.`,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
