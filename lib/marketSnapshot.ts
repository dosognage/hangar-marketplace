/**
 * Monthly market snapshot computation.
 *
 * For the just-completed month, computes per-(airport, property_type,
 * listing_type) and rolled-up aggregates and writes them to
 * market_snapshots. Idempotent — uses ON CONFLICT to overwrite if the
 * cron runs twice for the same month.
 *
 * Why roll up at write time rather than query time?
 *   - Quarterly reports query a small dimension table (fast)
 *   - Avoids re-scanning years of listing history for trend analysis
 *   - Lets us delete old listing_views / listing_events rows without
 *     losing the historical view counts (they're already aggregated)
 */

import { supabaseAdmin } from './supabase-admin'

export type SnapshotResult = {
  snapshot_date:  string
  rows_written:   number
  duration_ms:    number
}

/**
 * Produce a snapshot for the FIRST day of the given month — i.e. if you
 * pass "2026-04-15", it snapshots the month of April 2026 with
 * snapshot_date = '2026-04-01'.
 */
export async function buildMonthlySnapshot(forDate: Date): Promise<SnapshotResult> {
  const startedAt = Date.now()
  const monthStart = new Date(Date.UTC(forDate.getUTCFullYear(), forDate.getUTCMonth(), 1))
  const monthEnd   = new Date(Date.UTC(forDate.getUTCFullYear(), forDate.getUTCMonth() + 1, 1))
  const snapshotDate = monthStart.toISOString().slice(0, 10)
  const monthStartIso = monthStart.toISOString()
  const monthEndIso   = monthEnd.toISOString()

  // Fetch all listings active at any point during the month — derived from
  // listing_history (which we backfilled with each listing's creation row).
  // For Q1 reports this gives an accurate "active inventory at this point"
  // even if listings have since been sold/deleted.
  const { data: activeListings, error } = await supabaseAdmin
    .from('listings')
    .select('id, airport_code, property_type, listing_type, asking_price, monthly_lease, sale_price, sold_at, status, created_at, view_count')
    .eq('is_sample', false)

  if (error) throw error

  type Listing = NonNullable<typeof activeListings>[number]
  const all = activeListings ?? []

  // Group by (airport, property_type, listing_type)
  const groupKey = (l: Pick<Listing, 'airport_code' | 'property_type' | 'listing_type'>) =>
    `${l.airport_code}|${l.property_type}|${l.listing_type}`

  const groups = new Map<string, Listing[]>()
  for (const l of all) {
    const key = groupKey(l)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(l)
  }

  // Add roll-ups: per-airport, per-property-type, and grand-total
  // We achieve roll-ups by re-grouping with 'all' substituted for some dims.
  // The result is: each listing contributes to 4 groups
  //   (airport, type, listing_type), (airport, type, all), (airport, all, all), (all, all, all)
  // — we'll compute the original groups + add the three roll-ups manually.
  function rollupKey(airport: string, type: string, listingType: string) {
    return `${airport}|${type}|${listingType}`
  }
  const rollupGroups = new Map<string, Listing[]>()
  for (const l of all) {
    const dims: Array<[string, string, string]> = [
      [l.airport_code,  l.property_type,  l.listing_type],
      [l.airport_code,  l.property_type,  'all'],
      [l.airport_code,  'all',            'all'],
      ['all',           l.property_type,  'all'],
      ['all',           'all',            'all'],
    ]
    for (const [a, p, lt] of dims) {
      const k = rollupKey(a, p, lt)
      if (!rollupGroups.has(k)) rollupGroups.set(k, [])
      rollupGroups.get(k)!.push(l)
    }
  }

  // Helper aggregations
  const numeric = (xs: (number | null | undefined)[]) =>
    xs.map(x => (x ?? 0)).filter(x => x > 0).sort((a, b) => a - b)

  const median = (sorted: number[]): number | null => {
    if (sorted.length === 0) return null
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }
  const avg = (sorted: number[]): number | null => {
    if (sorted.length === 0) return null
    return sorted.reduce((s, n) => s + n, 0) / sorted.length
  }
  const percentile = (sorted: number[], p: number): number | null => {
    if (sorted.length === 0) return null
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
    return sorted[idx]
  }

  // Build rows for insert
  const rows: Record<string, unknown>[] = []
  for (const [key, list] of rollupGroups) {
    const [airport_code, property_type, listing_type] = key.split('|')

    // Active count = listings that exist now and aren't sold/closed
    const activeNow = list.filter(l => l.status !== 'sold' && l.status !== 'closed' && l.status !== 'rejected')
    // New in month = created within the window
    const newThisMonth = list.filter(l => {
      const c = new Date(l.created_at).getTime()
      return c >= monthStart.getTime() && c < monthEnd.getTime()
    })
    // Sold in month = sold_at within the window
    const soldThisMonth = list.filter(l => {
      if (!l.sold_at) return false
      const t = new Date(l.sold_at).getTime()
      return t >= monthStart.getTime() && t < monthEnd.getTime()
    })

    // Asking-price stats from currently-active listings in this bucket
    const askingPrices = numeric(activeNow.map(l => l.asking_price))
    const monthlyLeases = numeric(
      activeNow.filter(l => l.listing_type === 'lease' || listing_type === 'all').map(l => l.monthly_lease),
    )

    // Sale-price stats from sold-this-month listings (only meaningful when
    // sold_in_month > 0 and the listing actually has a sale_price set).
    const salePrices = numeric(soldThisMonth.map(l => l.sale_price))

    // Time-on-market for sold-this-month listings (days from creation to sold_at)
    const tomDays = soldThisMonth
      .filter(l => l.sold_at)
      .map(l => Math.floor((new Date(l.sold_at!).getTime() - new Date(l.created_at).getTime()) / 86_400_000))
      .filter(d => d >= 0)
      .sort((a, b) => a - b)

    rows.push({
      snapshot_date:          snapshotDate,
      airport_code,
      property_type,
      listing_type,
      active_count:           activeNow.length,
      new_listings_in_month:  newThisMonth.length,
      sold_in_month:          soldThisMonth.length,
      removed_in_month:       0, // computed from listing_history below
      median_asking_price:    median(askingPrices),
      avg_asking_price:       avg(askingPrices),
      min_asking_price:       askingPrices[0] ?? null,
      max_asking_price:       askingPrices[askingPrices.length - 1] ?? null,
      p25_asking_price:       percentile(askingPrices, 0.25),
      p75_asking_price:       percentile(askingPrices, 0.75),
      median_monthly_lease:   median(monthlyLeases),
      avg_monthly_lease:      avg(monthlyLeases),
      median_sale_price:      median(salePrices),
      avg_sale_price:         avg(salePrices),
      median_days_on_market:  tomDays.length > 0 ? Math.round(median(tomDays) ?? 0) : null,
      total_views_in_month:   0, // populated below from listing_views
      total_inquiries_in_month: 0,
      computed_at:            new Date().toISOString(),
    })
  }

  // Augment with view + inquiry counts. We pull both for the month and
  // attribute back to each group based on the listing's dims.
  const [{ data: viewsThisMonth }, { data: inqThisMonth }] = await Promise.all([
    supabaseAdmin
      .from('listing_views')
      .select('listing_id')
      .gte('viewed_at', monthStartIso)
      .lt('viewed_at',  monthEndIso),
    supabaseAdmin
      .from('inquiries')
      .select('listing_id')
      .gte('created_at', monthStartIso)
      .lt('created_at',  monthEndIso),
  ])

  const listingDims = new Map<string, [string, string, string]>()
  for (const l of all) {
    listingDims.set(l.id, [l.airport_code, l.property_type, l.listing_type])
  }

  // Roll up views/inquiries into the same 5 dimension buckets used above
  for (const v of (viewsThisMonth ?? [])) {
    const dims = listingDims.get(v.listing_id)
    if (!dims) continue
    const [a, p, lt] = dims
    const buckets: Array<[string, string, string]> = [
      [a, p, lt], [a, p, 'all'], [a, 'all', 'all'], ['all', p, 'all'], ['all', 'all', 'all'],
    ]
    for (const [aa, pp, ll] of buckets) {
      const row = rows.find(r => r.airport_code === aa && r.property_type === pp && r.listing_type === ll)
      if (row) (row.total_views_in_month as number)++
    }
  }
  for (const i of (inqThisMonth ?? [])) {
    const dims = listingDims.get(i.listing_id)
    if (!dims) continue
    const [a, p, lt] = dims
    const buckets: Array<[string, string, string]> = [
      [a, p, lt], [a, p, 'all'], [a, 'all', 'all'], ['all', p, 'all'], ['all', 'all', 'all'],
    ]
    for (const [aa, pp, ll] of buckets) {
      const row = rows.find(r => r.airport_code === aa && r.property_type === pp && r.listing_type === ll)
      if (row) (row.total_inquiries_in_month as number)++
    }
  }

  // Compute removed_in_month from listing_history (status_to = 'deleted'
  // events within the window).
  const { data: removedHist } = await supabaseAdmin
    .from('listing_history')
    .select('airport_code, property_type, listing_type')
    .eq('status_to', 'deleted')
    .gte('changed_at', monthStartIso)
    .lt('changed_at',  monthEndIso)
  for (const r of (removedHist ?? [])) {
    const buckets: Array<[string, string, string]> = [
      [r.airport_code ?? 'all', r.property_type ?? 'all', r.listing_type ?? 'all'],
      [r.airport_code ?? 'all', r.property_type ?? 'all', 'all'],
      [r.airport_code ?? 'all', 'all', 'all'],
      ['all', r.property_type ?? 'all', 'all'],
      ['all', 'all', 'all'],
    ]
    for (const [aa, pp, ll] of buckets) {
      const row = rows.find(rr => rr.airport_code === aa && rr.property_type === pp && rr.listing_type === ll)
      if (row) (row.removed_in_month as number)++
    }
  }

  // Upsert in batches (Supabase has a 1000-row limit per request).
  const BATCH = 500
  let written = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const { error: upErr } = await supabaseAdmin
      .from('market_snapshots')
      .upsert(slice, { onConflict: 'snapshot_date,airport_code,property_type,listing_type' })
    if (upErr) throw upErr
    written += slice.length
  }

  return {
    snapshot_date: snapshotDate,
    rows_written:  written,
    duration_ms:   Date.now() - startedAt,
  }
}
