import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  // Notify all brokers via Supabase — just inserting the row triggers
  // realtime for any subscribed broker dashboards. No extra step needed.

  return NextResponse.json({ id: data.id }, { status: 201 })
}
