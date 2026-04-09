import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, listingApprovedEmail, listingRejectedEmail, newListingAtAirportEmail } from '@/lib/email'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch the listing (need airport_code + listing_type for seeker alerts)
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('id, title, contact_name, contact_email, airport_code, airport_name, listing_type, price')
      .eq('id', id)
      .single()

    // Update status
    const { error } = await supabaseAdmin
      .from('listings')
      .update({ status })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
    }

    if (listing) {
      const isApproved = status === 'approved'

      // ── 1. Email the listing owner (approval or rejection) ─────────────
      const sellerEmailData = isApproved
        ? listingApprovedEmail({ name: listing.contact_name, title: listing.title, listingId: listing.id })
        : listingRejectedEmail({ name: listing.contact_name, title: listing.title })

      await sendEmail({ to: listing.contact_email, ...sellerEmailData }).catch(e =>
        console.error('[admin/listings] seller email failed:', e)
      )

      // ── 2. If approved: notify seekers with active requests at this airport ──
      if (isApproved && listing.airport_code) {
        const { data: activeRequests } = await supabaseAdmin
          .from('hangar_requests')
          .select('contact_name, contact_email')
          .eq('airport_code', listing.airport_code)
          .eq('status', 'active')

        if (activeRequests && activeRequests.length > 0) {
          // Find unsubscribe tokens for these emails (best-effort)
          const emails = activeRequests.map(r => r.contact_email)
          const { data: subs } = await supabaseAdmin
            .from('email_subscribers')
            .select('email, unsubscribe_token')
            .in('email', emails)
            .is('unsubscribed_at', null)

          const tokenMap = Object.fromEntries((subs ?? []).map(s => [s.email, s.unsubscribe_token]))

          for (const req of activeRequests) {
            const unsubToken = tokenMap[req.contact_email] ?? 'unsubscribe'
            const { subject, html } = newListingAtAirportEmail({
              seekerName:   req.contact_name,
              airportCode:  listing.airport_code,
              airportName:  listing.airport_name ?? listing.airport_code,
              listingTitle: listing.title,
              listingId:    listing.id,
              listingType:  listing.listing_type ?? 'lease',
              price:        listing.price,
              unsubToken,
            })
            await sendEmail({ to: req.contact_email, subject, html }).catch(e =>
              console.error('[admin/listings] seeker alert failed:', e)
            )
          }
          console.log(`[admin/listings] notified ${activeRequests.length} seekers at ${listing.airport_code}`)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
