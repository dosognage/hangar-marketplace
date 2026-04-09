import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, newRequestAtAirportEmail } from '@/lib/email'

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
      const days = parseInt(duration_days ?? '30', 10)
      const sponsoredUntil = new Date(Date.now() + days * 86_400_000).toISOString()

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
      console.log(`[webhook] Listing ${listing_id} sponsored for ${days} days (until ${sponsoredUntil})`)
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
