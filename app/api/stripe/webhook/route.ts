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
      metadata?: { request_id?: string; is_priority?: string; type?: string }
      payment_status?: string
    }

    const { request_id, is_priority, type } = session.metadata ?? {}

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
