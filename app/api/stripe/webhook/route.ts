import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
      const { error } = await supabaseAdmin
        .from('hangar_requests')
        .update({
          status: 'active',
          is_priority: is_priority === 'true',
        })
        .eq('id', request_id)
        .eq('status', 'pending_payment')

      if (error) {
        console.error('[webhook] Failed to activate request:', error.message)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }

      console.log(`[webhook] Request ${request_id} activated (priority: ${is_priority})`)
    }
  }

  return NextResponse.json({ received: true })
}
