import { NextRequest, NextResponse } from 'next/server'
import { getStripe, SPONSOR_TIERS } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/sponsor-checkout
 *
 * Body: { listing_id: string, duration_days: 7 | 30 | 90 }
 *
 * Creates a Stripe Checkout session for sponsored listing placement.
 * On success the webhook sets is_sponsored=true + sponsored_until.
 */
export async function POST(req: NextRequest) {
  const { listing_id, duration_days } = await req.json()

  if (!listing_id || !duration_days) {
    return NextResponse.json({ error: 'listing_id and duration_days are required' }, { status: 400 })
  }

  const tier = SPONSOR_TIERS.find(t => t.days === Number(duration_days))
  if (!tier) {
    return NextResponse.json({ error: 'Invalid duration. Choose 7, 30, or 90 days.' }, { status: 400 })
  }

  // Verify the listing exists and is approved
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_code, city, state')
    .eq('id', listing_id)
    .eq('status', 'approved')
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: 'Listing not found or not approved' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.hangarmarketplace.com'

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tier.cents,
          product_data: {
            name: `Sponsored Listing — ${listing.airport_code} (${tier.label})`,
            description: `"${listing.title}" will be pinned to the top of browse results for viewers in the ${listing.city}, ${listing.state} area for ${tier.label}.`,
          },
        },
      },
    ],
    metadata: {
      listing_id,
      duration_days: String(tier.days),
      type: 'listing_sponsor',
    },
    success_url: `${baseUrl}/listing/${listing_id}?sponsored=1`,
    cancel_url:  `${baseUrl}/listing/${listing_id}?sponsor_cancelled=1`,
  })

  return NextResponse.json({ url: session.url })
}
