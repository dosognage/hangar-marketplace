import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, modernLayout } from '@/lib/email'
import { geocodeLocation, distanceMiles } from '@/lib/geocode'
import { createNotification } from '@/lib/notifications'
import { notifyListingOwnersOfNewRequest } from '@/lib/listingAlerts'

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

  // Alert nearby brokers AND listing owners — both fire-and-forget so they
  // never delay the user's 201 response.
  const airportCode = body.airport_code?.trim().toUpperCase()
  if (airportCode) {
    // (a) Brokers whose specialty airports are within their chosen radius
    //     of this request. This is the pre-existing flow.
    void alertNearbyBrokers({
      requestId:   data.id,
      airportCode,
      airportName: body.airport_name ?? airportCode,
      city:        body.city,
      state:       body.state,
      contactName: body.contact_name,
      aircraftType: body.aircraft_type,
      duration:    body.duration,
      budget:      body.monthly_budget ?? null,
      moveInDate:  body.move_in_date ?? null,
      notes:       body.notes ?? null,
    }).catch(e => console.error('[POST /api/requests] broker alert error:', e))

    // (b) Listing owners with a live listing within 50mi of this request.
    //     We geocode once here and hand coords to the helper so it can do
    //     in-memory haversine filtering.
    void (async () => {
      const geo = await geocodeLocation(airportCode)
      if (!geo) return
      await notifyListingOwnersOfNewRequest({
        requestId:    data.id,
        requesterId:  user.id,
        airportCode,
        airportName:  body.airport_name ?? airportCode,
        city:         body.city,
        state:        body.state,
        contactName:  body.contact_name,
        aircraftType: body.aircraft_type,
        duration:     body.duration,
        budget:       body.monthly_budget ?? null,
        moveInDate:   body.move_in_date ?? null,
        notes:        body.notes ?? null,
        requestLat:   geo.lat,
        requestLng:   geo.lng,
      })
    })().catch(e => console.error('[POST /api/requests] owner alert error:', e))
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

// ─── Broker alert helper ──────────────────────────────────────────────────────

interface AlertPayload {
  requestId:    string
  airportCode:  string
  airportName:  string
  city:         string
  state:        string
  contactName:  string
  aircraftType?: string | null
  duration?:    string | null
  budget?:      number | null
  moveInDate?:  string | null
  notes?:       string | null
}

async function alertNearbyBrokers(payload: AlertPayload) {
  // 1. Geocode the requested airport
  const requestedGeo = await geocodeLocation(payload.airportCode)
  if (!requestedGeo) {
    console.warn(`[alertNearbyBrokers] Could not geocode ${payload.airportCode}`)
    return
  }

  // 2. Fetch all active brokers that have alerts enabled and cached coords
  const { data: brokers } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, user_id, full_name, contact_email, alert_radius_miles, specialty_airports_coords')
    .not('contact_email', 'is', null)
    .gt('alert_radius_miles', 0)

  if (!brokers || brokers.length === 0) return

  // 3. Filter brokers whose specialty airports are within their chosen radius
  type BrokerRow = {
    id: string
    user_id: string
    full_name: string
    contact_email: string
    alert_radius_miles: number
    specialty_airports_coords: Record<string, { lat: number; lng: number }>
  }

  const matched = (brokers as BrokerRow[]).filter(broker => {
    const coords = broker.specialty_airports_coords ?? {}
    if (Object.keys(coords).length === 0) return false
    const radius = broker.alert_radius_miles ?? 100
    return Object.values(coords).some(
      pt => distanceMiles(requestedGeo, pt) <= radius
    )
  })

  if (matched.length === 0) return

  const requestUrl = `https://hangarmarketplace.com/requests`
  const details = [
    payload.aircraftType && `Aircraft: ${payload.aircraftType}`,
    payload.duration     && `Duration: ${payload.duration}`,
    payload.budget       && `Budget: $${payload.budget}/mo`,
    payload.moveInDate   && `Move-in: ${payload.moveInDate}`,
    payload.notes        && `Notes: ${payload.notes}`,
  ].filter(Boolean).join('<br/>')

  // 4. Send email + in-app notification to each matched broker
  await Promise.all(matched.map(async broker => {
    // Email — modernLayout keeps chrome consistent with the rest of the suite.
    await sendEmail({
      to: broker.contact_email,
      subject: `New hangar request near your area: ${payload.airportCode}`,
      html: modernLayout({
        preheader: `${payload.contactName} is looking for hangar space at ${payload.airportName}. You have a specialty airport within your alert radius.`,
        eyebrow:   `Near ${payload.airportCode}`,
        title:     `Pilot looking for space near ${payload.airportCode}`,
        subtitle:  `Hi ${broker.full_name}, a pilot just posted a hangar request within your alert radius.`,
        heroCaption: payload.airportCode,
        sections: [{
          title: 'The request',
          html: `
            <p style="margin:0 0 10px;font-size:14px;color:#0f172a;line-height:1.7;">
              <strong>${payload.contactName}</strong> is looking for hangar space at
              <strong>${payload.airportCode} (${payload.airportName})</strong>,
              ${payload.city}, ${payload.state}.
            </p>
            ${details ? `<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${details}</p>` : ''}`,
        }],
        cta: {
          label: 'View all active requests',
          href:  requestUrl,
        },
        footerIntro: `You're getting this because a request was posted within your broker alert radius.`,
        footerLinks: [
          { label: 'Update alert settings', href: 'https://hangarmarketplace.com/broker/dashboard' },
          { label: 'Contact us',            href: 'mailto:hello@hangarmarketplace.com' },
        ],
      }),
    })

    // In-app notification bell
    if (broker.user_id) {
      await createNotification({
        userId: broker.user_id,
        type:   'broker_request_alert',
        title:  `New hangar request near ${payload.airportCode}`,
        body:   `${payload.contactName} is looking for hangar space at ${payload.airportName}, ${payload.city}, ${payload.state}.`,
        link:   '/requests',
      })
    }
  }))
}
