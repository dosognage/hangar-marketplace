/**
 * Per-listing "health" + improvement suggestions.
 *
 * Given a broker's listing, compute a 0-100 health score from a handful of
 * deterministic signals and emit concrete improvement suggestions. The goal
 * is to give brokers an actionable answer to "why is this performing/not"
 * without involving an LLM (deterministic = debuggable + free).
 *
 * Signals:
 *   1. Photo count        — listings with < 3 photos consistently underperform
 *   2. Description length — < 100 chars ≈ thin; 300+ ≈ rich
 *   3. View deficit       — views vs comparable listings in the same market
 *   4. Conversion rate    — inquiries / views (only meaningful with ≥ 50 views)
 *   5. Price outlier      — asking_price way above/below market median
 *   6. Sponsorship status — sponsored listings get more eyeballs
 *   7. Days-on-market     — > 90 days without an inquiry signals issues
 *
 * "Comparable" listings = same airport_code AND same property_type (hangar /
 * airport_home / land / fly_in_community). If fewer than 3 comps exist, we
 * fall back to property_type alone, then to "all approved".
 */

import { supabaseAdmin } from './supabase-admin'

export type ListingHealthInput = {
  id:             string
  title:          string
  airport_code:   string
  property_type:  string                  // 'hangar' | 'airport_home' | 'land' | 'fly_in_community'
  listing_type:   string                  // 'sale' | 'lease' | 'space'
  asking_price:   number | null
  monthly_lease:  number | null
  description:    string | null
  status:         string
  is_sponsored:   boolean
  created_at:     string                  // ISO timestamp
  photo_count:    number
  view_count:     number
  inquiry_count:  number
}

export type Severity = 'good' | 'ok' | 'warn' | 'bad'

export type Suggestion = {
  severity: Severity
  emoji:    string
  title:    string
  detail:   string
}

export type ListingHealth = {
  score:        number                    // 0-100
  band:         'Great' | 'Good' | 'Needs work' | 'At risk'
  bandColor:    string
  suggestions:  Suggestion[]              // ordered by severity desc, then importance
  comparables: {
    countSameAirport:    number
    countSameType:       number
    medianAskingPrice:   number | null
    avgViewCount:        number
    yourViewMultiple:    number          // your views / avg
  }
}

const PHOTO_TARGET = 8                    // listings with 8+ photos see ~3x conversion
const DESC_TARGET  = 300                  // chars

/** Median helper that ignores nulls / zeros. */
function median(nums: number[]): number | null {
  const sorted = nums.filter(n => n > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function priceFor(l: { listing_type: string; asking_price: number | null; monthly_lease: number | null }): number | null {
  return l.listing_type === 'lease' ? l.monthly_lease : l.asking_price
}

/**
 * Pull comparable listings (same airport + same property type) and return
 * aggregate stats. Used to ground per-listing performance in market context.
 */
async function getComparables(input: ListingHealthInput): Promise<{
  prices:        number[]
  views:         number[]
  countSameAirport: number
  countSameType:    number
}> {
  const [airportRes, typeRes] = await Promise.all([
    supabaseAdmin
      .from('listings')
      .select('asking_price, monthly_lease, listing_type, view_count')
      .eq('airport_code', input.airport_code)
      .eq('property_type', input.property_type)
      .eq('status', 'approved')
      .neq('id', input.id)
      .eq('is_sample', false),
    supabaseAdmin
      .from('listings')
      .select('asking_price, monthly_lease, listing_type, view_count')
      .eq('property_type', input.property_type)
      .eq('status', 'approved')
      .neq('id', input.id)
      .eq('is_sample', false),
  ])

  // Prefer airport-scoped comps; fall back to property-type-scoped if too thin.
  const airportComps = (airportRes.data ?? [])
  const typeComps    = (typeRes.data ?? [])
  const useAirport   = airportComps.length >= 3
  const comps        = useAirport ? airportComps : typeComps

  const prices = comps
    .map(c => priceFor(c))
    .filter((p): p is number => p !== null && p > 0)
  const views = comps.map(c => c.view_count ?? 0)

  return {
    prices,
    views,
    countSameAirport: airportComps.length,
    countSameType:    typeComps.length,
  }
}

export async function computeListingHealth(input: ListingHealthInput): Promise<ListingHealth> {
  const comps = await getComparables(input)
  const medianPrice = median(comps.prices)
  const avgViews    = avg(comps.views)
  const yourPrice   = priceFor(input)
  const viewMultiple = avgViews > 0 ? input.view_count / avgViews : 1
  const daysOnMarket = daysSince(input.created_at)

  // ── Score components ─────────────────────────────────────────────────────
  // Each component contributes 0-100 to its weighted slot. Weights chosen
  // to match what actually moves listings: photos and description first,
  // market alignment second, ops third.
  let scorePhotos       = 0   // 25% weight
  let scoreDescription  = 0   // 20%
  let scorePerformance  = 0   // 25%
  let scoreOps          = 0   // 30%

  // Photos
  if (input.photo_count >= PHOTO_TARGET)      scorePhotos = 100
  else if (input.photo_count >= 5)            scorePhotos = 75
  else if (input.photo_count >= 3)            scorePhotos = 50
  else if (input.photo_count >= 1)            scorePhotos = 25
  else                                        scorePhotos = 0

  // Description
  const descLen = (input.description ?? '').trim().length
  if (descLen >= DESC_TARGET)      scoreDescription = 100
  else if (descLen >= 200)         scoreDescription = 80
  else if (descLen >= 100)         scoreDescription = 50
  else if (descLen >= 30)          scoreDescription = 25
  else                             scoreDescription = 0

  // Performance vs comparables
  if (viewMultiple >= 1.5)         scorePerformance = 100
  else if (viewMultiple >= 0.8)    scorePerformance = 80
  else if (viewMultiple >= 0.5)    scorePerformance = 55
  else if (viewMultiple >= 0.25)   scorePerformance = 30
  else                             scorePerformance = 10

  // Ops: combination of sponsored + days-on-market + has-inquiries
  let ops = 60
  if (input.is_sponsored) ops += 20
  if (input.inquiry_count > 0) ops += 20
  if (daysOnMarket > 90 && input.inquiry_count === 0) ops -= 30
  scoreOps = Math.max(0, Math.min(100, ops))

  const score = Math.round(
    scorePhotos      * 0.25 +
    scoreDescription * 0.20 +
    scorePerformance * 0.25 +
    scoreOps         * 0.30,
  )

  // ── Band ────────────────────────────────────────────────────────────────
  let band: ListingHealth['band']
  let bandColor: string
  if (score >= 80)      { band = 'Great';      bandColor = '#16a34a' }
  else if (score >= 60) { band = 'Good';       bandColor = '#2563eb' }
  else if (score >= 40) { band = 'Needs work'; bandColor = '#d97706' }
  else                  { band = 'At risk';    bandColor = '#dc2626' }

  // ── Suggestions ─────────────────────────────────────────────────────────
  const suggestions: Suggestion[] = []

  if (input.photo_count < 3) {
    suggestions.push({
      severity: 'bad',
      emoji:    '📸',
      title:    `Add at least ${3 - input.photo_count} more photo${3 - input.photo_count === 1 ? '' : 's'}`,
      detail:   'Listings with fewer than 3 photos rarely convert. Aim for 8+ — interior, exterior, runway access, dimensions.',
    })
  } else if (input.photo_count < PHOTO_TARGET) {
    suggestions.push({
      severity: 'warn',
      emoji:    '📸',
      title:    `Add ${PHOTO_TARGET - input.photo_count} more photos to hit ${PHOTO_TARGET}`,
      detail:   'Top-performing listings have 8+ photos. Show interior, door dimensions, runway access, surrounding facilities.',
    })
  }

  if (descLen < 100) {
    suggestions.push({
      severity: 'bad',
      emoji:    '📝',
      title:    `Description is ${descLen} chars — aim for 300+`,
      detail:   'Short descriptions get skimmed past. Cover door dimensions, electrical, runway access, location convenience, and condition.',
    })
  } else if (descLen < DESC_TARGET) {
    suggestions.push({
      severity: 'warn',
      emoji:    '📝',
      title:    `Description is ${descLen} chars — aim for ${DESC_TARGET}+`,
      detail:   'Add detail on door dimensions, hangar utilities, what\'s included with the lease/sale, and surrounding amenities.',
    })
  }

  if (avgViews > 0 && viewMultiple < 0.5) {
    const pct = Math.round((1 - viewMultiple) * 100)
    suggestions.push({
      severity: 'warn',
      emoji:    '👀',
      title:    `Getting ${pct}% fewer views than similar listings`,
      detail:   `Comparable ${input.property_type.replace('_', ' ')} listings ${comps.countSameAirport >= 3 ? `at ${input.airport_code}` : 'of this type'} average ${Math.round(avgViews)} views. Yours has ${input.view_count}. Stronger title + cover photo usually moves this.`,
    })
  }

  if (yourPrice && medianPrice && yourPrice > medianPrice * 1.5) {
    const pct = Math.round((yourPrice / medianPrice - 1) * 100)
    suggestions.push({
      severity: 'warn',
      emoji:    '💰',
      title:    `Priced ${pct}% above the market median`,
      detail:   `Median for similar listings is $${medianPrice.toLocaleString()}; yours is $${yourPrice.toLocaleString()}. If the spread is justified (premium amenities, location), call that out explicitly in the description.`,
    })
  }

  if (yourPrice && medianPrice && yourPrice < medianPrice * 0.5) {
    suggestions.push({
      severity: 'ok',
      emoji:    '💰',
      title:    'Priced well below market — consider raising',
      detail:   `Median for similar listings is $${medianPrice.toLocaleString()}; yours is $${yourPrice.toLocaleString()}. You may be leaving money on the table.`,
    })
  }

  if (input.view_count >= 50 && input.inquiry_count === 0) {
    suggestions.push({
      severity: 'warn',
      emoji:    '🚪',
      title:    `${input.view_count} views, zero inquiries`,
      detail:   'High views + no inquiries usually means the photos hook visitors but the listing fails to convert. Tighten price/description, add a clear call-to-action, or sponsor for higher placement.',
    })
  }

  if (daysOnMarket > 90 && input.inquiry_count === 0) {
    suggestions.push({
      severity: 'bad',
      emoji:    '🕒',
      title:    `On market ${daysOnMarket} days with no inquiries`,
      detail:   'Time to refresh: new title, new cover photo, revised description, possibly a price reset. Stale listings drift further down search rankings.',
    })
  }

  if (!input.is_sponsored && input.view_count > 0 && input.view_count < 30) {
    suggestions.push({
      severity: 'ok',
      emoji:    '⭐',
      title:    'Consider sponsoring for visibility',
      detail:   'Sponsored listings get top placement on browse + search results. Useful when a listing is technically solid but isn\'t getting eyeballs.',
    })
  }

  // Positive case: nothing serious
  if (suggestions.length === 0) {
    suggestions.push({
      severity: 'good',
      emoji:    '🏆',
      title:    'This listing is in great shape',
      detail:   `Photos ✓, description ✓, performance ${viewMultiple >= 1 ? 'above' : 'matching'} the market. Keep it.`,
    })
  }

  // Order: bad → warn → ok → good. Within band, keep insertion order
  // (which roughly matches "most actionable first").
  const sevRank: Record<Severity, number> = { bad: 0, warn: 1, ok: 2, good: 3 }
  suggestions.sort((a, b) => sevRank[a.severity] - sevRank[b.severity])

  return {
    score,
    band,
    bandColor,
    suggestions,
    comparables: {
      countSameAirport: comps.countSameAirport,
      countSameType:    comps.countSameType,
      medianAskingPrice: medianPrice,
      avgViewCount:      avgViews,
      yourViewMultiple:  viewMultiple,
    },
  }
}
