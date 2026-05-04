import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, listingApprovedEmail, listingRejectedEmail, newListingAtAirportEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { notifyBuyersOfNewListing } from '@/lib/listingAlerts'
import { isAdminUser } from '@/lib/auth-admin'

async function requireAdmin(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user) ? user : null
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      title, listing_type, ownership_type, airport_code, airport_name, city, state,
      asking_price, monthly_lease, square_feet, door_width, door_height, hangar_depth,
      contact_name, contact_email, contact_phone, description,
      broker_profile_id, broker_user_id,
    } = body

    if (!title || !listing_type || !airport_code || !city || !state || !contact_name || !contact_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert({
        title,
        listing_type,
        ownership_type: ownership_type || 'Private',
        property_type: 'hangar',
        airport_code: airport_code.toUpperCase(),
        airport_name: airport_name || airport_code.toUpperCase(),
        city,
        state,
        asking_price:   asking_price   ? Number(asking_price)   : null,
        monthly_lease:  monthly_lease  ? Number(monthly_lease)  : null,
        square_feet:    square_feet    ? Number(square_feet)    : null,
        door_width:     door_width     ? Number(door_width)     : null,
        door_height:    door_height    ? Number(door_height)    : null,
        hangar_depth:   hangar_depth   ? Number(hangar_depth)   : null,
        contact_name,
        contact_email,
        contact_phone:  contact_phone  || null,
        description:    description    || null,
        user_id:        broker_user_id ?? admin.id,
        broker_profile_id: broker_profile_id ?? null,
        status: 'approved',
        is_sample: false,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify the broker if one was assigned
    if (broker_user_id) {
      await createNotification({
        userId: broker_user_id,
        type:   'listing_approved',
        title:  `A listing was created for you: "${title}"`,
        body:   'An admin created and assigned a listing to your broker profile. You can edit it from your dashboard.',
        link:   `/listing/${data.id}`,
      }).catch(e => console.error('[admin/listings POST] notify broker failed:', e))
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (e) {
    console.error('[admin/listings POST]', e)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, status, broker_profile_id, broker_user_id } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // ── Broker assignment ────────────────────────────────────────────────────
    if (broker_profile_id !== undefined && !status) {
      const update: Record<string, unknown> = { broker_profile_id: broker_profile_id || null }
      if (broker_user_id) update.user_id = broker_user_id

      const { error } = await supabaseAdmin.from('listings').update(update).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Fetch listing title for the notification
      const { data: listing } = await supabaseAdmin
        .from('listings').select('title').eq('id', id).single()

      if (broker_user_id && listing) {
        await createNotification({
          userId: broker_user_id,
          type:   'listing_approved',
          title:  `A listing was assigned to you: "${listing.title}"`,
          body:   'An admin assigned a listing to your broker profile. You can now edit and manage it.',
          link:   `/listing/${id}`,
        }).catch(e => console.error('[admin/listings PATCH] notify broker failed:', e))
      }

      return NextResponse.json({ success: true })
    }

    // ── Status update ────────────────────────────────────────────────────────
    if (!status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch the listing (need airport_code + listing_type for seeker alerts,
    // plus lat/lng + prices for the 50mi nearby-buyer alert).
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('id, title, user_id, contact_name, contact_email, airport_code, airport_name, listing_type, price, asking_price, monthly_lease, latitude, longitude')
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

      // In-app notification to listing owner
      if (listing.user_id) {
        await createNotification({
          userId: listing.user_id,
          type:   isApproved ? 'listing_approved' : 'listing_rejected',
          title:  isApproved
            ? `Your listing "${listing.title}" is live!`
            : `Your listing "${listing.title}" was not approved`,
          body:   isApproved
            ? 'Buyers can now find and contact you through your listing.'
            : 'Please review our listing guidelines and resubmit.',
          link:   isApproved ? `/listing/${listing.id}` : `/dashboard`,
        }).catch(e => console.error('[admin/listings] notification failed:', e))
      }

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

      // ── 3. If approved: notify buyers whose home airport is within 50mi ──
      if (isApproved && listing.latitude != null && listing.longitude != null) {
        void notifyBuyersOfNewListing(listing.id)
          .catch(e => console.error('[admin/listings] nearby-buyer alert failed:', e))
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
