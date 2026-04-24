'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { sendEmail, listingSubmittedEmail } from '@/lib/email'
import { getStripe } from '@/lib/stripe'
import { notifyBuyersOfNewListing } from '@/lib/listingAlerts'

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
  // Recurring costs (apply to homes + land; user can enter 0)
  hoa_monthly: string
  annual_property_tax: string
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
  // Amenities (array of short keys — "heat", "power", "wifi", etc.)
  amenities: string[]
  // Address (non-hangar)
  address: string
  zip_code: string
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
  // When true, save as a draft (no payment, no email, no notifications).
  isDraft?: boolean
}

export type CreateListingResult = {
  id: string
  requiresPayment?: boolean
  checkoutUrl?: string
  amount?: number
}

const IS_RENTAL = (t: string) => t === 'lease' || t === 'space'

/**
 * Returns true if today is before the free-trial cutoff date.
 * LISTING_TRIAL_ENDS should be an ISO date string, e.g. "2026-06-19".
 * If the env var is missing, the trial is considered active (always free).
 */
function isTrialActive(): boolean {
  const trialEnds = process.env.LISTING_TRIAL_ENDS
  if (!trialEnds) return true
  return new Date() < new Date(trialEnds)
}

/**
 * Insert a new listing.
 *
 * Uses supabaseAdmin to bypass RLS — auth is verified via the cookie
 * session first, so only logged-in users can actually insert.
 *
 * Returns the new listing ID. For non-broker, post-trial submissions
 * also returns requiresPayment=true and a Stripe checkoutUrl.
 */
export async function createListing(data: ListingFormData): Promise<CreateListingResult> {
  // Verify the user is logged in
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/submit')
  }

  const isBroker        = user.user_metadata?.is_broker === true
  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined

  const isHangar = !data.property_type || data.property_type === 'hangar'
  const isHome   = data.property_type === 'airport_home' || data.property_type === 'fly_in_community'
  const isDraft  = data.isDraft === true

  // ── Determine status & fee ───────────────────────────────────────────────
  //
  // Drafts skip every monetization + review decision: they're always stored as
  // 'draft' regardless of broker/trial status. The user explicitly comes back
  // and clicks Publish to kick off the real flow.
  const trialFree       = !isDraft && !isBroker && isTrialActive()
  const paymentRequired = !isDraft && !isBroker && !isTrialActive()

  const feeAmountDollars = isHangar
    ? Number(process.env.LISTING_FEE_HANGAR ?? 25)
    : Number(process.env.LISTING_FEE_HOME   ?? 49)

  const initialStatus =
    isDraft          ? 'draft'            :
    isBroker         ? 'approved'         :
    paymentRequired  ? 'pending_payment'  : 'pending'

  // Accept literal 0 for HOA/tax (empty string → null, "0" → 0).
  const parseOptionalNumber = (s: string): number | null => {
    if (s == null || s === '') return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  // Sanitize amenities: unique, non-empty strings, capped at 40 entries.
  const cleanAmenities = Array.isArray(data.amenities)
    ? Array.from(new Set(
        data.amenities
          .map(a => typeof a === 'string' ? a.trim() : '')
          .filter(Boolean),
      )).slice(0, 40)
    : []

  // ── Insert listing ───────────────────────────────────────────────────────
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
      hoa_monthly:         parseOptionalNumber(data.hoa_monthly),
      annual_property_tax: parseOptionalNumber(data.annual_property_tax),
      amenities:           cleanAmenities,
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
      // Address
      address:          !isHangar && data.address  ? data.address.trim()  : null,
      zip_code:         !isHangar && data.zip_code ? data.zip_code.trim() : null,
      // Runway
      runway_length_ft: data.runway_length_ft ? Number(data.runway_length_ft) : null,
      runway_width_ft:  data.runway_width_ft  ? Number(data.runway_width_ft)  : null,
      runway_surface:   data.runway_surface   || null,
      description:      data.description  || null,
      contact_name:     data.contact_name,
      contact_email:    data.contact_email,
      contact_phone:    data.contact_phone || null,
      status:           initialStatus,
      trial_listing:    trialFree,
      listing_fee_amount: paymentRequired ? feeAmountDollars : null,
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

  // ── Draft path — skip payment, email, and buyer alerts ──────────────────
  // The user can resume editing from the "My Drafts" section of the dashboard
  // and only trigger the full flow when they click Publish.
  if (isDraft) {
    return { id: listing.id }
  }

  // ── Payment required — create Stripe Checkout ────────────────────────────
  if (paymentRequired) {
    const stripe   = getStripe()
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const typeLabel = isHangar ? 'hangar' : 'property'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: feeAmountDollars * 100,
          product_data: {
            name: `Listing Fee: ${data.title}`,
            description: `One-time fee to publish your ${typeLabel} listing on Hangar Marketplace`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        type:       'listing_fee',
        listing_id: listing.id,
      },
      success_url: `${siteUrl}/submit/success`,
      cancel_url:  `${siteUrl}/`,
    })

    return {
      id:              listing.id,
      requiresPayment: true,
      checkoutUrl:     session.url!,
      amount:          feeAmountDollars,
    }
  }

  // ── Free path (broker or trial) — send confirmation email ───────────────
  // Brokers get auto-approved; skip the "under review" email for them
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

  // Broker listings go live immediately, so trigger nearby-buyer alerts now.
  // Non-broker trial listings wait for admin approval before alerts fire;
  // that path lives in the admin approval handler (see admin approve action).
  if (isBroker && data.latitude != null && data.longitude != null) {
    void notifyBuyersOfNewListing(listing.id)
      .catch(e => console.error('[createListing] buyer alert failed:', e))
  }

  return { id: listing.id }
}

/**
 * Server action called by the submit page to find out trial / fee info.
 * This keeps the env vars server-side; the client just gets booleans + numbers.
 */
export async function getListingFeeInfo(): Promise<{
  trialActive:       boolean
  trialEnds:         string | null
  feeHangar:         number
  feeHome:           number
  isVerifiedBroker:  boolean
}> {
  const trialEnds = process.env.LISTING_TRIAL_ENDS ?? null

  // Best-effort broker check. If the cookie session isn't available (e.g. the
  // page is being prerendered), we fall through to false — the banner is
  // purely cosmetic and not a security boundary.
  let isVerifiedBroker = false
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    isVerifiedBroker = user?.user_metadata?.is_broker === true
  } catch {
    /* non-fatal */
  }

  return {
    trialActive: isTrialActive(),
    trialEnds,
    feeHangar:   Number(process.env.LISTING_FEE_HANGAR ?? 25),
    feeHome:     Number(process.env.LISTING_FEE_HOME   ?? 49),
    isVerifiedBroker,
  }
}
