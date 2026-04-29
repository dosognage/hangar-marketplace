/**
 * Weekly digest data aggregation + priority generation.
 *
 * Pulls a snapshot of last week's marketplace activity from Supabase and
 * derives a small set of suggested "priorities for this week" the operator
 * (Andre) should consider. Used by /api/cron/weekly-digest and the admin
 * preview endpoint.
 *
 * Design notes:
 *   - All data lives in Supabase. Stripe-level revenue would be nice but
 *     adds a dependency on Stripe API quota for a weekly read; we surface
 *     the proxy (sponsored listings + listing fees paid) which is "good
 *     enough" and updates the same week.
 *   - Priority logic is rule-based, not LLM-generated. Rules are easier to
 *     debug, deterministic, and don't burn an LLM call every Monday. If the
 *     rules ever feel stale we can layer an LLM rewriter on top.
 */

import { supabaseAdmin } from './supabase-admin'

export type DigestRange = {
  start: Date
  end:   Date
}

export type DigestSnapshot = {
  range: DigestRange

  // Activity (last 7 days)
  newListings:        number
  newListingsByType:  Record<string, number>   // hangar / airport_home / land / fly_in_community
  pendingListings:    number                   // status = 'pending' (need approval right now)
  approvedListings:   number                   // approved last 7 days
  rejectedListings:   number                   // rejected last 7 days

  newUsers:           number
  newBrokerApps:      number
  pendingBrokerApps:  number                   // open queue size right now
  brokersApproved:    number

  newInquiries:       number                   // inquiry table writes
  newSavedSearches:   number
  newRequests:        number                   // hangar requests posted
  pendingRequests:    number

  newSponsorships:    number                   // listings_fee_paid OR is_sponsored set last 7 days
  newSampleListings:  number                   // is_sample = true creations (admin seeded)

  // Errors / login alerts (proxy for issue volume)
  loginAlerts:        number                   // entries in user_login_events
}

export type Priority = {
  emoji:   string
  title:   string
  detail:  string
  cta?:    { label: string; href: string }
}

export type DigestPayload = {
  snapshot:   DigestSnapshot
  priorities: Priority[]
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

/** Last full 7-day window ending at "now". */
export function defaultRange(): DigestRange {
  const end   = new Date()
  const start = new Date(end.getTime() - 7 * 86_400_000)
  return { start, end }
}

export async function buildDigestSnapshot(range: DigestRange = defaultRange()): Promise<DigestSnapshot> {
  const startIso = range.start.toISOString()
  const endIso   = range.end.toISOString()

  // Run independent queries in parallel — order doesn't matter, just speed.
  const [
    listingsRange,
    pendingListings,
    approvedRange,
    rejectedRange,
    sponsoredRange,
    sampleRange,
    userLogins,
    brokerAppsRange,
    pendingBrokerApps,
    brokersApprovedRange,
    inquiriesRange,
    savedSearchesRange,
    requestsRange,
    pendingRequests,
    loginAlerts,
  ] = await Promise.all([
    supabaseAdmin.from('listings').select('property_type, created_at', { count: 'exact' })
      .gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true })
      .eq('status', 'rejected').gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true })
      .eq('is_sponsored', true).gte('sponsored_until', startIso),
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true })
      .eq('is_sample', true).gte('created_at', startIso).lte('created_at', endIso),
    // Use user_login_events as a proxy for "new users active in window";
    // distinct user count would require a view, this is good-enough.
    supabaseAdmin.from('user_login_events').select('user_id', { count: 'exact', head: true })
      .gte('occurred_at', startIso).lte('occurred_at', endIso),
    supabaseAdmin.from('broker_applications').select('id', { count: 'exact', head: true })
      .gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('broker_applications').select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabaseAdmin.from('broker_applications').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('inquiries').select('id', { count: 'exact', head: true })
      .gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('saved_searches').select('id', { count: 'exact', head: true })
      .gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('hangar_requests').select('id', { count: 'exact', head: true })
      .gte('created_at', startIso).lte('created_at', endIso),
    supabaseAdmin.from('hangar_requests').select('id', { count: 'exact', head: true })
      .in('status', ['active', 'open']),
    supabaseAdmin.from('user_login_events').select('id', { count: 'exact', head: true })
      .gte('occurred_at', startIso).lte('occurred_at', endIso),
  ])

  // Group new listings by property_type
  const byType: Record<string, number> = {}
  for (const row of (listingsRange.data ?? []) as Array<{ property_type: string }>) {
    byType[row.property_type] = (byType[row.property_type] ?? 0) + 1
  }

  return {
    range,
    newListings:        listingsRange.count ?? 0,
    newListingsByType:  byType,
    pendingListings:    pendingListings.count ?? 0,
    approvedListings:   approvedRange.count ?? 0,
    rejectedListings:   rejectedRange.count ?? 0,
    newUsers:           userLogins.count ?? 0,
    newBrokerApps:      brokerAppsRange.count ?? 0,
    pendingBrokerApps:  pendingBrokerApps.count ?? 0,
    brokersApproved:    brokersApprovedRange.count ?? 0,
    newInquiries:       inquiriesRange.count ?? 0,
    newSavedSearches:   savedSearchesRange.count ?? 0,
    newRequests:        requestsRange.count ?? 0,
    pendingRequests:    pendingRequests.count ?? 0,
    newSponsorships:    sponsoredRange.count ?? 0,
    newSampleListings:  sampleRange.count ?? 0,
    loginAlerts:        loginAlerts.count ?? 0,
  }
}

/**
 * Rule-based "what should I work on this week" suggestions. Rules check the
 * snapshot in priority order and emit at most three suggestions.
 *
 * Order matters: most-actionable first. A backed-up admin queue beats a
 * "consider doing more outreach" suggestion every time.
 */
export function generatePriorities(s: DigestSnapshot): Priority[] {
  const out: Priority[] = []

  // ── Rule 1: Pending broker applications (operational debt)
  if (s.pendingBrokerApps > 0) {
    out.push({
      emoji: '👔',
      title: `Review ${s.pendingBrokerApps} pending broker application${s.pendingBrokerApps === 1 ? '' : 's'}`,
      detail: 'Brokers waiting on approval can\'t list. Each delayed approval is a delayed listing.',
      cta: { label: 'Open admin queue', href: `${SITE_URL}/admin` },
    })
  }

  // ── Rule 2: Pending listings (operational debt)
  if (s.pendingListings >= 3) {
    out.push({
      emoji: '🛩️',
      title: `Approve ${s.pendingListings} pending listing${s.pendingListings === 1 ? '' : 's'}`,
      detail: 'Listing review queue is building up. Approve clean ones, surface anything that looks off.',
      cta: { label: 'Open admin → Listings', href: `${SITE_URL}/admin` },
    })
  } else if (s.pendingListings > 0) {
    out.push({
      emoji: '🛩️',
      title: `Approve ${s.pendingListings} pending listing${s.pendingListings === 1 ? '' : 's'}`,
      detail: 'Quick win — usually under 5 minutes per listing.',
      cta: { label: 'Open admin → Listings', href: `${SITE_URL}/admin` },
    })
  }

  // ── Rule 3: Pending hangar requests (lead generation opportunity)
  if (s.pendingRequests >= 5) {
    out.push({
      emoji: '📩',
      title: `${s.pendingRequests} active hangar requests are waiting`,
      detail: 'These are pilots actively looking. Consider matching them to existing listings + reaching out to nearby owners.',
      cta: { label: 'Browse requests', href: `${SITE_URL}/requests` },
    })
  }

  // ── Rule 4: Slow growth nudge
  const totalActivity = s.newListings + s.newBrokerApps + s.newRequests
  if (totalActivity < 3 && out.length < 3) {
    out.push({
      emoji: '📣',
      title: 'Outreach was light this week',
      detail: `Only ${totalActivity} new listings + broker apps + requests in the last 7 days. Consider another batch of broker outreach or a content push.`,
      cta: { label: 'Open prospect list', href: `${SITE_URL}/admin` },
    })
  }

  // ── Rule 5: New listings stats (positive nudge if quiet otherwise)
  if (s.newListings > 0 && out.length < 3) {
    const types = Object.entries(s.newListingsByType)
      .map(([t, n]) => `${n} ${t.replace('_', ' ')}`)
      .join(', ')
    out.push({
      emoji: '✨',
      title: `${s.newListings} new listing${s.newListings === 1 ? '' : 's'} this week`,
      detail: types ? `Breakdown: ${types}.` : 'New inventory grew the marketplace this week.',
    })
  }

  // ── Rule 6: Inquiries / conversion signal
  if (s.newInquiries > 0 && out.length < 3) {
    out.push({
      emoji: '💬',
      title: `${s.newInquiries} new buyer inquiries`,
      detail: 'Real demand signal. Spot-check that owners/brokers are responding promptly.',
    })
  }

  // ── Fallback: nothing notable, but at least say so
  if (out.length === 0) {
    out.push({
      emoji: '📊',
      title: 'Quiet week — nothing in the queue',
      detail: 'No pending broker apps, no pending listings, no urgent backlog. Consider using the time for outreach or content.',
    })
  }

  return out.slice(0, 3)
}

export async function buildDigest(range?: DigestRange): Promise<DigestPayload> {
  const snapshot   = await buildDigestSnapshot(range ?? defaultRange())
  const priorities = generatePriorities(snapshot)
  return { snapshot, priorities }
}
