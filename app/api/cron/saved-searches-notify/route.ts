import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { pushToUser } from '@/lib/push'
import { likeEscape, pgrstQuote } from '@/lib/airportSearch'
import {
  ALERT_LISTING_COLUMNS,
  acceptedListingTypes,
  describeSearch,
  listingMatchesSearch,
  priceColumn,
  queryStateValues,
  requiredAmenities,
  searchPoint,
  searchQuery,
  type AlertListing,
  type SavedSearchFilters,
} from '@/lib/savedSearchMatch'

// Listings shown per alert email (newest first).
const MAX_PER_ALERT = 6
// Candidates fetched when the radius or amenity filters, which only the
// JS matcher applies, are set.
const OVERFETCH = 50

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * GET /api/cron/saved-searches-notify
 *
 * Runs every hour via Vercel Cron.
 * For each saved search, finds listings created since last_notified_at
 * that match the criteria, and emails the subscriber. Matching rules live
 * in lib/savedSearchMatch.ts: SQL narrows the candidates, then
 * listingMatchesSearch decides (it alone applies radius and amenities).
 *
 * Uses supabaseAdmin throughout — saved_searches has no public RLS
 * policies (intentionally locked down so the alert list can't be
 * scraped), so an anon client would silently see zero rows.
 */

const RESEND_API   = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Hangar Marketplace <notify@hangarmarketplace.com>'
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const TEST_TO      = process.env.RESEND_TEST_TO

export async function GET(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No RESEND_API_KEY' }, { status: 500 })

  // Fetch all saved searches
  const { data: searches, error: searchErr } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .order('created_at', { ascending: true })

  if (searchErr || !searches?.length) {
    return NextResponse.json({ sent: 0, message: 'No saved searches' })
  }

  let sent = 0

  for (const search of searches) {
    try {
      // Build query for new listings since last notified
      const since = search.last_notified_at ?? search.created_at

      const filters = search as SavedSearchFilters
      const jsOnly  = searchPoint(filters) != null || requiredAmenities(filters).length > 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabaseAdmin
        .from('listings')
        .select(ALERT_LISTING_COLUMNS)
        .eq('status', 'approved')
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(jsOnly ? OVERFETCH : MAX_PER_ALERT)

      // Apply filters
      const text = searchQuery(filters)
      if (text) {
        const states = queryStateValues(filters)
        if (states) {
          // A state ("WA", "Washington") matches the listing's state only,
          // not every city or airport name containing "wa". No wildcards,
          // so ilike is a case-insensitive equals.
          q = q.or(states.map(v => `state.ilike.${pgrstQuote(likeEscape(v))}`).join(','))
        } else {
          // Quoted: a query like "Eastsound, WA" has a comma, which is a
          // separator in or() and used to make this whole search error out.
          const like = pgrstQuote(`%${likeEscape(text)}%`)
          q = q.or(`city.ilike.${like},state.ilike.${like},airport_name.ilike.${like},airport_code.ilike.${like}`)
        }
      }
      const types = acceptedListingTypes(filters)
      if (types) q = q.in('listing_type', types)
      if (search.property_type) q = q.eq('property_type', search.property_type)
      const priceCol = priceColumn(filters)
      if (search.min_price) q = q.gte(priceCol, search.min_price)
      if (search.max_price) q = q.lte(priceCol, search.max_price)
      if (search.min_sqft) {
        q = q.gte('square_feet', search.min_sqft)
      }

      const { data: candidates, error: listErr } = await q
      if (listErr) {
        console.error('[saved-searches-notify] listing query failed', search.id, listErr.message)
        continue
      }

      // The full match (radius, amenities and everything above), newest first.
      const listings = ((candidates ?? []) as AlertListing[])
        .filter(l => listingMatchesSearch(l, filters))
        .slice(0, MAX_PER_ALERT)

      if (!listings.length) continue // nothing new

      // Build email
      const unsubscribeUrl = `${SITE_URL}/api/saved-searches/unsubscribe?token=${search.notify_token}`
      const filterDesc = describeSearch(filters)

      const listingCards = listings.map(l => {
        const price = l.asking_price
          ? `$${l.asking_price.toLocaleString()}`
          : l.monthly_lease
            ? `$${l.monthly_lease.toLocaleString()}/mo`
            : 'Contact for price'
        const badge = l.listing_type === 'sale' ? '#dbeafe' : l.listing_type === 'space' ? '#fef3c7' : '#dcfce7'
        const badgeText = l.listing_type === 'sale' ? '#1e40af' : l.listing_type === 'space' ? '#92400e' : '#166534'
        const label = l.listing_type === 'sale' ? 'For Sale' : l.listing_type === 'space' ? 'Space Available' : 'For Lease'

        return `
          <a href="${SITE_URL}/listing/${l.id}" style="display:block;text-decoration:none;color:inherit;
            border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;
            background:white;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
              <strong style="font-size:15px;color:#111827;">${price}</strong>
              <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;
                background:${badge};color:${badgeText};">${label}</span>
            </div>
            <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:2px;">${escapeHtml(l.title)}</div>
            <div style="font-size:13px;color:#6b7280;">${escapeHtml(l.airport_code ?? '')} · ${escapeHtml(l.city ?? '')}, ${escapeHtml(l.state ?? '')}${l.square_feet ? ` · ${l.square_feet.toLocaleString()} sq ft` : ''}</div>
          </a>`
      }).join('')

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
          <div style="background:#111827;padding:20px 28px;border-radius:8px 8px 0 0;">
            <h1 style="color:white;margin:0;font-size:20px;">✈️ New Hangars Available</h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px;background:#f9fafb;">
            <p style="margin:0 0 6px;font-size:15px;">
              We found <strong>${listings.length} new hangar${listings.length !== 1 ? 's' : ''}</strong>${filterDesc ? ` ${escapeHtml(filterDesc)}` : ''}:
            </p>
            <div style="margin-top:20px;">
              ${listingCards}
            </div>
            <div style="margin-top:20px;text-align:center;">
              <a href="${SITE_URL}${search.query || search.listing_type ? `/?q=${encodeURIComponent(search.query ?? '')}&type=${encodeURIComponent(search.listing_type ?? '')}` : ''}"
                style="display:inline-block;background:#111827;color:white;padding:12px 28px;
                  border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
                Browse all hangars →
              </a>
            </div>
            <p style="margin-top:28px;font-size:12px;color:#9ca3af;text-align:center;">
              You subscribed to these alerts on Hangar Marketplace.<br>
              <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
            </p>
          </div>
        </div>`

      const recipient = TEST_TO ?? search.email
      await fetch(RESEND_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [recipient],
          subject: `${listings.length} new hangar${listings.length !== 1 ? 's' : ''} match your alert${filterDesc ? `: ${filterDesc}` : ''}`,
          html,
        }),
      })

      // Push too, for alerts made by a signed-in user with the app.
      if (search.user_id) {
        await pushToUser(search.user_id, 'listings', {
          title: `${listings.length} new listing${listings.length !== 1 ? 's' : ''} match your alert`,
          body:  listings.map(l => `${l.title} (${l.airport_code})`).join(', '),
          data:  listings.length === 1
            ? { type: 'listing', listingId: listings[0].id }
            : { type: 'search', query: search.query ?? '' },
        })
      }

      // Update last_notified_at so next run only picks up newer listings
      await supabaseAdmin
        .from('saved_searches')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', search.id)

      sent++
    } catch (err) {
      console.error('Error processing saved search', search.id, err)
    }
  }

  return NextResponse.json({ sent, total: searches.length })
}
