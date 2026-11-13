/**
 * Daily Facebook Page autopost for approved listings.
 *
 * One listing per run, newest approved first, so a freshly approved listing
 * goes out on the next run and older ones drain after it. The ledger in
 * public.social_posts makes it idempotent: a listing with any row is skipped
 * unless its last attempt failed and it has fewer than MAX_ATTEMPTS. Rows
 * marked 'manual' are listings Andre posted by hand.
 *
 * After each real post every admin gets an email with the post link and the
 * caption, because sharing into aviation groups is still a manual step.
 */

import { supabaseAdmin } from './supabase-admin'
import { buildListingCaption, type CaptionListing } from './socialCaptions'
import { publishToPage, facebookConfigured } from './facebook'
import { sendEmail, modernLayout, htmlEscape } from './email'
import { adminEmailList } from './auth-admin'

const CHANNEL      = 'facebook_page'
const MAX_ATTEMPTS = 3
const PHOTO_BUCKET = 'listing-photos'
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

const LISTING_FIELDS =
  'id, title, created_at, property_type, listing_type, airport_name, airport_code, city, state, square_feet, door_width, door_height, hangar_depth, bedrooms, bathrooms, home_sqft, lot_acres, runway_length_ft, runway_surface, hoa_monthly, asking_price, monthly_lease, broker_profile_id'

type ListingRow = CaptionListing & { title: string; created_at: string; broker_profile_id: string | null }
type LedgerRow  = { listing_id: string; status: string; attempts: number }

export type PlannedPost = {
  listingId:   string
  title:       string
  caption:     string
  imageUrl:    string | null
  link:        string
  priorAttempts: number | null   // null = no ledger row yet
}

export type AutopostResult =
  | { status: 'not_configured' }
  | { status: 'nothing_to_post' }
  | { status: 'dry_run'; plan: PlannedPost }
  | { status: 'busy'; listingId: string }
  | { status: 'posted'; listingId: string; postId: string; permalink: string | null }
  | { status: 'failed'; listingId: string; error: string }

/** Build the post for one listing without touching the ledger. */
export async function planPostForListing(listing: ListingRow, priorAttempts: number | null): Promise<PlannedPost> {
  let brokerName: string | null = null
  let brokerage:  string | null = null
  if (listing.broker_profile_id) {
    const { data: bp } = await supabaseAdmin
      .from('broker_profiles')
      .select('full_name, brokerage')
      .eq('id', listing.broker_profile_id)
      .maybeSingle()
    brokerName = bp?.full_name ?? null
    brokerage  = bp?.brokerage ?? null
  }

  const { data: photos } = await supabaseAdmin
    .from('listing_photos')
    .select('storage_path, display_order, created_at')
    .eq('listing_id', listing.id)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const first = photos?.[0]?.storage_path ?? null
  const imageUrl = first
    ? supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(first).data.publicUrl
    : null

  const link = `${siteUrl()}/listing/${listing.id}`
  return {
    listingId: listing.id,
    title:     listing.title,
    caption:   buildListingCaption(listing, {
      siteUrl:    siteUrl(),
      brokerName,
      brokerage,
      photoCount: photos?.length ?? 0,
    }),
    imageUrl,
    link,
    priorAttempts,
  }
}

/** Pick the next listing that should go out, or null when the queue is empty. */
export async function planNextFacebookPost(): Promise<PlannedPost | null> {
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select(LISTING_FIELDS)
    .eq('status', 'approved')
    .or('is_sample.is.null,is_sample.eq.false')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`listing query failed: ${error.message}`)
  const rows = (listings ?? []) as unknown as ListingRow[]
  if (rows.length === 0) return null

  const { data: ledger, error: ledgerErr } = await supabaseAdmin
    .from('social_posts')
    .select('listing_id, status, attempts')
    .eq('channel', CHANNEL)
    .in('listing_id', rows.map(r => r.id))
  if (ledgerErr) throw new Error(`ledger query failed: ${ledgerErr.message}`)
  const byListing = new Map((ledger as LedgerRow[] ?? []).map(r => [r.listing_id, r]))

  const next = rows.find(r => {
    const row = byListing.get(r.id)
    return !row || (row.status === 'failed' && row.attempts < MAX_ATTEMPTS)
  })
  if (!next) return null
  return planPostForListing(next, byListing.get(next.id)?.attempts ?? null)
}

/**
 * Claim the listing in the ledger before calling Facebook so two overlapping
 * runs can never double-post. Returns false when another run got there first.
 */
async function claim(plan: PlannedPost): Promise<boolean> {
  const fields = {
    status:     'posting',
    caption:    plan.caption,
    photo_url:  plan.imageUrl,
    error:      null,
    updated_at: new Date().toISOString(),
  }
  if (plan.priorAttempts === null) {
    const { error } = await supabaseAdmin
      .from('social_posts')
      .insert({ listing_id: plan.listingId, channel: CHANNEL, attempts: 1, ...fields })
    if (error?.code === '23505') return false
    if (error) throw new Error(`ledger insert failed: ${error.message}`)
    return true
  }
  const { data, error } = await supabaseAdmin
    .from('social_posts')
    .update({ ...fields, attempts: plan.priorAttempts + 1 })
    .eq('listing_id', plan.listingId)
    .eq('channel', CHANNEL)
    .eq('status', 'failed')
    .eq('attempts', plan.priorAttempts)
    .select('id')
  if (error) throw new Error(`ledger update failed: ${error.message}`)
  return (data?.length ?? 0) > 0
}

export async function runFacebookAutopost(opts: { dryRun?: boolean } = {}): Promise<AutopostResult> {
  if (!opts.dryRun && !facebookConfigured()) return { status: 'not_configured' }

  const plan = await planNextFacebookPost()
  if (!plan) return { status: 'nothing_to_post' }
  if (opts.dryRun) return { status: 'dry_run', plan }

  if (!(await claim(plan))) return { status: 'busy', listingId: plan.listingId }

  const result = await publishToPage({ message: plan.caption, imageUrl: plan.imageUrl, link: plan.link })
  const now = new Date().toISOString()

  if (result.ok) {
    await supabaseAdmin
      .from('social_posts')
      .update({
        status:           'posted',
        external_post_id: result.postId,
        permalink:        result.permalink,
        posted_at:        now,
        updated_at:       now,
      })
      .eq('listing_id', plan.listingId)
      .eq('channel', CHANNEL)
    await emailAdmins(plan, { ok: true, permalink: result.permalink })
    return { status: 'posted', listingId: plan.listingId, postId: result.postId, permalink: result.permalink }
  }

  await supabaseAdmin
    .from('social_posts')
    .update({ status: 'failed', error: result.error.slice(0, 1000), updated_at: now })
    .eq('listing_id', plan.listingId)
    .eq('channel', CHANNEL)
  await emailAdmins(plan, { ok: false, error: result.error })
  return { status: 'failed', listingId: plan.listingId, error: result.error }
}

async function emailAdmins(
  plan: PlannedPost,
  outcome: { ok: true; permalink: string | null } | { ok: false; error: string },
): Promise<void> {
  const admins = adminEmailList()
  if (admins.length === 0) return

  const captionHtml = `<p style="margin:0;font-size:14px;color:#374151;line-height:1.65;white-space:pre-wrap;">${htmlEscape(plan.caption)}</p>`
  const pageUrl = outcome.ok && outcome.permalink ? outcome.permalink : 'https://www.facebook.com/'

  const subject = outcome.ok
    ? `Posted to Facebook: ${plan.title}`
    : `Facebook post failed: ${plan.title}`

  const html = outcome.ok
    ? modernLayout({
        preheader: `${plan.title} is on the Hangar Marketplace Facebook Page. Share it into a group or two.`,
        eyebrow:   'Admin inbox',
        title:     'Posted to the Facebook Page',
        subtitle:  'The daily autopost just published this listing. Facebook does not let apps post into Groups, so sharing it into aviation groups is the one manual step.',
        sections: [
          { title: 'Caption', html: captionHtml },
          {
            title: 'Share into groups',
            html: `<p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">Open the post, tap Share, choose Share to a group, and pick a group that fits the airport or state. One or two groups per post is plenty.</p>`,
          },
        ],
        cta: { label: 'Open the post', href: pageUrl },
        secondaryCta: { label: 'View the listing', href: plan.link },
        footerIntro: `You're getting this because your email is in ADMIN_EMAILS.`,
      })
    : modernLayout({
        preheader: `The Facebook autopost could not publish ${plan.title}.`,
        eyebrow:   'Admin inbox',
        title:     'Facebook post failed',
        subtitle:  `The daily autopost tried to publish this listing and Facebook refused. It will retry on the next run, up to ${MAX_ATTEMPTS} attempts in all.`,
        sections: [
          { title: 'Error', html: `<p style="margin:0;font-size:14px;color:#b91c1c;line-height:1.6;">${htmlEscape(outcome.error)}</p>` },
          { title: 'Caption', html: captionHtml },
        ],
        cta: { label: 'View the listing', href: plan.link },
        footerIntro: `You're getting this because your email is in ADMIN_EMAILS.`,
      })

  await Promise.all(admins.map(to =>
    sendEmail({ to, subject, html }).catch(e =>
      console.error('[facebookAutopost] admin email to', to, 'failed:', e)),
  ))
}
