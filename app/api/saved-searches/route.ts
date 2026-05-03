import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/saved-searches — create a new saved search / alert subscription.
 *
 * Uses supabaseAdmin (service role) because the saved_searches table has
 * no public RLS policies — keeping it locked down means an attacker can't
 * scrape the entire alert list (which contains every subscriber's email
 * and search criteria). Anonymous subscriptions are still allowed via
 * this endpoint; we just gate the DB write through our own validation.
 */
export async function POST(req: NextRequest) {
  let body: {
    email: string
    query?: string
    listingType?: string
    maxPrice?: string
    minSqft?: string
  }

  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { email, query, listingType, maxPrice, minSqft } = body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('saved_searches').insert({
    email,
    query:        query?.trim()       || null,
    listing_type: listingType?.trim() || null,
    max_price:    maxPrice  ? parseInt(maxPrice)  : null,
    min_sqft:     minSqft   ? parseInt(minSqft)   : null,
    // seed last_notified_at to now so we don't re-send existing listings
    last_notified_at: new Date().toISOString(),
  })

  if (error) {
    console.error('saved_searches insert error:', error.message)
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
