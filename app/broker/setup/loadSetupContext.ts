/**
 * Per-page setup context loader. Pulls the current broker's profile and
 * computes which steps are already complete. Each step page calls this
 * server-side; the layout already enforced auth so we can trust the
 * user's broker_profile_id metadata.
 */

import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { SETUP_STEPS, type BrokerProfileLike, type SetupStepId } from './steps'

export type SetupContext = {
  brokerProfileId: string
  userEmail:       string
  profile:         BrokerProfileLike & {
    id:               string
    full_name:        string
    license_state:    string | null
    license_number:   string | null
    website:          string | null
    is_unlicensed:    boolean
  }
  completedIds: Set<SetupStepId>
}

export async function loadSetupContext(): Promise<SetupContext> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/broker/setup')

  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined
  if (!brokerProfileId) redirect('/broker/dashboard')

  const { data: profile, error } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, full_name, brokerage, phone, contact_email, bio, avatar_url, specialty_airports, alert_radius_miles, setup_completed_at, license_state, license_number, website, is_unlicensed')
    .eq('id', brokerProfileId)
    .single()

  if (error || !profile) redirect('/broker/dashboard')

  const profileLike = profile as BrokerProfileLike

  const completedIds = new Set<SetupStepId>(
    SETUP_STEPS.filter(s => s.isComplete(profileLike)).map(s => s.id),
  )

  return {
    brokerProfileId,
    userEmail: user.email ?? '',
    profile:   profile as SetupContext['profile'],
    completedIds,
  }
}
