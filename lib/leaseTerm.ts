/**
 * listings.lease_term: the shortest commitment a lease listing asks for,
 * so renters can find month-to-month space. Null means the lister did not
 * say. The DB check constraint allows exactly these four values (see
 * supabase/migrations/lease_term_and_alert_filters.sql); the mobile app
 * uses the same keys and labels (lib/listing-features.ts there).
 */

export type LeaseTerm = 'month_to_month' | 'six_months' | 'one_year' | 'multi_year'

export const LEASE_TERMS: { value: LeaseTerm; label: string }[] = [
  { value: 'month_to_month', label: 'Month-to-month' },
  { value: 'six_months',     label: '6 months' },
  { value: 'one_year',       label: '1 year' },
  { value: 'multi_year',     label: 'Multi-year' },
]

export function isLeaseTerm(v: unknown): v is LeaseTerm {
  return LEASE_TERMS.some(t => t.value === v)
}

export function leaseTermLabel(v: string | null | undefined): string | null {
  return LEASE_TERMS.find(t => t.value === v)?.label ?? null
}

/** Listing types that rent the space out, so a lease term applies. Sale-only does not. */
export function takesLeaseTerm(listingType: string | null | undefined): boolean {
  return listingType === 'lease' || listingType === 'space' || listingType === 'both'
}

/** The value to store: a valid term on a rental listing, otherwise null. */
export function parseLeaseTerm(raw: unknown, listingType: string | null | undefined): LeaseTerm | null {
  if (!takesLeaseTerm(listingType)) return null
  const v = typeof raw === 'string' ? raw.trim() : raw
  return isLeaseTerm(v) ? v : null
}
