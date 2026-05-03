/**
 * Post-signup welcome tour for non-broker users.
 *
 * Brokers have their own dedicated /broker/setup wizard. This page exists
 * for everyone else: pilots, buyers, sellers. Five carousel cards covering
 * the proprietary features they'd otherwise miss.
 *
 * Routing rule: /dashboard auto-redirects first-time users (no
 * welcome_seen_at stamp) here. Once they finish or skip, the action stamps
 * welcome_seen_at and they go straight to /dashboard from then on.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isVerifiedBroker } from '@/lib/auth-broker'
import WelcomeTourClient from './WelcomeTourClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Welcome | Hangar Marketplace',
}

export default async function WelcomePage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/welcome')

  // Brokers go through the dedicated setup wizard, not this tour.
  // Source from broker_profiles, not the user-editable user_metadata flag.
  if (await isVerifiedBroker(user)) {
    redirect('/broker/setup')
  }

  // Pre-fill the home airport prompt on slide 1 if they already set one
  // (e.g. from a previous session).
  const { data: prefs } = await supabaseAdmin
    .from('user_preferences')
    .select('home_airport_code, default_aircraft_id, custom_aircraft_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0]
                    ?? user.email?.split('@')[0]
                    ?? 'pilot'

  return (
    <main style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
      <WelcomeTourClient
        firstName={firstName}
        hasHomeAirport={!!prefs?.home_airport_code}
        hasAircraft={!!(prefs?.default_aircraft_id || prefs?.custom_aircraft_name)}
      />
    </main>
  )
}
