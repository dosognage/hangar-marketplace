import { createClient } from '@supabase/supabase-js'

export const SEAT_LIMITS: Record<string, number> = {
  starter:      1,   // owner only
  growth:       3,   // owner + 2 members
  professional: 5,   // owner + 4 members
  enterprise:   999, // effectively unlimited
}

export const TIER_LABELS: Record<string, string> = {
  starter:      'Starter',
  growth:       'Growth',
  professional: 'Professional',
  enterprise:   'Enterprise',
}

/** Returns the org owned by userId, creating a default one if none exists. */
export async function getOrCreateOrg(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try to find existing org
  const { data: existing } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', userId)
    .single()

  if (existing) return existing

  // Fetch the user's email for a default org name
  const { data: { user } } = await supabase.auth.admin.getUserById(userId)
  const defaultName = user?.user_metadata?.full_name
    ? `${user.user_metadata.full_name}'s Team`
    : `My Team`

  const { data: created, error } = await supabase
    .from('organizations')
    .insert({
      owner_id: userId,
      name: defaultName,
      subscription_tier: 'starter',
      seat_limit: SEAT_LIMITS.starter,
    })
    .select()
    .single()

  if (error) {
    console.error('[getOrCreateOrg]', error)
    return null
  }

  // Also insert an 'owner' row in organization_members for easy queries
  await supabase.from('organization_members').insert({
    org_id: created.id,
    user_id: userId,
    invited_email: user?.email ?? '',
    role: 'owner',
    status: 'active',
    accepted_at: new Date().toISOString(),
  })

  return created
}
