/**
 * "Congratulations on the sale" page.
 *
 * The dedicated capture surface for sellers + brokers when they mark a
 * listing sold. Two reasons it lives on its own page rather than as a panel:
 *   - The flow is celebratory and deserves real estate.
 *   - We're collecting the most valuable data we have for our quarterly
 *     market intelligence reports — buyer type, multi-offer dynamics,
 *     selection reasons. A single-purpose page makes that legible.
 */

import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveBrokerProfileId } from '@/lib/auth-broker'
import MarkSoldFormClient from './MarkSoldFormClient'
import SoldSuccessCard from './SoldSuccessCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mark as sold | Hangar Marketplace',
}

type PageProps = {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ done?: string }>
}

export default async function MarkSoldPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { done } = await searchParams

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/listing/${id}/mark-sold`)

  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_name, airport_code, listing_type, property_type, asking_price, monthly_lease, sale_price, sold_at, sold_via, status, user_id, broker_profile_id, created_at')
    .eq('id', id)
    .single()
  if (error || !listing) notFound()

  // Auth: owner OR assigned broker.
  // SECURITY: never trust user_metadata.broker_profile_id (user-editable).
  const brokerProfileId = await resolveBrokerProfileId(user)
  const isOwner   = listing.user_id === user.id
  const isAssigned = !!brokerProfileId && listing.broker_profile_id === brokerProfileId
  if (!isOwner && !isAssigned) {
    redirect('/dashboard')
  }

  const isLease  = listing.listing_type === 'lease' || listing.listing_type === 'space'
  const verb     = isLease ? 'leased' : 'sold'

  // Already-sold success view (also shown right after a successful submit).
  const alreadyClosed = listing.status === 'sold' || listing.status === 'closed'
  if (alreadyClosed || done === '1') {
    // Pull any captured outcome data so we can show what they recorded.
    const { data: outcome } = await supabaseAdmin
      .from('listing_sale_outcomes')
      .select('*')
      .eq('listing_id', id)
      .maybeSingle()

    return (
      <main style={pageWrap}>
        <SoldSuccessCard
          listingId={id}
          listingTitle={listing.title}
          airportCode={listing.airport_code}
          verb={verb}
          salePrice={listing.sale_price}
          soldAt={listing.sold_at}
          soldVia={listing.sold_via}
          outcome={outcome}
        />
      </main>
    )
  }

  return (
    <main style={pageWrap}>
      <MarkSoldFormClient
        listingId={id}
        listingTitle={listing.title}
        airportCode={listing.airport_code}
        airportName={listing.airport_name}
        listingType={listing.listing_type}
        currentAskingPrice={isLease ? listing.monthly_lease : listing.asking_price}
        createdAt={listing.created_at}
      />
    </main>
  )
}

const pageWrap: React.CSSProperties = {
  maxWidth: '780px',
  margin: '0 auto',
  padding: '2rem 1.25rem 4rem',
}
