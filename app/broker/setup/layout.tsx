/**
 * /broker/setup layout — auth gate + page shell.
 *
 * The progress indicator lives on each step page (which knows its own
 * `currentId`); the layout just enforces auth, loads the broker profile,
 * and provides the visual frame. Pages access the profile via the helper
 * loadSetupContext() rather than receiving it as props.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { resolveBrokerProfileId } from '@/lib/auth-broker'

export const dynamic = 'force-dynamic'

export default async function BrokerSetupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/broker/setup')
  // SECURITY: never trust user_metadata.is_broker / broker_profile_id —
  // both are end-user-editable. The presence of a broker_profiles row
  // for this user.id is the only authoritative signal.
  const brokerProfileId = await resolveBrokerProfileId(user)
  if (!brokerProfileId) redirect('/broker/dashboard')

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {children}
    </div>
  )
}
