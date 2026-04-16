import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

// ─── GET /api/requests ────────────────────────────────────────────────────────
// Public: returns all open hangar requests, newest first.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const state    = searchParams.get('state')
  const aircraft = searchParams.get('aircraft_type')
  const duration = searchParams.get('duration')

  let query = supabaseAdmin
    .from('hangar_requests')
    .select(`
      id, contact_name, airport_code, airport_name, city, state,
      aircraft_type, wingspan_ft, door_width_ft, door_height_ft,
      monthly_budget, duration, move_in_date, notes, status,
      is_priority, created_at, user_id
    `)
    .in('status', ['open', 'active'])
    .order('is_priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (state)    query = query.eq('state', state)
  if (aircraft) query = query.eq('aircraft_type', aircraft)
  if (duration) query = query.eq('duration', duration)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/requests]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] })
}

// ─── POST /api/requests ───────────────────────────────────────────────────────
// Authenticated: creates a new hangar request for the current user.

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    contact_name:   string
    contact_email?: string
    contact_phone?: string
    airport_code?:  string
    airport_name?:  string
    city:           string
    state:          string
    aircraft_type:  string
    wingspan_ft?:   number | null
    door_width_ft?:  number | null
    door_height_ft?: number | null
    monthly_budget?: number | null
    duration:       string
    move_in_date?:  string | null
    notes?:         string
    is_priority?:   boolean
    // If true, status is set to pending_payment for the Stripe checkout flow
    pending_payment?: boolean
  }

  if (!body.contact_name?.trim() || !body.city?.trim() || !body.state?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('hangar_requests')
    .insert({
      user_id:        user.id,
      contact_name:   body.contact_name.trim(),
      contact_email:  body.contact_email?.trim() || null,
      contact_phone:  body.contact_phone?.trim() || null,
      airport_code:   body.airport_code?.trim() || null,
      airport_name:   body.airport_name?.trim() || null,
      city:           body.city.trim(),
      state:          body.state.trim(),
      aircraft_type:  body.aircraft_type?.trim() || null,
      wingspan_ft:    body.wingspan_ft   ?? null,
      door_width_ft:  body.door_width_ft  ?? null,
      door_height_ft: body.door_height_ft ?? null,
      monthly_budget: body.monthly_budget ?? null,
      duration:       body.duration?.trim() || null,
      move_in_date:   body.move_in_date || null,
      notes:          body.notes?.trim() || null,
      status:         body.pending_payment ? 'pending_payment' : 'open',
      is_priority:    body.is_priority ?? false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/requests]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Alert brokers whose specialty airports include this request's airport
  const airportCode = body.airport_code?.trim().toUpperCase()
  if (airportCode) {
    try {
      const { data: matchedBrokers } = await supabaseAdmin
        .from('broker_profiles')
        .select('full_name, contact_email')
        .contains('specialty_airports', [airportCode])
        .not('contact_email', 'is', null)

      if (matchedBrokers && matchedBrokers.length > 0) {
        const requestUrl = `https://hangarmarketplace.com/requests`
        const details = [
          body.aircraft_type && `Aircraft: ${body.aircraft_type}`,
          body.duration      && `Duration: ${body.duration}`,
          body.monthly_budget && `Budget: $${body.monthly_budget}/mo`,
          body.move_in_date  && `Move-in: ${body.move_in_date}`,
          body.notes         && `Notes: ${body.notes}`,
        ].filter(Boolean).join('<br/>')

        await Promise.all(matchedBrokers.map(broker =>
          sendEmail({
            to: broker.contact_email!,
            subject: `New hangar request at ${airportCode} — Hangar Marketplace`,
            html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1a3a5c;padding:24px 40px;">
          <p style="margin:0;color:white;font-size:20px;font-weight:700;">✈ Hangar Marketplace</p>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Aviation Properties</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">New Hangar Request</p>
          <h1 style="margin:0 0 8px;font-size:20px;color:#111827;">Pilot looking for space at ${airportCode}</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
            Hi ${broker.full_name}, a pilot posted a hangar request at one of your specialty airports.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#374151;line-height:1.8;">
            <strong>${body.contact_name}</strong> is looking for hangar space at <strong>${airportCode} — ${body.airport_name ?? airportCode}</strong>, ${body.city}, ${body.state}<br/>
            ${details}
          </div>
          <a href="${requestUrl}" style="display:inline-block;padding:11px 26px;background:#1a3a5c;color:white;text-decoration:none;border-radius:7px;font-size:14px;font-weight:600;">
            View all requests →
          </a>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">You received this because ${airportCode} is listed as one of your specialty airports. <a href="https://hangarmarketplace.com/broker/dashboard" style="color:#9ca3af;">Update your preferences</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
          })
        ))
      }
    } catch (alertErr) {
      console.error('[POST /api/requests] broker alert error:', alertErr)
      // Non-fatal — request still created successfully
    }
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
