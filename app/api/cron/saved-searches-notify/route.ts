import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/cron/saved-searches-notify
 *
 * Runs every hour via Vercel Cron.
 * For each saved search, finds listings created since last_notified_at
 * that match the criteria, and emails the subscriber.
 */

const RESEND_API   = 'https://api.resend.com/emails'
const FROM_ADDRESS = 'Hangar Marketplace <onboarding@resend.dev>'
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
  const { data: searches, error: searchErr } = await supabase
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('listings')
        .select('id, title, airport_name, airport_code, city, state, listing_type, asking_price, monthly_lease, square_feet')
        .eq('status', 'approved')
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(6)

      // Apply filters
      if (search.query) {
        const like = `%${search.query}%`
        q = q.or(`city.ilike.${like},state.ilike.${like},airport_name.ilike.${like},airport_code.ilike.${like}`)
      }
      if (search.listing_type) {
        q = q.eq('listing_type', search.listing_type)
      }
      if (search.max_price) {
        const priceCol = search.listing_type === 'lease' || search.listing_type === 'space'
          ? 'monthly_lease' : 'asking_price'
        q = q.lte(priceCol, search.max_price)
      }
      if (search.min_sqft) {
        q = q.gte('square_feet', search.min_sqft)
      }

      const { data: listings } = await q

      if (!listings?.length) continue // nothing new

      // Build email
      const unsubscribeUrl = `${SITE_URL}/api/saved-searches/unsubscribe?token=${search.notify_token}`
      const filterDesc = [
        search.query && `matching "${search.query}"`,
        search.listing_type && `(${search.listing_type})`,
        search.max_price && `under $${search.max_price.toLocaleString()}`,
        search.min_sqft && `${search.min_sqft.toLocaleString()}+ sq ft`,
      ].filter(Boolean).join(' ')

      const listingCards = listings.map((l: {
        id: string; title: string; airport_name: string; airport_code: string;
        city: string; state: string; listing_type: string;
        asking_price: number | null; monthly_lease: number | null; square_feet: number | null
      }) => {
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
            <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:2px;">${l.title}</div>
            <div style="font-size:13px;color:#6b7280;">${l.airport_code} · ${l.city}, ${l.state}${l.square_feet ? ` · ${l.square_feet.toLocaleString()} sq ft` : ''}</div>
          </a>`
      }).join('')

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
          <div style="background:#111827;padding:20px 28px;border-radius:8px 8px 0 0;">
            <h1 style="color:white;margin:0;font-size:20px;">✈️ New Hangars Available</h1>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:28px;background:#f9fafb;">
            <p style="margin:0 0 6px;font-size:15px;">
              We found <strong>${listings.length} new hangar${listings.length !== 1 ? 's' : ''}</strong>${filterDesc ? ` ${filterDesc}` : ''}:
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
          subject: `${listings.length} new hangar${listings.length !== 1 ? 's' : ''} match your alert${filterDesc ? ` — ${filterDesc}` : ''}`,
          html,
        }),
      })

      // Update last_notified_at so next run only picks up newer listings
      await supabase
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
