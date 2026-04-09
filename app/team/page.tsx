import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getOrCreateOrg, SEAT_LIMITS, TIER_LABELS } from '@/lib/team'
import TeamManager from './TeamManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Team — Hangar Marketplace' }

export default async function TeamPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const org = await getOrCreateOrg(user.id)
  if (!org) return <p style={{ padding: '2rem' }}>Could not load team. Please refresh.</p>

  // Only the owner can manage the team
  const isOwner = org.owner_id === user.id

  // Fetch all non-removed members
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, invited_email, role, status, accepted_at, invited_at')
    .eq('org_id', org.id)
    .neq('status', 'removed')
    .order('invited_at', { ascending: true })

  const seatLimit   = SEAT_LIMITS[org.subscription_tier] ?? 1
  const activeCount = (members ?? []).filter(m => m.status !== 'removed').length
  const tierLabel   = TIER_LABELS[org.subscription_tier] ?? org.subscription_tier

  return (
    <TeamManager
      org={org}
      members={members ?? []}
      isOwner={isOwner}
      seatLimit={seatLimit}
      activeCount={activeCount}
      tierLabel={tierLabel}
      currentUserEmail={user.email ?? ''}
    />
  )
}
