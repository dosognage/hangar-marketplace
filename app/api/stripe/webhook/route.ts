import { NextRequest, NextResponse } from 'next/server'
import { getStripe, SPONSOR_TIERS } from '@/lib/stripe'
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

  return NextResponse.json({ received: true })
}
