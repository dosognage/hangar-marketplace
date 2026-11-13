/**
 * Plain-text social captions for a listing, built only from structured
 * fields so an automated post never repeats a seller's free-text claims.
 * House rules: no em dashes, no emoji, price or "Price on request" always
 * present, link on its own line at the end.
 */

export type CaptionListing = {
  id:               string
  property_type:    string | null
  listing_type:     string | null
  airport_name:     string | null
  airport_code:     string
  city:             string
  state:            string
  square_feet:      number | null
  door_width:       number | string | null
  door_height:      number | string | null
  hangar_depth:     number | string | null
  bedrooms:         number | null
  bathrooms:        number | string | null
  home_sqft:        number | null
  lot_acres:        number | string | null
  runway_length_ft: number | null
  runway_surface:   string | null
  hoa_monthly:      number | string | null
  asking_price:     number | string | null
  monthly_lease:    number | string | null
}

export type CaptionContext = {
  siteUrl:     string
  brokerName?: string | null
  brokerage?:  string | null
  photoCount:  number
}

// The founder's own broker profile lists house inventory; those posts carry
// no "Listed by" line, same as the hand-written post pack.
const HOUSE_BROKERAGES = new Set(['hangar marketplace'])

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const commas = (n: number) => Math.round(n).toLocaleString('en-US')
const money  = (n: number) => '$' + commas(n)

/** Strip characters the house style forbids from user-entered names. */
const clean = (s: string) =>
  s.replace(/[—–]/g, '-')
   .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
   .replace(/\s+/g, ' ')
   .trim()

/** 40.5 -> "40 ft 6 in", 50 -> "50 ft". */
function feetInches(v: number): string {
  const ft = Math.floor(v + 1e-9)
  const inches = Math.round((v - ft) * 12)
  if (inches === 0 || inches === 12) return `${inches === 12 ? ft + 1 : ft} ft`
  return `${ft} ft ${inches} in`
}
const isWholeFoot = (v: number) => Math.abs(v - Math.round(v)) < 0.01

/**
 * "Huber Airpark (E70) | Seguin, TX" -> "Huber Airpark"
 * "Tacoma Narrows Airport"           -> "Tacoma Narrows"
 * "Costin Airport"                   -> "Costin Airport" (one word left reads oddly)
 */
export function cleanAirportName(name: string | null, code: string): string {
  if (!name) return code
  let s = clean(name).split('|')[0]
  s = s.replace(new RegExp(`\\(\\s*${code}\\s*\\)`, 'i'), '').trim()
  const trimmed = s.replace(/\s+Airport$/i, '')
  if (trimmed !== s && trimmed.split(/\s+/).length >= 2) s = trimmed
  return s.replace(/[,\s]+$/, '') || code
}

function surfaceWord(s: string | null): string | null {
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower.includes('turf') || lower.includes('grass')) return 'turf'
  return lower.split(/[\s/]+/)[0] || null
}

function subject(propertyType: string | null, listingType: string | null): string {
  const kind =
    propertyType === 'airport_home'     ? 'Airport home' :
    propertyType === 'fly_in_community' ? 'Fly-in community home' :
    propertyType === 'land'             ? 'Aviation land' : 'Hangar'
  if (listingType === 'space') return `${kind === 'Hangar' ? 'Hangar space' : kind} for rent`
  if (listingType === 'lease') return `${kind} for lease`
  return `${kind} for sale`
}

export function buildListingCaption(l: CaptionListing, ctx: CaptionContext): string {
  const parts: string[] = []
  const isHangar = !l.property_type || l.property_type === 'hangar'
  const isLand   = l.property_type === 'land'

  if (isHangar) {
    const sqft = num(l.square_feet)
    if (sqft) parts.push(`${commas(sqft)} sq ft`)
    const w = num(l.door_width), h = num(l.door_height)
    if (w && h) {
      parts.push(isWholeFoot(w) && isWholeFoot(h)
        ? `${Math.round(w)} x ${Math.round(h)} ft door`
        : `door ${feetInches(w)} wide by ${feetInches(h)} high`)
    } else if (w) {
      parts.push(`${feetInches(w)} door`)
    }
    const d = num(l.hangar_depth)
    if (d) parts.push(`${feetInches(d)} deep`)
  } else if (isLand) {
    const acres = num(l.lot_acres)
    if (acres) parts.push(`${acres} acres`)
  } else {
    const bed = num(l.bedrooms), bath = num(l.bathrooms), sqft = num(l.home_sqft), acres = num(l.lot_acres)
    const rooms = [bed ? `${bed} bed` : null, bath ? `${bath} bath` : null].filter(Boolean).join(', ')
    if (rooms) parts.push(rooms)
    if (sqft) parts.push(`${commas(sqft)} sq ft${acres ? ` on ${acres} acres` : ''}`)
    else if (acres) parts.push(`${acres} acres`)
  }

  const rwy = num(l.runway_length_ft)
  if (rwy) parts.push(`${commas(rwy)} ft ${surfaceWord(l.runway_surface) ?? ''} runway`.replace(/\s+/g, ' '))
  const hoa = num(l.hoa_monthly)
  if (hoa) parts.push(`HOA ${money(hoa)} a month`)

  const sale  = num(l.asking_price)
  const lease = num(l.monthly_lease)
  const price =
    l.listing_type === 'sale' || (!l.listing_type && sale)
      ? (sale ? money(sale) : 'Price on request')
      : (lease ? `${money(lease)} a month` : 'Price on request')

  const where = `${cleanAirportName(l.airport_name, l.airport_code)} (${l.airport_code.toUpperCase()}) in ${clean(l.city)}, ${l.state.toUpperCase()}`
  const specs = parts.join(', ')
  const first = `${subject(l.property_type, l.listing_type)} at ${where}.` +
    (specs ? ` ${specs.charAt(0).toUpperCase()}${specs.slice(1)}.` : '') +
    ` ${price}.`

  const broker = ctx.brokerName ? clean(ctx.brokerName) : null
  const firm   = ctx.brokerage ? clean(ctx.brokerage) : null
  const listedBy = broker && !(firm && HOUSE_BROKERAGES.has(firm.toLowerCase()))
    ? `Listed by ${broker}${firm ? `, ${firm}` : ''}. `
    : ''
  const photos = ctx.photoCount >= 10 ? `Details and ${ctx.photoCount} photos:` : 'Details and photos:'

  return `${first}\n\n${listedBy}${photos}\n${ctx.siteUrl}/listing/${l.id}`
}
