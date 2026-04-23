import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import NewRequestClient from './NewRequestClient'

// Uses auth cookies — never prerender statically.
export const dynamic = 'force-dynamic'

/**
 * Post a Hangar Request — server wrapper
 * Guards the page: unauthenticated users are redirected to login.
 */
export default async function NewRequestPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/requests/new')
  return <NewRequestClient />
}
