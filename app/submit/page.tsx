/**
 * /submit — server wrapper.
 *
 * Gates the route at page load: unauthenticated users are bounced to /login
 * with ?next=/submit so they come back here once they've signed in. This
 * prevents the painful pattern where someone fills out a 20-minute form,
 * clicks Submit, and only then gets sent to login (losing their data).
 *
 * The actual interactive form lives in SubmitForm.tsx (client component).
 * It also auto-saves to sessionStorage in case anything else bounces them
 * mid-flow — a refresh, a tab close, or even an auth expiry.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import SubmitForm from './SubmitForm'

// Reads auth cookies on every request — never prerender.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Submit a Listing | Hangar Marketplace',
}

export default async function SubmitPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/submit')
  }

  return <SubmitForm />
}
