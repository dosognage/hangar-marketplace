import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, listingApprovedEmail, listingRejectedEmail, newListingAtAirportEmail } from '@/lib/email'

async function requireAdmin(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) return null
  return user
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
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

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing listing id' }, { status: 400 })

    // Fetch listing details before deleting so we can email the owner
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('title, contact_name, contact_email, status, is_sample')
      .eq('id', id)
      .single()

    // Delete associated photos first (storage objects are managed separately)
    await supabaseAdmin.from('listing_photos').delete().eq('listing_id', id)
    await supabaseAdmin.from('inquiries').delete().eq('listing_id', id)

    const { error } = await supabaseAdmin.from('listings').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Email the owner when a non-sample listing is deleted while pending or rejected
    // (if it was already rejected, the PATCH handler already sent a rejection email —
    //  but if the admin deletes without rejecting first, this is the only notification)
    if (listing && !listing.is_sample && listing.status === 'pending') {
      const emailData = listingRejectedEmail({
        name:  listing.contact_name,
        title: listing.title,
      })
      await sendEmail({ to: listing.contact_email, ...emailData }).catch(e =>
        console.error('[admin/listings] delete email failed:', e)
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
