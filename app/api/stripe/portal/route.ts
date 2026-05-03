import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveBrokerProfileId } from '@/lib/auth-broker'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

/**
 * POST /api/stripe/portal
 * Body: { listing_id: string }
 *
 * Looks up the stripe_customer_id on the listing and creates a Stripe
 * Customer Portal session, then returns { url }.
 *
 * SECURITY: Caller must be authenticated AND own the listing OR be the
 * assigned broker. Without this, any logged-in user could open another
 * user's billing portal — read their saved cards, cancel their
 * subscriptions, request refunds. Critical fix.
 */
export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

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

  // Look up the listing AND verify ownership in one query.
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('stripe_customer_id, user_id, broker_profile_id')
    .eq('id', listing_id)
    .single()

  if (error || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Authorisation: owner OR assigned broker.
  // SECURITY: never trust user_metadata.broker_profile_id — it's
  // editable by end users. Always resolve from broker_profiles by user.id.
  const userBrokerProfileId = await resolveBrokerProfileId(user)
  const isOwner          = listing.user_id === user.id
  const isAssignedBroker = !!userBrokerProfileId
                         && listing.broker_profile_id === userBrokerProfileId
  if (!isOwner && !isAssignedBroker) {
    return NextResponse.json(
      { error: 'You do not have permission to manage billing for this listing.' },
      { status: 403 },
    )
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
