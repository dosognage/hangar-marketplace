'use server'

/**
 * Listing Server Actions
 *
 * delete: removes a listing and its photos (storage + db rows)
 * update: updates listing fields — only allowed by the owner
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase-server'

// ── Delete listing ─────────────────────────────────────────────────────────

export async function deleteListing(listingId: string): Promise<{ error?: string }> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('id, user_id')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Listing not found.' }
  if (listing.user_id !== user.id) return { error: 'Not authorised.' }

  // Delete photos from storage
  const { data: photos } = await supabase
    .from('listing_photos')
    .select('storage_path')
    .eq('listing_id', listingId)

  if (photos && photos.length > 0) {
    const paths = photos.map((p: { storage_path: string }) => p.storage_path)
    await supabase.storage.from('listing-photos').remove(paths)
  }

  // Delete photo records
  await supabase.from('listing_photos').delete().eq('listing_id', listingId)

  // Delete the listing
  const { error } = await supabase.from('listings').delete().eq('id', listingId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// ── Update listing ─────────────────────────────────────────────────────────

export type UpdateState = { error?: string; success?: boolean } | null

export async function updateListing(
  listingId: string,
  _prevState: UpdateState,
  formData: FormData
): Promise<UpdateState> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify ownership
  const { data: existing } = await supabase
    .from('listings')
    .select('id, user_id')
    .eq('id', listingId)
    .single()

  if (!existing) return { error: 'Listing not found.' }
  if (existing.user_id !== user.id) return { error: 'Not authorised.' }

  const listing_type   = formData.get('listing_type') as string
  const property_type  = (formData.get('property_type') as string) || 'hangar'
  const isHangar       = !property_type || property_type === 'hangar'
  const isHome         = property_type === 'airport_home' || property_type === 'fly_in_community'

  const updates = {
    title:          (formData.get('title') as string)?.trim(),
    property_type,
    airport_name:   (formData.get('airport_name') as string)?.trim(),
    airport_code:   (formData.get('airport_code') as string)?.trim().toUpperCase(),
    city:           (formData.get('city') as string)?.trim(),
    state:          (formData.get('state') as string)?.trim(),
    listing_type,
    ownership_type: isHangar ? (formData.get('ownership_type') as string)?.trim() : null,
    asking_price:   listing_type === 'sale' && formData.get('asking_price')
                      ? Number(formData.get('asking_price'))
                      : null,
    monthly_lease:  (listing_type === 'lease' || listing_type === 'space') && formData.get('monthly_lease')
                      ? Number(formData.get('monthly_lease'))
                      : null,
    // Hangar dimensions
    square_feet:    isHangar && formData.get('square_feet')  ? Number(formData.get('square_feet'))  : null,
    door_width:     isHangar && formData.get('door_width')   ? Number(formData.get('door_width'))   : null,
    door_height:    isHangar && formData.get('door_height')  ? Number(formData.get('door_height'))  : null,
    hangar_depth:   isHangar && formData.get('hangar_depth') ? Number(formData.get('hangar_depth')) : null,
    // Home / land
    bedrooms:       isHome && formData.get('bedrooms')   ? Number(formData.get('bedrooms'))   : null,
    bathrooms:      isHome && formData.get('bathrooms')  ? Number(formData.get('bathrooms'))  : null,
    home_sqft:      isHome && formData.get('home_sqft')  ? Number(formData.get('home_sqft'))  : null,
    lot_acres:      !isHangar && formData.get('lot_acres') ? Number(formData.get('lot_acres')) : null,
    airpark_name:   !isHangar ? (formData.get('airpark_name') as string)?.trim() || null : null,
    has_runway_access: !isHangar ? formData.get('has_runway_access') === 'on' : false,
    // Address
    address:        !isHangar ? (formData.get('address')   as string)?.trim() || null : null,
    zip_code:       !isHangar ? (formData.get('zip_code')  as string)?.trim() || null : null,
    // Runway
    runway_length_ft: formData.get('runway_length_ft') ? Number(formData.get('runway_length_ft')) : null,
    runway_width_ft:  formData.get('runway_width_ft')  ? Number(formData.get('runway_width_ft'))  : null,
    runway_surface:   (formData.get('runway_surface') as string)?.trim() || null,
    description:    (formData.get('description') as string)?.trim() || null,
    contact_name:   (formData.get('contact_name') as string)?.trim(),
    contact_email:  (formData.get('contact_email') as string)?.trim(),
    contact_phone:  (formData.get('contact_phone') as string)?.trim() || null,
    // Reset to pending so admin re-reviews after edits
    status: 'pending',
  }

  const { error } = await supabase.from('listings').update(updates).eq('id', listingId)
  if (error) return { error: error.message }

  revalidatePath('/broker/dashboard')
  revalidatePath(`/listing/${listingId}`)
  redirect('/broker/dashboard')
}

// ── Toggle saved listing ───────────────────────────────────────────────────

/**
 * Inserts or deletes a row in saved_listings for the current user.
 * Returns the new saved state, or redirects to login if not authenticated.
 */
export async function toggleSavedListing(
  listingId: string,
  currentlySaved: boolean
): Promise<{ saved: boolean; error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/listing/${listingId}`)
  }

  if (currentlySaved) {
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
    if (error) return { saved: true, error: error.message }
    return { saved: false }
  } else {
    const { error } = await supabase
      .from('saved_listings')
      .insert({ user_id: user.id, listing_id: listingId })
    if (error) return { saved: false, error: error.message }
    return { saved: true }
  }
}
