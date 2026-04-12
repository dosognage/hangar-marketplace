/**
 * Edit Listing — Server Component wrapper
 *
 * Handles auth and data fetching on the server so there's no
 * race condition with client-side auth hydration. Passes the
 * pre-loaded listing to the interactive EditListingForm client component.
 */

import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import EditListingForm from './EditListingForm'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params

  // Auth check (server-side — no hydration race)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/listing/${id}/edit`)

  // Fetch listing via admin client to bypass RLS for broker-profile listings
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !listing) notFound()

  // Ownership check: must be the listing owner or a broker assigned to it
  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined
  const isOwner     = listing.user_id === user.id
  const isBrokerFor = brokerProfileId && listing.broker_profile_id === brokerProfileId

  if (!isOwner && !isBrokerFor) {
    redirect('/broker/dashboard')
  }

  return <EditListingForm listing={listing} />
}
