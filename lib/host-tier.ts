/**
 * Server-side helpers for reading a host's effective subscription tier
 * and the limits / capabilities it grants.
 *
 * Tier lookup goes through host_subscriptions (single source of truth);
 * never trust a tier value cached on a listing row. Helpers degrade
 * gracefully: if no row exists, or status is cancelled/grace_period, the
 * host is treated as Free.
 */
import { HOST_TIERS, type HostTier, type HostTierSpec } from './stripe'
import { supabaseAdmin } from './supabase-admin'

/**
 * Look up a host's effective tier as of right now. Cancelled and
 * grace_period statuses revert to 'free' — they keep their card UI but
 * lose tier benefits until they re-activate (or grace expires and the
 * cron sweeper sets status=cancelled).
 */
export async function getHostTier(userId: string): Promise<HostTier> {
  const { data } = await supabaseAdmin
    .from('host_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return 'free'
  if (data.status === 'cancelled' || data.status === 'grace_period') return 'free'
  return (data.tier as HostTier) ?? 'free'
}

/** Convenience: tier spec for a host. */
export async function getHostTierSpec(userId: string): Promise<HostTierSpec> {
  const tier = await getHostTier(userId)
  return HOST_TIERS[tier]
}

/**
 * Check whether a host can add another listing given their current tier
 * cap and existing approved+pending listing count.
 *
 * Returns { ok: true } or { ok: false, reason } so callers can surface a
 * useful "upgrade to add more listings" error in the API response.
 */
export async function canCreateAnotherListing(userId: string): Promise<
  | { ok: true; tier: HostTier; used: number; limit: number }
  | { ok: false; tier: HostTier; used: number; limit: number; reason: string }
> {
  const spec = await getHostTierSpec(userId)

  // Count any listing that exists and isn't rejected — drafts, pending,
  // approved all count toward the cap. Rejected ones don't (they don't
  // appear publicly).
  const { count } = await supabaseAdmin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'rejected')

  const used = count ?? 0
  const limit = spec.listingLimit
  if (used >= limit) {
    return {
      ok: false,
      tier:  spec.id,
      used,
      limit,
      reason: limit === 1
        ? 'You can have 1 listing on the Free tier. Upgrade to Featured ($99/mo) for up to 5, or Pro ($299/mo) for unlimited.'
        : `You've reached the ${spec.label} tier's limit of ${limit} listings. Upgrade to ${spec.id === 'featured' ? 'Pro for unlimited' : 'the next tier'} listings.`,
    }
  }
  return { ok: true, tier: spec.id, used, limit }
}

/**
 * Check whether a listing can accept N more photos under the host's tier.
 * Called from /api/listing-photos POST before inserting the new rows.
 */
export async function canAddPhotos(
  userId: string,
  listingId: string,
  newPhotoCount: number,
): Promise<
  | { ok: true; tier: HostTier; existing: number; total: number; limit: number }
  | { ok: false; tier: HostTier; existing: number; limit: number; reason: string }
> {
  const spec = await getHostTierSpec(userId)
  const { count } = await supabaseAdmin
    .from('listing_photos')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)

  const existing = count ?? 0
  const total    = existing + newPhotoCount
  const limit    = spec.photoLimit
  if (total > limit) {
    const room = Math.max(0, limit - existing)
    return {
      ok:     false,
      tier:   spec.id,
      existing,
      limit,
      reason: room === 0
        ? `This listing has the maximum ${limit} photos for your ${spec.label} tier. Upgrade to add more.`
        : `Your ${spec.label} tier allows ${limit} photos per listing. You have ${existing} already; only ${room} more can be added in this upload.`,
    }
  }
  return { ok: true, tier: spec.id, existing, total, limit }
}
