import { NextRequest, NextResponse } from 'next/server'
import { getStripe, REQUEST_STANDARD_CENTS, REQUEST_PRIORITY_CENTS } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/stripe/checkout
 * Body: { request_id: string, is_priority?: boolean }
 *
 * Creates a Stripe Checkout session for a hangar request publication fee.
 * On success the webhook flips status to 'open'/'active' and the request
 * appears on the public board.
 *
 * SECURITY: Caller must be authenticated AND own the hangar_request.
 * Without this any logged-in user could pay to publish another user's
 * pending request — a "gifting" / vandalism vector identical to C1 on
 * the sponsor-checkout endpoint. Critical fix.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { request_id, is_priority } = await req.json()
    if (!request_id) {
      return NextResponse.json({ error: 'Missing request_id' }, { status: 400 })
    }

    // Verify the request exists, is awaiting payment, AND belongs to caller.
    const { data: request, error } = await supabaseAdmin
      .from('hangar_requests')
      .select('id, user_id, contact_email, airport_code, aircraft_type, status')
      .eq('id', request_id)
      .single()

    if (error || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Authorisation: only the request's creator can pay for it.
    if (request.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to pay for this request.' },
        { status: 403 },
      )
    }

    if (request.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Request is not awaiting payment' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hangarmarketplace.com'
    const stripe = getStripe()
    const priceLabel = is_priority ? 'High-Priority' : 'Standard'
    const unitAmount = is_priority ? REQUEST_PRIORITY_CENTS : REQUEST_STANDARD_CENTS

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: request.contact_email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: `${priceLabel} Hangar Request at ${request.airport_code}`,
              description: is_priority
                ? 'Your request will be pinned to the top of the board with a Priority badge.'
                : 'Your request will be listed on the hangar request board.',
            },
          },
        },
      ],
      metadata: {
        request_id: request.id,
        is_priority: is_priority ? 'true' : 'false',
        type: 'hangar_request',
      },
      success_url: `${appUrl}/requests/success?request_id=${request.id}`,
      cancel_url: `${appUrl}/requests/new?cancelled=1&request_id=${request.id}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    )
  }
}
