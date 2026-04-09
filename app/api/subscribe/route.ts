import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { email, source = 'footer_form' } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Collect IP for GDPR consent record-keeping
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    // Upsert: if email already exists, re-enable consent and update metadata
    const { error } = await supabase
      .from('email_subscribers')
      .upsert(
        {
          email: normalized,
          marketing_consent: true,
          consent_timestamp: new Date().toISOString(),
          consent_ip: ip,
          consent_source: source,
          unsubscribed_at: null, // re-subscribe if they previously unsubscribed
        },
        { onConflict: 'email' }
      )

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[subscribe]', err)
    return NextResponse.json(
      { error: 'Could not save your subscription. Please try again.' },
      { status: 500 }
    )
  }
}
