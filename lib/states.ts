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
