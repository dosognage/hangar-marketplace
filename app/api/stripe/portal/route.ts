import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

/**
 * POST /api/stripe/portal
 * Body: { listing_id: string }
 *
 * Looks up the stripe_customer_id on the listing and creates a Stripe
 * Customer Portal session, then returns { url }.
 */
export async function POST(req: NextRequest) {
  let listing_id: string | undefined
  try {
    const body = await req.json()
    listing_id = body.listing_id
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
  }

  // Look up the stripe_customer_id for this listing
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('stripe_customer_id')
    .eq('id', listing_id)
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (!listing.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found for this listing' }, { status: 404 })
  }

  try {
    const stripe = getStripe()
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: listing.stripe_customer_id,
      return_url: `${SITE_URL}/listing/${listing_id}`,
    })
    return NextResponse.json({ url: portalSession.url })
  } catch (err: unknown) {
    console.error('[portal] Stripe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Stripe error' },
      { status: 500 }
    )
  }
}
