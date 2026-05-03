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
import { supabaseAdmin } from '@/lib/supabase-admin'
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

  // ── Auto-populate contact fields ────────────────────────────────────────
  // Pull the user's most accurate name / phone / email so the form pre-fills.
  // Brokers usually have a broker_profile with their preferred contact info
  // (sometimes different from their auth email), so prefer that when present.
  // The user can still edit any of the three fields.
  const fullName  = (user.user_metadata?.full_name as string | undefined) ?? ''
  const phoneMeta = (user.user_metadata?.phone     as string | undefined) ?? ''
  const authEmail = user.email ?? ''

  let contactName  = fullName
  let contactPhone = phoneMeta
  let contactEmail = authEmail

  // SECURITY: query broker profile by auth-trusted user.id, not by an
  // attacker-supplied user_metadata.broker_profile_id (which would let
  // anyone prefill the form with any broker's contact info — minor info
  // leak but easy to close by joining on user_id instead).
  const { data: bp } = await supabaseAdmin
    .from('broker_profiles')
    .select('full_name, phone, contact_email')
    .eq('user_id', user.id)
    .maybeSingle()
  if (bp) {
    if (bp.full_name)     contactName  = bp.full_name
    if (bp.phone)         contactPhone = bp.phone
    if (bp.contact_email) contactEmail = bp.contact_email
  }

  return (
    <SubmitForm
      defaultContactName={contactName}
      defaultContactEmail={contactEmail}
      defaultContactPhone={contactPhone}
    />
  )
}
