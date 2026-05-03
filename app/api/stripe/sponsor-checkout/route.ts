import { NextRequest, NextResponse } from 'next/server'
import { getStripe, SPONSOR_TIERS } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/sponsor-checkout
 *
 * Body: { listing_id: string, duration_days: 7 | 30 | 90 }
 *
 * Creates a Stripe Checkout session for sponsored listing placement.
 * On success the webhook sets is_sponsored=true + sponsored_until.
 *
 * SECURITY: Caller must be authenticated AND own the listing OR be an
 * assigned broker on it. Without these checks any logged-in user could
 * create a checkout session targeting another user's listing — they'd
 * pay with their own card but the sponsorship would land on someone
 * else's listing (effectively gifting / vandalism vector).
 */
export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { listing_id, duration_days } = await req.json()

  if (!listing_id || !duration_days) {
    return NextResponse.json({ error: 'listing_id and duration_days are required' }, { status: 400 })
  }

  const tier = SPONSOR_TIERS.find(t => t.days === Number(duration_days))
  if (!tier) {
    return NextResponse.json({ error: 'Invalid duration. Choose 7, 30, or 90 days.' }, { status: 400 })
  }

  // Verify the listing exists, is approved, AND the caller is authorised
  // to sponsor it. Two paths permitted (mirrors the edit-listing rule):
  //   1. Caller IS the listing owner (user_id matches).
  //   2. Caller is the assigned broker (broker_profile_id matches the
  //      caller's broker_profile_id in user_metadata).
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_code, city, state, user_id, broker_profile_id')
    .eq('id', listing_id)
    .eq('status', 'approved')
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: 'Listing not found or not approved' }, { status: 404 })
  }

  const userBrokerProfileId = user.user_metadata?.broker_profile_id as string | undefined
  const isOwner          = listing.user_id === user.id
  const isAssignedBroker = !!userBrokerProfileId
                         && listing.broker_profile_id === userBrokerProfileId
  if (!isOwner && !isAssignedBroker) {
    return NextResponse.json(
      { error: 'You do not have permission to sponsor this listing.' },
      { status: 403 },
    )
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
            name: `Sponsored Listing at ${listing.airport_code} (${tier.label})`,
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
