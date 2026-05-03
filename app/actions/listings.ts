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
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveBrokerProfileId } from '@/lib/auth-broker'

// Accept literal 0 for optional numeric fields (HOA, tax). Empty string → null.
function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null
  const s = typeof raw === 'string' ? raw : String(raw)
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Mirror createListing's trial logic so edit→publish lands on the same status.
function isTrialActive(): boolean {
  const end = process.env.LISTING_TRIAL_ENDS
  if (!end) return true
  return new Date() < new Date(end)
}

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

  // Verify ownership (pull current status + broker_profile_id so we know
  // whether this is a draft AND whether an assigned broker is permitted).
  // Use the admin client so RLS doesn't hide rows from non-owner brokers.
  const { data: existing } = await supabaseAdmin
    .from('listings')
    .select('id, user_id, status, broker_profile_id')
    .eq('id', listingId)
    .single()

  if (!existing) return { error: 'Listing not found.' }

  // Two paths permitted (mirror the edit page's auth gate exactly):
  //   1. The user IS the listing owner.
  //   2. The user is a verified broker whose broker_profile_id matches the
  //      listing's broker_profile_id (admin assigned them this listing).
  // SECURITY: resolve broker identity from the broker_profiles table — never
  // from JWT user_metadata, which is end-user-editable. See lib/auth-broker.ts.
  const userBrokerProfileId = await resolveBrokerProfileId(user)
  const isOwner       = existing.user_id === user.id
  const isAssignedBroker = !!userBrokerProfileId && existing.broker_profile_id === userBrokerProfileId
  if (!isOwner && !isAssignedBroker) {
    return { error: 'Not authorised.' }
  }

  const listing_type   = formData.get('listing_type') as string
  const property_type  = (formData.get('property_type') as string) || 'hangar'
  const isHangar       = !property_type || property_type === 'hangar'
  const isHome         = property_type === 'airport_home' || property_type === 'fly_in_community'

  // ── Determine target status ─────────────────────────────────────────────
  // Published listings always reset to 'pending' so admin re-reviews edits.
  // Drafts are trickier: user picks via the save_mode field ("draft" keeps it
  // unpublished, "publish" runs the same gate as a new submission).
  //
  // SECURITY: `isBroker` here decides whether the draft skips admin review
  // and the paywall. Reading user_metadata.is_broker would let any user
  // self-promote and ship their own listing live. Source the answer from
  // broker_profiles instead — !!userBrokerProfileId is true iff there's a
  // verified profile (already loaded above). Defense in depth.
  const saveMode = formData.get('save_mode') as string | null
  const isBroker = !!userBrokerProfileId

  let nextStatus: string
  if (existing.status === 'draft') {
    if (saveMode === 'publish') {
      // Publish gate mirrors createListing: broker → approved, trial → pending,
      // paywall → pending_payment. Payment flow from the edit path isn't wired
      // yet so after-trial non-brokers land on pending_payment and can finish
      // via an admin action.
      nextStatus = isBroker ? 'approved'
                : isTrialActive() ? 'pending'
                : 'pending_payment'
    } else {
      nextStatus = 'draft'
    }
  } else {
    nextStatus = 'pending'
  }

  // Amenities come in as a JSON-encoded string from a hidden field.
  let amenitiesClean: string[] = []
  try {
    const raw = formData.get('amenities')
    if (typeof raw === 'string' && raw.length > 0) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        amenitiesClean = Array.from(new Set(
          parsed
            .map(a => typeof a === 'string' ? a.trim() : '')
            .filter(Boolean),
        )).slice(0, 40)
      }
    }
  } catch { /* fall through to empty */ }

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
    // Recurring costs + amenities (from the new fields on the form).
    hoa_monthly:          parseOptionalNumber(formData.get('hoa_monthly')),
    annual_property_tax:  parseOptionalNumber(formData.get('annual_property_tax')),
    amenities:            amenitiesClean,
    // Pin location on the airport diagram. Brokers can edit it from the map.
    // hangar_lat/lng = exact pin; latitude/longitude = searchable coords used
    // by the 50mi nearby-buyer alerts. Pin doubles as the searchable point
    // when present, so we mirror it into latitude/longitude.
    hangar_lat:  parseOptionalNumber(formData.get('hangar_lat')),
    hangar_lng:  parseOptionalNumber(formData.get('hangar_lng')),
    ...(formData.get('hangar_lat') && formData.get('hangar_lng')
      ? {
          latitude:  parseOptionalNumber(formData.get('hangar_lat')),
          longitude: parseOptionalNumber(formData.get('hangar_lng')),
        }
      : {}),
    // Leasehold term — only meaningful when ownership_type === 'leasehold'.
    // If the user switched away from leasehold we clear the column.
    leasehold_years_remaining: formData.get('ownership_type') === 'leasehold'
                                 ? parseOptionalNumber(formData.get('leasehold_years_remaining'))
                                 : null,
    status: nextStatus,
  }

  // Use admin client for the write — RLS UPDATE policies typically only
  // allow the original user_id to write, which would silently no-op for
  // assigned brokers. We've already done our own auth check above.
  const { error } = await supabaseAdmin.from('listings').update(updates).eq('id', listingId)
  if (error) return { error: error.message }

  revalidatePath('/broker/dashboard')
  revalidatePath('/dashboard')
  revalidatePath(`/listing/${listingId}`)

  // Non-brokers land on the main dashboard (which has the drafts section).
  // Drafts kept as drafts go straight back to the drafts view so it's obvious
  // the save worked.
  if (nextStatus === 'draft') redirect('/dashboard?drafts=1')
  redirect(isBroker ? '/broker/dashboard' : '/dashboard')
}

// ── Mark listing as sold / leased ──────────────────────────────────────────

export type MarkSoldState =
  | { error?: string; success?: boolean; redirectTo?: string }
  | null

const VALID_SOLD_VIA      = ['platform', 'off_platform', 'lease_signed', 'other']
const VALID_BUYER_TYPES   = ['cash', 'financed', 'business', 'investor', 'owner_occupant', 'other']
const VALID_SELECTION_REASONS = [
  'best_price', 'best_terms', 'faster_close', 'broker_connection',
  'only_offer', 'all_cash', 'fewer_contingencies', 'other',
]

/**
 * Capture a sale (or completed lease) on a listing.
 *
 * Two paths feed this action:
 *   1. The lightweight panel on the edit page (just sale_price + sold_via +
 *      sold_at).
 *   2. The full "Congratulations on the sale" page at /listing/[id]/mark-sold,
 *      which collects the richer market-intelligence fields below.
 *
 * Either path always updates listings.{status, sold_at, sale_price, sold_via}.
 * The richer page additionally upserts a row into listing_sale_outcomes —
 * we only write to that table when at least one of the rich fields is set.
 *
 * Form fields expected (all optional except none — we never block the action):
 *   - sale_price       number  — actual sale price / lease rate
 *   - sold_via         enum    — platform | off_platform | lease_signed | other
 *   - sold_at          ISO     — defaults to now()
 *   - asking_at_sale   number  — final asking at close
 *   - buyer_type       enum    — cash | financed | business | investor | owner_occupant | other
 *   - buyer_state      string  — 2-letter state
 *   - offer_count      number
 *   - received_multiple_offers checkbox
 *   - selection_reasons[]      — multi-select chip values
 *   - notes            string
 */
export async function markListingSold(
  listingId: string,
  _prevState: MarkSoldState,
  formData: FormData,
): Promise<MarkSoldState> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Auth: same two-path rule we use in updateListing — owner OR assigned broker.
  const { data: existing } = await supabaseAdmin
    .from('listings')
    .select('id, user_id, broker_profile_id, status, listing_type, created_at, asking_price, monthly_lease')
    .eq('id', listingId)
    .single()
  if (!existing) return { error: 'Listing not found.' }

  // SECURITY: resolve broker identity from broker_profiles, not JWT
  // user_metadata (which is end-user-editable). See lib/auth-broker.ts.
  const userBrokerProfileId = await resolveBrokerProfileId(user)
  const isOwner = existing.user_id === user.id
  const isAssignedBroker =
    !!userBrokerProfileId && existing.broker_profile_id === userBrokerProfileId
  if (!isOwner && !isAssignedBroker) return { error: 'Not authorised.' }

  // ── Core sale fields on listings ──────────────────────────────────────────
  const salePrice = parseOptionalNumber(formData.get('sale_price'))

  const soldViaRaw = (formData.get('sold_via') as string | null) ?? null
  const soldVia = soldViaRaw && VALID_SOLD_VIA.includes(soldViaRaw) ? soldViaRaw : null

  const soldAtRaw = (formData.get('sold_at') as string | null) ?? null
  const soldAt = soldAtRaw && !Number.isNaN(new Date(soldAtRaw).getTime())
    ? new Date(soldAtRaw).toISOString()
    : new Date().toISOString()

  const isLease = existing.listing_type === 'lease' || existing.listing_type === 'space'
  const nextStatus = isLease ? 'closed' : 'sold'

  const { error: updErr } = await supabaseAdmin
    .from('listings')
    .update({
      status:     nextStatus,
      sold_at:    soldAt,
      sale_price: salePrice,
      sold_via:   soldVia,
    })
    .eq('id', listingId)
  if (updErr) return { error: updErr.message }

  // ── Rich sale outcome fields on listing_sale_outcomes (optional) ──────────
  const askingAtSale = parseOptionalNumber(formData.get('asking_at_sale'))
    ?? (isLease ? existing.monthly_lease : existing.asking_price)
    ?? null

  const buyerTypeRaw = (formData.get('buyer_type') as string | null) ?? null
  const buyerType = buyerTypeRaw && VALID_BUYER_TYPES.includes(buyerTypeRaw) ? buyerTypeRaw : null

  const buyerStateRaw = (formData.get('buyer_state') as string | null) ?? null
  const buyerState = buyerStateRaw && /^[a-zA-Z]{2}$/.test(buyerStateRaw)
    ? buyerStateRaw.toUpperCase() : null

  const offerCount = parseOptionalNumber(formData.get('offer_count'))
  const receivedMultiple = formData.get('received_multiple_offers') === 'on'
    || formData.get('received_multiple_offers') === 'true'

  const reasonsRaw = formData.getAll('selection_reasons').map(v => String(v))
  const selectionReasons = reasonsRaw.filter(r => VALID_SELECTION_REASONS.includes(r))

  const notesRaw = (formData.get('notes') as string | null) ?? null
  const notes = notesRaw ? notesRaw.trim().slice(0, 2000) : null

  const daysOnMarket = Math.max(
    0,
    Math.floor((new Date(soldAt).getTime() - new Date(existing.created_at).getTime()) / 86_400_000),
  )

  // Only write the outcomes row if the user actually filled in at least one
  // of the rich fields. Saves us from littering the table with noise rows.
  const hasRichData = !!(
    buyerType || buyerState || offerCount != null || receivedMultiple ||
    selectionReasons.length > 0 || notes || askingAtSale != null
  )

  if (hasRichData) {
    const { error: outErr } = await supabaseAdmin
      .from('listing_sale_outcomes')
      .upsert({
        listing_id:               listingId,
        captured_by:              user.id,
        sale_price:               salePrice,
        asking_at_sale:           askingAtSale,
        days_on_market:           daysOnMarket,
        offer_count:              offerCount,
        received_multiple_offers: receivedMultiple,
        buyer_type:               buyerType,
        buyer_state:              buyerState,
        selection_reasons:        selectionReasons,
        notes,
      }, { onConflict: 'listing_id' })
    if (outErr) {
      // Don't fail the whole action — the listing is already marked sold.
      // Log and continue so the user lands on the success page.
      console.error('[markListingSold] outcomes upsert failed:', outErr)
    }
  }

  revalidatePath('/broker/dashboard')
  revalidatePath('/dashboard')
  revalidatePath(`/listing/${listingId}`)
  revalidatePath(`/listing/${listingId}/edit`)
  revalidatePath(`/listing/${listingId}/mark-sold`)
  return { success: true, redirectTo: `/listing/${listingId}/mark-sold?done=1` }
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
