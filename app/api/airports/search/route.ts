import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Matches identifiers like KPAE, S36, 2W1, 3W0, W16, 1WA8 etc.
const LOOKS_LIKE_CODE = /^[A-Z0-9]{2,6}$/i

export async function GET(req: NextRequest) {
  const q     = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10), 20)

  if (q.length < 2) {
    return NextResponse.json([])
  }

  const isCode = LOOKS_LIKE_CODE.test(q)

  let query = supabaseAdmin
    .from('airports')
    .select('id, ident, name, type, municipality, iso_region, latitude_deg, longitude_deg, gps_code, local_code')
    .limit(limit)

  if (isCode) {
    // Ident prefix match first, fall back to name contains
    query = query.or(`ident.ilike.${q.toUpperCase()}%,name.ilike.%${q}%`)
  } else {
    // Name contains, or municipality contains
    query = query.or(`name.ilike.%${q}%,municipality.ilike.%${q}%`)
  }

  // Prefer larger airports in results
  const typeOrder: Record<string, number> = {
    large_airport: 0,
    medium_airport: 1,
    small_airport: 2,
    seaplane_base: 3,
  }

  const { data, error } = await query

  if (error) {
    console.error('[airports/search]', error.message)
    return NextResponse.json([], { status: 500 })
  }

  // Sort: larger airports first, then alphabetical by name
  const sorted = (data ?? []).sort((a, b) => {
    const ta = typeOrder[a.type] ?? 9
    const tb = typeOrder[b.type] ?? 9
    if (ta !== tb) return ta - tb
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json(sorted)
}
