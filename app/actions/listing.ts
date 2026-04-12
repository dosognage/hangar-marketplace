'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { sendEmail, listingSubmittedEmail } from '@/lib/email'

export type ListingFormData = {
  title: string
  airport_name: string
  airport_code: string
  city: string
  state: string
  property_type: string
  listing_type: string
  ownership_type: string
  asking_price: string
  monthly_lease: string
  // Hangar-specific
  square_feet: string
  door_width: string
  door_height: string
  hangar_depth: string
  // Home/land-specific
  bedrooms: string
  bathrooms: string
  home_sqft: string
  lot_acres: string
  has_runway_access: boolean
  airpark_name: string
  // Runway
  runway_length_ft: string
  runway_width_ft: string
  runway_surface: string
  description: string
  contact_name: string
  contact_email: string
  contact_phone: string
  hangar_lat: number | null
  hangar_lng: number | null
  // Searchable map coordinates — airport center or pin-drop location
  latitude: number | null
  longitude: number | null
}

const IS_RENTAL = (t: string) => t === 'lease' || t === 'space'

/**
 * Insert a new listing.
 *
 * Uses supabaseAdmin to bypass RLS — auth is verified via the cookie
 * session first, so only logged-in users can actually insert.
 * Returns the new listing's ID so the client can proceed with photo uploads.
 */
export async function createListing(data: ListingFormData): Promise<{ id: string }> {
  // Verify the user is logged in
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/submit')
  }

  const isBroker     = user.user_metadata?.is_broker === true
  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined

  const isHangar = !data.property_type || data.property_type === 'hangar'
  const isHome   = data.property_type === 'airport_home' || data.property_type === 'fly_in_community'

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .insert([{
      user_id:          user.id,
      title:            data.title,
      airport_name:     data.airport_name,
      airport_code:     data.airport_code,
      city:             data.city,
      state:            data.state,
      property_type:    data.property_type || 'hangar',
      listing_type:     data.listing_type,
      ownership_type:   data.ownership_type,
      asking_price:     data.listing_type === 'sale' && data.asking_price
                          ? Number(data.asking_price) : null,
      monthly_lease:    IS_RENTAL(data.listing_type) && data.monthly_lease
                          ? Number(data.monthly_lease) : null,
      // Hangar-specific
      square_feet:      isHangar && data.square_feet  ? Number(data.square_feet)  : null,
      door_width:       isHangar && data.door_width   ? Number(data.door_width)   : null,
      door_height:      isHangar && data.door_height  ? Number(data.door_height)  : null,
      hangar_depth:     isHangar && data.hangar_depth ? Number(data.hangar_depth) : null,
      // Home/land-specific
      bedrooms:         isHome && data.bedrooms    ? Number(data.bedrooms)    : null,
      bathrooms:        isHome && data.bathrooms   ? Number(data.bathrooms)   : null,
      home_sqft:        isHome && data.home_sqft   ? Number(data.home_sqft)   : null,
      lot_acres:        data.lot_acres             ? Number(data.lot_acres)   : null,
      has_runway_access: data.has_runway_access ?? false,
      airpark_name:     data.airpark_name || null,
      // Runway
      runway_length_ft: data.runway_length_ft ? Number(data.runway_length_ft) : null,
      runway_width_ft:  data.runway_width_ft  ? Number(data.runway_width_ft)  : null,
      runway_surface:   data.runway_surface   || null,
      description:      data.description  || null,
      contact_name:     data.contact_name,
      contact_email:    data.contact_email,
      contact_phone:    data.contact_phone || null,
      // Verified brokers get auto-approved and linked to their profile
      status:           isBroker ? 'approved' : 'pending',
      broker_profile_id: isBroker && brokerProfileId ? brokerProfileId : null,
      hangar_lat:       data.hangar_lat,
      hangar_lng:       data.hangar_lng,
      latitude:         data.latitude,
      longitude:        data.longitude,
    }])
    .select('id')
    .single()

  if (error || !listing) {
    throw new Error(error?.message ?? 'Failed to save listing.')
  }

  // Send submission confirmation email (non-fatal if it fails)
  // Brokers get auto-approved so skip the "under review" email for them
  if (!isBroker) {
    const emailData = listingSubmittedEmail({
      name:        data.contact_name,
      title:       data.title,
      airportCode: data.airport_code,
    })
    await sendEmail({ to: data.contact_email, ...emailData }).catch(e =>
      console.error('[createListing] submission email failed:', e)
    )
  }

  return { id: listing.id }
}
