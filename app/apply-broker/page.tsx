/**
 * Apply for Broker Verification — server entry point
 *
 * Checks auth server-side and redirects to login if not authenticated.
 * Passes the verified user id/email down to the client form so it never
 * has to call supabase.auth.getUser() on submit (which can fail if the
 * browser session hasn't been fully initialised yet).
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import ApplyBrokerForm from './ApplyBrokerForm'

export const dynamic = 'force-dynamic'


export default async function ApplyBrokerPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/apply-broker')

  // If already a verified broker, send them straight to their dashboard
  if (user.user_metadata?.is_broker === true) redirect('/broker/dashboard')

  return <ApplyBrokerForm />
}
