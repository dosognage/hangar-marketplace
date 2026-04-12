import { supabaseAdmin } from '@/lib/supabase-admin'

type Listing = {
  id: string
  title: string
  airport_code: string
  city: string
  state: string
  status: string
  view_count: number
  listing_photos: { storage_path: string; display_order: number }[]
}

type Props = {
  brokerProfileId: string
  supabaseUrl: string
}

function photoUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/listing-photos/${path}`
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
      padding: '1.1rem 1.25rem', flex: '1 1 140px', minWidth: '130px',
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>{sub}</div>
      )}
    </div>
  )
}

/** Tiny SVG bar chart — last 30 days of views */
function Sparkline({ data }: { data: { date: string; views: number }[] }) {
  const max = Math.max(...data.map(d => d.views), 1)
  const W = 300, H = 48, barW = Math.floor(W / data.length) - 1

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: 'block', height: '48px' }}>
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.views / max) * H))
        return (
          <rect
            key={d.date}
            x={i * (barW + 1)}
            y={H - h}
            width={barW}
            height={h}
            rx={1}
            fill={d.views > 0 ? '#6366f1' : '#e5e7eb'}
          />
        )
      })}
    </svg>
  )
}

export default async function BrokerAnalyticsDashboard({ brokerProfileId, supabaseUrl }: Props) {
  // ── Fetch all listings for this broker (any status) ──────────────────────
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, title, airport_code, city, state, status, view_count, listing_photos(storage_path, display_order)')
    .eq('broker_profile_id', brokerProfileId)
    .order('created_at', { ascending: false })

  const safeListings = (listings ?? []) as Listing[]
  const listingIds   = safeListings.map(l => l.id)

  if (listingIds.length === 0) {
    return (
      <section style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
          📊 Your Analytics
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          No listings yet — analytics will appear here once you submit a listing.
        </p>
      </section>
    )
  }

  // ── Parallel data fetches ────────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: views30Raw },
    { data: views7Raw },
    { data: eventsRaw },
    { data: viewsByDayRaw },
    { data: photoViewsRaw },
  ] = await Promise.all([
    // Views in last 30 days
    supabaseAdmin.from('listing_views')
      .select('listing_id', { count: 'exact' })
      .in('listing_id', listingIds)
      .gte('viewed_at', thirtyDaysAgo),

    // Views in last 7 days
    supabaseAdmin.from('listing_views')
      .select('listing_id', { count: 'exact' })
      .in('listing_id', listingIds)
      .gte('viewed_at', sevenDaysAgo),

    // All events for these listings
    supabaseAdmin.from('listing_events')
      .select('listing_id, event_type')
      .in('listing_id', listingIds),

    // Views per day for sparkline (last 30 days)
    supabaseAdmin.from('listing_views')
      .select('viewed_at')
      .in('listing_id', listingIds)
      .gte('viewed_at', thirtyDaysAgo),

    // Photo views with metadata
    supabaseAdmin.from('listing_events')
      .select('listing_id, metadata')
      .in('listing_id', listingIds)
      .eq('event_type', 'photo_view'),
  ])

  // ── Compute aggregates ───────────────────────────────────────────────────
  const totalViews     = safeListings.reduce((s, l) => s + (l.view_count ?? 0), 0)
  const views30        = (views30Raw ?? []).length
  const views7         = (views7Raw  ?? []).length

  const allEvents      = eventsRaw ?? []
  const totalContacts  = allEvents.filter(e => e.event_type === 'contact_click').length
  const totalSaves     = allEvents.filter(e => e.event_type === 'save').length
  const totalShares    = allEvents.filter(e => e.event_type === 'share').length

  // Per-listing event counts
  const contactsByListing: Record<string, number> = {}
  const savesByListing:    Record<string, number> = {}
  for (const ev of allEvents) {
    if (ev.event_type === 'contact_click') contactsByListing[ev.listing_id] = (contactsByListing[ev.listing_id] ?? 0) + 1
    if (ev.event_type === 'save')          savesByListing[ev.listing_id]    = (savesByListing[ev.listing_id]    ?? 0) + 1
  }

  // Most-viewed photo per listing
  const photoViewsByListing: Record<string, Record<string, number>> = {}
  for (const ev of (photoViewsRaw ?? [])) {
    const lid   = ev.listing_id
    const path  = (ev.metadata as { photo_path?: string } | null)?.photo_path ?? ''
    if (!path) continue
    photoViewsByListing[lid] ??= {}
    photoViewsByListing[lid][path] = (photoViewsByListing[lid][path] ?? 0) + 1
  }
  function topPhoto(listingId: string): string | null {
    const byPath = photoViewsByListing[listingId]
    if (!byPath) return null
    return Object.entries(byPath).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }

  // Build 30-day sparkline
  const dayMap: Record<string, number> = {}
  for (const v of (viewsByDayRaw ?? [])) {
    const day = v.viewed_at.slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  }
  const sparkData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    return { date: key, views: dayMap[key] ?? 0 }
  })

  // Conversion rate: contacts / views (all time)
  const convRate = totalViews > 0 ? ((totalContacts / totalViews) * 100).toFixed(1) : '0.0'

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section style={{ marginTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
          📊 Your Analytics
        </h2>
        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
          Visible only to you
        </span>
      </div>

      {/* ── Summary stat cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total views"    value={totalViews.toLocaleString()} />
        <StatCard label="Last 30 days"   value={views30.toLocaleString()} sub={`${views7} last 7 days`} />
        <StatCard label="Inquiries"      value={totalContacts} sub={`${convRate}% conversion`} />
        <StatCard label="Saves"          value={totalSaves} />
        <StatCard label="Shares"         value={totalShares} />
      </div>

      {/* ── 30-day sparkline ───────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
        padding: '1.1rem 1.25rem', marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.6rem' }}>
          Views — last 30 days
        </div>
        <Sparkline data={sparkData} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
          <span style={{ fontSize: '0.65rem', color: '#d1d5db' }}>30 days ago</span>
          <span style={{ fontSize: '0.65rem', color: '#d1d5db' }}>Today</span>
        </div>
      </div>

      {/* ── Per-listing breakdown ───────────────────────────────────────── */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#374151' }}>
            Listing Breakdown
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['Listing', 'Status', 'Views', 'Inquiries', 'Saves', 'Top Photo'].map(h => (
                  <th key={h} style={{
                    padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '600',
                    color: '#6b7280', fontSize: '0.72rem', textTransform: 'uppercase',
                    letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeListings.map((listing, i) => {
                const topPhotoPath = topPhoto(listing.id)
                const coverPath    = listing.listing_photos
                  .slice().sort((a, b) => a.display_order - b.display_order)[0]?.storage_path

                const statusColor: Record<string, string> = {
                  approved: '#16a34a', pending: '#d97706', rejected: '#dc2626',
                }

                return (
                  <tr key={listing.id} style={{
                    borderTop: i === 0 ? 'none' : '1px solid #f3f4f6',
                    transition: 'background 0.1s',
                  }}>
                    {/* Listing name */}
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '220px' }}>
                      <a href={`/listing/${listing.id}`} style={{
                        fontWeight: '600', color: '#111827', textDecoration: 'none',
                        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {listing.title}
                      </a>
                      <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>
                        {listing.airport_code} · {listing.city}, {listing.state}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.7rem',
                        fontWeight: '700', textTransform: 'capitalize',
                        color: statusColor[listing.status] ?? '#6b7280',
                        backgroundColor: `${statusColor[listing.status] ?? '#6b7280'}18`,
                      }}>
                        {listing.status}
                      </span>
                    </td>

                    {/* Views */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#111827' }}>
                      {(listing.view_count ?? 0).toLocaleString()}
                    </td>

                    {/* Inquiries */}
                    <td style={{ padding: '0.85rem 1rem', color: '#374151' }}>
                      {contactsByListing[listing.id] ?? 0}
                    </td>

                    {/* Saves */}
                    <td style={{ padding: '0.85rem 1rem', color: '#374151' }}>
                      {savesByListing[listing.id] ?? 0}
                    </td>

                    {/* Top photo */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {(topPhotoPath || coverPath) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src={photoUrl(supabaseUrl, topPhotoPath ?? coverPath!)}
                            alt="Top photo"
                            style={{
                              width: '40px', height: '32px', objectFit: 'cover',
                              borderRadius: '4px', border: '1px solid #e5e7eb',
                            }}
                          />
                          {topPhotoPath && (
                            <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                              most viewed
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
