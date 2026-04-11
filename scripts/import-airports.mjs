/**
 * One-time import script: downloads the OurAirports dataset and inserts all
 * US airports into the Supabase `airports` table.
 *
 * Run once from the project root:
 *   SUPABASE_SERVICE_ROLE_KEY=<your key> node scripts/import-airports.mjs
 *
 * Get your service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role secret
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tokvsbyokppnyxbthysd.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('❌  Set SUPABASE_SERVICE_ROLE_KEY before running this script.')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-airports.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// OurAirports public dataset — CC0 license, updated daily
const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv'

// Airport types to include (excludes heliports, balloonports, closed)
const KEEP_TYPES = new Set(['large_airport', 'medium_airport', 'small_airport', 'seaplane_base'])

async function main() {
  console.log('📥  Downloading airports.csv from OurAirports…')
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching CSV`)
  const text = await res.text()
  const lines = text.split('\n')

  // Parse header
  const header = parseCSVRow(lines[0])
  const col = (name) => header.indexOf(name)

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const f = parseCSVRow(line)

    if (f[col('iso_country')] !== 'US') continue
    if (!KEEP_TYPES.has(f[col('type')])) continue

    const lat = parseFloat(f[col('latitude_deg')])
    const lng = parseFloat(f[col('longitude_deg')])
    if (isNaN(lat) || isNaN(lng)) continue

    rows.push({
      id:            parseInt(f[col('id')], 10),
      ident:         f[col('ident')]       || null,
      type:          f[col('type')]        || null,
      name:          f[col('name')]        || null,
      latitude_deg:  lat,
      longitude_deg: lng,
      elevation_ft:  parseInt(f[col('elevation_ft')], 10) || null,
      iso_region:    f[col('iso_region')]  || null,
      municipality:  f[col('municipality')] || null,
      gps_code:      f[col('gps_code')]    || null,
      iata_code:     f[col('iata_code')]   || null,
      local_code:    f[col('local_code')]  || null,
    })
  }

  console.log(`✅  Parsed ${rows.length} US airports. Inserting in batches…`)

  // Upsert in chunks of 500 to stay under Supabase request limits
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('airports')
      .upsert(chunk, { onConflict: 'id' })
    if (error) {
      console.error(`❌  Error inserting chunk at index ${i}:`, error.message)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\r   ${inserted} / ${rows.length} inserted…`)
  }

  console.log(`\n🎉  Done! ${inserted} airports imported into Supabase.`)
}

/** Minimal CSV row parser that handles quoted fields containing commas. */
function parseCSVRow(line) {
  const fields = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      fields.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur.trim())
  return fields
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1) })
