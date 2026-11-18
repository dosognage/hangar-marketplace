/** US state slugs to display names, used for landing page routing. */
export const STATE_NAMES: Record<string, string> = {
  alabama: 'Alabama', alaska: 'Alaska', arizona: 'Arizona', arkansas: 'Arkansas',
  california: 'California', colorado: 'Colorado', connecticut: 'Connecticut',
  delaware: 'Delaware', florida: 'Florida', georgia: 'Georgia', hawaii: 'Hawaii',
  idaho: 'Idaho', illinois: 'Illinois', indiana: 'Indiana', iowa: 'Iowa',
  kansas: 'Kansas', kentucky: 'Kentucky', louisiana: 'Louisiana', maine: 'Maine',
  maryland: 'Maryland', massachusetts: 'Massachusetts', michigan: 'Michigan',
  minnesota: 'Minnesota', mississippi: 'Mississippi', missouri: 'Missouri',
  montana: 'Montana', nebraska: 'Nebraska', nevada: 'Nevada',
  'new-hampshire': 'New Hampshire', 'new-jersey': 'New Jersey',
  'new-mexico': 'New Mexico', 'new-york': 'New York',
  'north-carolina': 'North Carolina', 'north-dakota': 'North Dakota',
  ohio: 'Ohio', oklahoma: 'Oklahoma', oregon: 'Oregon', pennsylvania: 'Pennsylvania',
  'rhode-island': 'Rhode Island', 'south-carolina': 'South Carolina',
  'south-dakota': 'South Dakota', tennessee: 'Tennessee', texas: 'Texas',
  utah: 'Utah', vermont: 'Vermont', virginia: 'Virginia', washington: 'Washington',
  'west-virginia': 'West Virginia', wisconsin: 'Wisconsin', wyoming: 'Wyoming',
}

/** Convert a state display name (from DB) to URL slug */
export function stateToSlug(state: string): string {
  return state.toLowerCase().replace(/\s+/g, '-')
}

/** Convert a URL slug back to the DB state value */
export function slugToState(slug: string): string {
  return STATE_NAMES[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function slugToStateName(slug: string): string {
  return STATE_NAMES[slug] ?? slug
}

/** US state (and DC) 2-letter codes to display names. */
export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

const US_STATE_CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
)

/**
 * The 2-letter code for text that is exactly a US state: a code in any
 * case ("wa") or a full name ("Washington", "new york"). Null otherwise.
 */
export function resolveUsState(text: string | null | undefined): string | null {
  const t = (text ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return null
  const upper = t.toUpperCase()
  if (upper.length === 2 && US_STATE_NAMES[upper]) return upper
  return US_STATE_CODE_BY_NAME[t.toLowerCase()] ?? null
}
