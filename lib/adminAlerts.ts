/**
 * Admin alerts for the two events that need a human before anything happens
 * on the site: a listing waiting in the review queue, and (as a heads up) a
 * verified broker's listing going live on submit.
 *
 * Every caller wraps this in Next's after() so the user's response is not
 * held up and, on Vercel, the function stays alive until the email is out.
 * A bare fire-and-forget promise can be frozen with the function before
 * Resend is ever reached, which is how admin mail silently goes missing.
 */

import { supabaseAdmin } from './supabase-admin'
import { listAllAuthUsers } from './authUsers'
import { adminEmailList } from './auth-admin'
import { sendEmail, newListingAdminEmail } from './email'
import { createNotification } from './notifications'

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

/**
 * Resolve ADMIN_EMAILS addresses to auth user ids so the admin's bell gets
 * an in-app notification next to the email. Best effort: a lookup failure
 * only costs the bell, never the email.
 */
export async function adminUserIdsByEmail(adminEmails: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const users = await listAllAuthUsers({
      filter: u => adminEmails.includes((u.email ?? '').toLowerCase()),
    })
    for (const u of users) {
      const email = u.email?.toLowerCase()
      if (email) map.set(email, u.id)
    }
  } catch (e) {
    console.warn('[adminAlerts] listAllAuthUsers failed, skipping in-app notifs:', e)
  }
  return map
}

/**
 * Email every admin (and ping their bell) about a listing that just became
 * reviewable (status pending) or went live from a broker (status approved).
 * Reads the row fresh so the Stripe webhook and the submit action can both
 * call it with nothing but the id.
 */
export async function notifyAdminsOfNewListing(listingId: string): Promise<void> {
  const adminEmails = adminEmailList()
  if (adminEmails.length === 0) return

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    // One literal string: supabase-js infers the row type from it, and a
    // concatenated expression collapses to an error type.
    .select('id, title, property_type, listing_type, airport_code, airport_name, city, state, asking_price, monthly_lease, contact_name, contact_email, status, broker_profile_id, trial_listing, listing_fee_paid, listing_fee_amount')
    .eq('id', listingId)
    .single()

  if (error || !listing) {
    console.error('[adminAlerts] listing lookup failed:', error?.message ?? 'no row')
    return
  }

  let listedBy = 'Private seller'
  if (listing.broker_profile_id) {
    const { data: bp } = await supabaseAdmin
      .from('broker_profiles')
      .select('full_name, brokerage')
      .eq('id', listing.broker_profile_id)
      .maybeSingle()
    listedBy = bp
      ? `${bp.full_name}${bp.brokerage ? `, ${bp.brokerage}` : ''} (verified broker)`
      : 'Verified broker'
  }

  const priceLabel =
    listing.asking_price  != null ? money(Number(listing.asking_price)) :
    listing.monthly_lease != null ? `${money(Number(listing.monthly_lease))} per month` :
    'Price on request'

  const feeLabel =
    listing.broker_profile_id ? 'Broker listing, no fee' :
    listing.trial_listing     ? 'Free trial listing' :
    listing.listing_fee_paid  ? `${money(Number(listing.listing_fee_amount ?? 0))} listing fee paid` :
    'Listing fee not paid yet'

  const needsReview = listing.status === 'pending'

  const { subject, html } = newListingAdminEmail({
    listingId:    listing.id,
    title:        listing.title,
    propertyType: listing.property_type,
    listingType:  listing.listing_type,
    airportCode:  listing.airport_code,
    airportName:  listing.airport_name,
    city:         listing.city,
    state:        listing.state,
    priceLabel,
    contactName:  listing.contact_name,
    contactEmail: listing.contact_email,
    listedBy,
    feeLabel,
    needsReview,
  })

  const bodyLine = `${listing.title} at ${listing.airport_code} (${listing.city}, ${listing.state}). ${priceLabel}.`
  const userIdByEmail = await adminUserIdsByEmail(adminEmails)

  await Promise.all(adminEmails.map(async email => {
    await sendEmail({ to: email, subject, html }).catch(e =>
      console.error('[adminAlerts] email to', email, 'failed:', e),
    )

    const uid = userIdByEmail.get(email)
    if (uid) {
      await createNotification({
        userId: uid,
        type:   'listing_submitted',
        title:  needsReview ? 'Listing waiting for review' : 'New broker listing is live',
        body:   bodyLine,
        link:   needsReview ? '/admin' : `/listing/${listing.id}`,
      }).catch(e => console.error('[adminAlerts] notify to', email, 'failed:', e))
    }
  }))
}
