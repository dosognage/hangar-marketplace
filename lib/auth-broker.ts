import { supabaseAdmin } from './supabase-admin'

/**
 * Server-side resolution of the caller's verified broker_profile_id.
 *
 * BACKGROUND — why this helper exists.
 *
 * Earlier code throughout the app relied on
 *
 *   user.user_metadata?.broker_profile_id
 *
 * to figure out whether a logged-in user is acting as a verified broker.
 * That's an open auth bypass: Supabase's `user_metadata` is editable by
 * end users via `supabase.auth.updateUser({ data: { ... } })`. An attacker
 * could therefore call
 *
 *   await supabase.auth.updateUser({
 *     data: { is_broker: true, broker_profile_id: '<victim-broker-uuid>' }
 *   })
 *
 * and immediately appear, server-side, as that victim broker — gaining the
 * ability to edit / sponsor / mark-sold any listing the victim broker is
 * assigned to, open their Stripe billing portal, and overwrite their
 * profile info. Supabase's database linter flags this as ERROR-level
 * (`rls_references_user_metadata`) on any RLS policy that does the same.
 *
 * THE FIX
 *
 * Always derive broker identity from the authoritative join: the
 * caller's `user.id` (proven by the session cookie + Supabase signature
 * verification) → broker_profiles.user_id → broker_profiles.id.
 *
 * Because broker_profiles has no public INSERT/UPDATE policies (only
 * service-role can write), `user_id` is set when an admin verifies the
 * application and cannot be tampered with from the client side.
 *
 * USAGE
 *
 *   const brokerProfileId = await resolveBrokerProfileId(user)
 *   if (brokerProfileId && listing.broker_profile_id === brokerProfileId) {
 *     // caller is the assigned broker
 *   }
 *
 * Returns `null` when the user has no verified broker profile.
 */
export async function resolveBrokerProfileId(
  user: { id: string } | null | undefined,
): Promise<string | null> {
  if (!user?.id) return null

  const { data, error } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    // Don't leak DB errors to the caller — a missing/erroring profile
    // is the same outcome here as "not a broker".
    console.error('[auth-broker] lookup failed:', error.message)
    return null
  }

  return data?.id ?? null
}

/**
 * Convenience: returns true when the caller is a verified broker.
 * Same trust model as resolveBrokerProfileId — never reads user_metadata.
 */
export async function isVerifiedBroker(
  user: { id: string } | null | undefined,
): Promise<boolean> {
  return (await resolveBrokerProfileId(user)) !== null
}
