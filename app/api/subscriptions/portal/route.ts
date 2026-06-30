/**
 * POST /api/subscriptions/portal
 *
 * Creates a Stripe Customer Portal session for the authenticated host
 * and returns its URL. The Portal lets the host:
 *   - Update card on file
 *   - Switch between Featured ↔ Pro
 *   - Cancel
 *   - Download invoices
 *
 * We don't build any of that UI ourselves — Stripe runs it. We just
 * provide the link from /dashboard/billing.
 *
 * The host needs an existing Stripe Customer ID, which means they must
 * have had at least one paid event with us (subscription or sponsorship).
 * If we don't have a customer for them yet, return 404 — the UI should
 * route them to /pricing instead.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export async function POST(_req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  const { data: sub } = await supabaseAdmin
    .from('host_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No subscription on file. Visit pricing to start one.' },
      { status: 404 },
    )
  }

  const stripe = getStripe()
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${SITE_URL}/dashboard/billing`,
    })
    return NextResponse.json({ url: portal.url })
  } catch (err) {
    console.error('[portal] Stripe error:', err)
    return NextResponse.json({ error: 'Could not open billing portal. Try again.' }, { status: 500 })
  }
}
