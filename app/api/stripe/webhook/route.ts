import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe, SPONSOR_TIERS, HOST_TIERS, type HostTier } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, newRequestAtAirportEmail } from '@/lib/email'

/**
 * Allowed sponsorship durations, derived from the canonical tier list.
 * The webhook re-validates `duration_days` against this set even though
 * the only writer today (sponsor-checkout) already validates — defence in
 * depth so a future endpoint, admin mistake, or compromised path can't
 * stamp `duration_days: 9999999` and hand out a 27,000-year sponsorship.
 */
const ALLOWED_SPONSOR_DAYS: ReadonlySet<number> = new Set(
  SPONSOR_TIERS.map(t => t.days),
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: unknown) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: `Webhook error: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 }
    )
  }

  // L2: idempotency dedup. Stripe occasionally redelivers events (network
  // retries, our intermittent 5xx, etc). The handler logic is idempotent
  // today, but recording event IDs guarantees that — INSERT ... ON CONFLICT
  // DO NOTHING returns 0 rows when the event has already been processed,
  // and we early-return 200 so Stripe stops retrying. See migration
  // add_stripe_webhook_event_idempotency for the table + retention cron.
  const { error: dedupError, count } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type }, { count: 'exact' })
    .select()
    .single()
    .then(
      r => ({ error: r.error, count: r.error ? 0 : 1 }),
      // Insert with ON CONFLICT-style behaviour via try/catch — Supabase's
      // PostgrestError code 23505 is the unique-violation we want.
      err => ({ error: err, count: 0 }),
    )

  if (dedupError) {
    const code = (dedupError as { code?: string }).code
    if (code === '23505') {
      // Already processed — return 200 so Stripe stops retrying.
      console.log(`[webhook] duplicate event ${event.id} (${event.type}) — skipping`)
      return NextResponse.json({ received: true, deduped: true })
    }
    // Any other DB error: log and proceed. We'd rather double-process than
    // drop a real event due to a transient DB hiccup. Idempotent handler
    // logic is the second line of defence.
    console.error('[webhook] dedup table insert failed (continuing):', dedupError)
  }
  void count

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      metadata?: {
        request_id?: string
        is_priority?: string
        type?: string
        listing_id?: string
        duration_days?: string
        // Host subscription mode metadata
        user_id?: string
        tier?: string
      }
      payment_status?: string
      customer?: string | null
    }

    const { request_id, is_priority, type, listing_id, duration_days } = session.metadata ?? {}
    const stripeCustomerId = session.customer ?? null

    // ── Listing sponsorship ──────────────────────────────────────────────────
    if (type === 'listing_sponsor' && listing_id && session.payment_status === 'paid') {
      // Validate `duration_days` against the canonical tier set. Anything
      // missing, non-numeric, or outside the allowed values gets rejected
      // with 400 — Stripe will retry, but the deterministic failure is
      // intentional. An attacker who somehow controlled this metadata
      // (today they can't, but defence in depth) would otherwise get
      // unbounded sponsorship duration.
      const parsedDays = Number(duration_days)
      if (!Number.isInteger(parsedDays) || !ALLOWED_SPONSOR_DAYS.has(parsedDays)) {
        console.error(
          `[webhook] Rejecting listing_sponsor — invalid duration_days=${duration_days} ` +
          `(allowed: ${[...ALLOWED_SPONSOR_DAYS].join(', ')})`
        )
        return NextResponse.json(
          { error: 'Invalid duration_days in metadata' },
          { status: 400 },
        )
      }

      const sponsoredUntil = new Date(Date.now() + parsedDays * 86_400_000).toISOString()

      const { error: sponsorError } = await supabaseAdmin
        .from('listings')
        .update({
          is_sponsored: true,
          sponsored_until: sponsoredUntil,
          ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
        })
        .eq('id', listing_id)

      if (sponsorError) {
        console.error('[webhook] Failed to activate sponsorship:', sponsorError.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      console.log(`[webhook] Listing ${listing_id} sponsored for ${parsedDays} days (until ${sponsoredUntil})`)
    }

    // ── Listing fee payment ──────────────────────────────────────────────────
    if (type === 'listing_fee' && listing_id && session.payment_status === 'paid') {
      const { error: feeError } = await supabaseAdmin
        .from('listings')
        .update({
          listing_fee_paid: true,
          status: 'pending',  // move from pending_payment → pending (awaiting admin review)
        })
        .eq('id', listing_id)
        .eq('status', 'pending_payment')

      if (feeError) {
        console.error('[webhook] Failed to activate listing after fee payment:', feeError.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      console.log(`[webhook] Listing ${listing_id} fee paid — moved to pending review`)
    }

    // ── Host tier subscription created ─────────────────────────────────────
    // checkout.session.completed for a subscription-mode session.
    // We've stashed metadata.type='host_subscription' + metadata.user_id +
    // metadata.tier on the session. Stripe also gives us subscription +
    // customer IDs on the session object for mode='subscription'.
    if (type === 'host_subscription' && session.payment_status !== 'unpaid') {
      const userId  = session.metadata?.user_id as string | undefined
      const tier    = session.metadata?.tier    as HostTier | undefined
      const subId   = (session as unknown as { subscription?: string }).subscription
      const custId  = stripeCustomerId

      if (!userId || !tier || !subId || !custId) {
        console.error(`[webhook] host_subscription missing fields — user=${userId} tier=${tier} sub=${subId} cust=${custId}`)
        return NextResponse.json({ error: 'Invalid host_subscription metadata' }, { status: 400 })
      }
      if (!HOST_TIERS[tier]) {
        console.error(`[webhook] host_subscription invalid tier=${tier}`)
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      }

      // Fetch the subscription to get current_period_end. The checkout
      // session itself doesn't include the period boundary.
      const stripe = getStripe()
      const subscription = await stripe.subscriptions.retrieve(subId)
      const periodEndIso = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()

      const { error: upsertError } = await supabaseAdmin
        .from('host_subscriptions')
        .upsert({
          user_id:                userId,
          tier,
          status:                 'active',
          stripe_customer_id:     custId,
          stripe_subscription_id: subId,
          current_period_end:     periodEndIso,
        }, { onConflict: 'user_id' })

      if (upsertError) {
        console.error('[webhook] host_subscription upsert failed:', upsertError.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      console.log(`[webhook] Host ${userId} subscribed to ${tier} (sub=${subId}, ends=${periodEndIso})`)
    }

    // ── Hangar request activation ────────────────────────────────────────────
    if (type === 'hangar_request' && request_id && session.payment_status === 'paid') {
      // ── Activate the request ─────────────────────────────────────────────
      const { data: updatedRequest, error } = await supabaseAdmin
        .from('hangar_requests')
        .update({
          status: 'active',
          is_priority: is_priority === 'true',
        })
        .eq('id', request_id)
        .eq('status', 'pending_payment')
        .select('id, contact_name, contact_email, airport_code, airport_name, aircraft_type, wingspan_ft, monthly_budget, duration, move_in_date')
        .single()

      if (error) {
        console.error('[webhook] Failed to activate request:', error.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }

      console.log(`[webhook] Request ${request_id} activated (priority: ${is_priority})`)

      // ── Notify owners with listings at the same airport ──────────────────
      if (updatedRequest?.airport_code) {
        const { data: matchingListings } = await supabaseAdmin
          .from('listings')
          .select('contact_name, contact_email, title')
          .eq('airport_code', updatedRequest.airport_code)
          .eq('status', 'approved')

        if (matchingListings && matchingListings.length > 0) {
          for (const listing of matchingListings) {
            const { subject, html } = newRequestAtAirportEmail({
              ownerName:        listing.contact_name,
              ownerListingTitle: listing.title,
              airportCode:      updatedRequest.airport_code,
              airportName:      updatedRequest.airport_name ?? updatedRequest.airport_code,
              seekerName:       updatedRequest.contact_name,
              aircraftType:     updatedRequest.aircraft_type,
              wingspan:         updatedRequest.wingspan_ft,
              budget:           updatedRequest.monthly_budget,
              duration:         updatedRequest.duration,
              moveInDate:       updatedRequest.move_in_date,
              requestId:        updatedRequest.id,
            })
            await sendEmail({ to: listing.contact_email, subject, html }).catch(e =>
              console.error('[webhook] owner alert failed:', e)
            )
          }
          console.log(`[webhook] Notified ${matchingListings.length} owners at ${updatedRequest.airport_code}`)
        }
      }
    }
  }

  // ── Subscription lifecycle events ──────────────────────────────────────
  // These fire AFTER the initial checkout.session.completed and cover
  // ongoing state: tier swaps via Customer Portal, cancellations,
  // payment failures, successful renewals.
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const priceId = sub.items.data[0]?.price.id
    const newTier: HostTier | null =
      priceId === process.env.STRIPE_PRICE_PRO      ? 'pro'
      : priceId === process.env.STRIPE_PRICE_FEATURED ? 'featured'
      : null

    if (!newTier) {
      console.warn(`[webhook] subscription.updated ${sub.id}: price ${priceId} maps to no known tier — skipping`)
      return NextResponse.json({ received: true })
    }

    // status semantics — Stripe statuses: active, past_due, unpaid,
    // canceled, incomplete, trialing. We map:
    //   active / trialing → 'active'
    //   past_due / unpaid → 'grace_period' (14d enforced via cron, not Stripe)
    //   canceled          → 'cancelled'
    const ourStatus =
      sub.status === 'active' || sub.status === 'trialing' ? 'active'
      : sub.status === 'canceled'                          ? 'cancelled'
      : sub.status === 'past_due' || sub.status === 'unpaid' ? 'grace_period'
      : 'active'

    const { error } = await supabaseAdmin
      .from('host_subscriptions')
      .update({
        tier:                ourStatus === 'cancelled' ? 'free' : newTier,
        status:              ourStatus,
        current_period_end:  new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', sub.id)

    if (error) {
      console.error('[webhook] subscription.updated DB update failed:', error.message)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }
    console.log(`[webhook] Subscription ${sub.id} updated → tier=${newTier} status=${ourStatus}`)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const { error } = await supabaseAdmin
      .from('host_subscriptions')
      .update({
        tier:    'free',
        status:  'cancelled',
      })
      .eq('stripe_subscription_id', sub.id)
    if (error) {
      console.error('[webhook] subscription.deleted DB update failed:', error.message)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }
    console.log(`[webhook] Subscription ${sub.id} deleted — downgraded host to free`)
  }

  // Payment failure → 14-day grace period. The cron job
  // (sweep_host_subscriptions_grace_period) downgrades to free after the
  // window expires if no successful renewal arrives.
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const subId = (invoice as unknown as { subscription?: string }).subscription
    if (!subId) return NextResponse.json({ received: true })

    const graceEnd = new Date(Date.now() + 14 * 86_400_000).toISOString()
    const { error } = await supabaseAdmin
      .from('host_subscriptions')
      .update({
        status:              'grace_period',
        current_period_end:  graceEnd,
      })
      .eq('stripe_subscription_id', subId)
    if (error) {
      console.error('[webhook] payment_failed DB update failed:', error.message)
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }
    console.log(`[webhook] Subscription ${subId} payment failed — grace until ${graceEnd}`)
  }

  // Successful renewal payment — clear grace_period, reset active.
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    const subId = (invoice as unknown as { subscription?: string }).subscription
    if (!subId) return NextResponse.json({ received: true })

    const { error } = await supabaseAdmin
      .from('host_subscriptions')
      .update({ status: 'active' })
      .eq('stripe_subscription_id', subId)
      .neq('status', 'cancelled')   // don't accidentally revive cancelled subs
    if (error) {
      console.error('[webhook] payment_succeeded DB update failed:', error.message)
      // Non-fatal — the next subscription.updated will reconcile.
    }
  }

  return NextResponse.json({ received: true })
}
