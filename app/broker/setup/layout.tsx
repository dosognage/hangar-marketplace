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

export const dynamic = 'force-dynamic'

export default async function BrokerSetupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/broker/setup')
  if (user.user_metadata?.is_broker !== true) redirect('/broker/dashboard')
  if (!user.user_metadata?.broker_profile_id) redirect('/broker/dashboard')

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
