/**
 * Shared listing-edit authorization: the listing's owner, its assigned
 * broker, or a broker on the same team. Extracted from the
 * listing-photos route so every photo endpoint (and future listing
 * mutators) share one definition (audit SEC-10).
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function canEditListing(userId: string, listingId: string): Promise<boolean> {
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('user_id, broker_profile_id')
    .eq('id', listingId)
    .single()

  if (!listing) return false
  if (listing.user_id === userId) return true

  const { data: broker } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, team_id')
    .eq('user_id', userId)
    .single()

  if (!broker) return false
  if (listing.broker_profile_id === broker.id) return true

  if ((broker as { team_id?: string | null }).team_id && listing.broker_profile_id) {
    const { data: listingBroker } = await supabaseAdmin
      .from('broker_profiles')
      .select('team_id')
      .eq('id', listing.broker_profile_id)
      .single()
    if (listingBroker && (listingBroker as { team_id?: string | null }).team_id === (broker as { team_id?: string | null }).team_id) {
      return true
    }
  }

  return false
}
