/**
 * Per-page setup context loader. Pulls the current broker's profile and
 * computes which steps are already complete. Each step page calls this
 * server-side; the layout already enforced auth.
 *
 * SECURITY: derive broker identity by looking up broker_profiles.user_id
 * against the authenticated user.id. Never read it from JWT user_metadata
 * (end-user editable; would let an attacker run setup against any other
 * broker's profile).
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

  // Look up by user.id — the auth-trusted column on broker_profiles —
  // not by an attacker-controlled metadata id.
  const { data: profile, error } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, full_name, brokerage, phone, contact_email, bio, avatar_url, specialty_airports, alert_radius_miles, setup_completed_at, license_state, license_number, website, is_unlicensed')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) redirect('/broker/dashboard')

  const brokerProfileId = profile.id

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
