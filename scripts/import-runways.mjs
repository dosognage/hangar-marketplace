/**
 * One-time import script: downloads the OurAirports runways dataset and
 * inserts US airport runways into the Supabase `runways` table.
 *
 * Run once from the project root:
 *   SUPABASE_SERVICE_ROLE_KEY=<your key> node scripts/import-runways.mjs
 *
 * Get your service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role secret
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tokvsbyokppnyxbthysd.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('❌  Set SUPABASE_SERVICE_ROLE_KEY before running this script.')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-runways.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/runways.csv'

// ── Simple CSV parser ─────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // Handle quoted fields
    const values = []
    let inQuotes = false
    let current = ''
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current); current = '' }
      else { current += char }
    }
    values.push(current)
    if (values.length < headers.length) continue
    const row = {}
    headers.forEach((h, idx) => { row[h] = values[idx]?.trim() ?? '' })
    rows.push(row)
  }
  return rows
}

// Normalize surface type to a readable label
const SURFACE_MAP = {
  'ASPH':         'Asphalt',
  'ASPH-F':       'Asphalt',
  'ASPH-G':       'Asphalt',
  'ASPH-GRVL':    'Asphalt/Gravel',
  'ASPH-GROOVET': 'Asphalt (grooved)',
  'ASPH-CONC':    'Asphalt/Concrete',
  'CONC':         'Concrete',
  'CONC-G':       'Concrete',
  'CONC-F':       'Concrete',
  'CONC-GRVL':    'Concrete/Gravel',
  'TURF':         'Turf/Grass',
  'TURF-G':       'Turf/Grass',
  'TURF-F':       'Turf/Grass',
  'TURF-GRVL':    'Turf/Gravel',
  'GRVL':         'Gravel',
  'GRVL-G':       'Gravel',
  'DIRT':         'Dirt',
  'DIRT-G':       'Dirt',
  'MATS':         'PSP/Mats',
  'WATER':        'Water',
  'SAND':         'Sand',
}

function normalizeSurface(raw) {
  if (!raw) return null
  const upper = raw.toUpperCase().trim()
  if (SURFACE_MAP[upper]) return SURFACE_MAP[upper]
  for (const [key, label] of Object.entries(SURFACE_MAP)) {
    if (upper.startsWith(key)) return label
  }
  // Return capitalized raw value
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

async function main() {
  console.log('📥  Downloading runways.csv from OurAirports…')
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`Failed to download CSV: ${res.status}`)
  const text = await res.text()
  console.log('✅  Downloaded. Parsing…')

  const rows = parseCSV(text)
  console.log(`   Total rows in CSV: ${rows.length}`)

  // Filter to US airports only (ident starts with K, or common US prefixes)
  // Also include non-K US airports like 3W0, S36, etc. by checking airport_ident
  const usRows = rows.filter(r => {
    const ident = r.airport_ident ?? ''
    // Include all — we rely on the airports table to filter. OurAirports
    // stores US airports with K-prefix (KPAE) or without (PAE, 3W0, etc.)
    return true // import all so we have complete coverage
  })

  console.log(`   Importing ${usRows.length} runways…`)

  const BATCH = 500
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < usRows.length; i += BATCH) {
    const batch = usRows.slice(i, i + BATCH).map(r => ({
      id:            parseInt(r.id, 10) || null,
      airport_ref:   parseInt(r.airport_ref, 10) || null,
      airport_ident: r.airport_ident,
      length_ft:     parseInt(r.length_ft, 10) || null,
      width_ft:      parseInt(r.width_ft, 10) || null,
      surface:       normalizeSurface(r.surface),
      lighted:       r.lighted === '1',
      closed:        r.closed === '1',
      le_ident:      r.le_ident || null,
      he_ident:      r.he_ident || null,
    })).filter(r => r.id != null)

    const { error } = await supabase
      .from('runways')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.warn(`   ⚠️  Batch ${i}–${i + BATCH}: ${error.message}`)
      skipped += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`\r   Progress: ${Math.min(i + BATCH, usRows.length)}/${usRows.length}`)
    }
  }

  console.log(`\n\n✅  Done! Inserted/updated ${inserted} runway records (${skipped} skipped).`)
}

main().catch(err => {
  console.error('❌  Import failed:', err.message)
  process.exit(1)
})
