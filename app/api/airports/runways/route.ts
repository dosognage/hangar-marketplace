import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/airports/runways?code=KPAE
 *
 * Returns the primary (longest, non-closed) runway for a given airport ident.
 * Data lives in our own `runways` table, imported from OurAirports.
 *
 * Response:
 *   { runway_length_ft, runway_width_ft, runway_surface, found: boolean }
 */

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  // Try the exact ident first, then strip the leading K for FAA-format codes
  const idents = [code]
  if (code.startsWith('K') && code.length === 4) idents.push(code.slice(1))

  const { data: runways, error } = await supabaseAdmin
    .from('runways')
    .select('length_ft, width_ft, surface, closed')
    .in('airport_ident', idents)
    .eq('closed', false)
    .order('length_ft', { ascending: false })
    .limit(10)

  if (error) {
    console.error('[runways]', error.message)
    return NextResponse.json({ runway_length_ft: null, runway_width_ft: null, runway_surface: null, found: false })
  }

  if (!runways || runways.length === 0) {
    return NextResponse.json({ runway_length_ft: null, runway_width_ft: null, runway_surface: null, found: false })
  }

  // Pick the longest non-closed runway
  const primary = runways[0]

  return NextResponse.json({
    runway_length_ft: primary.length_ft ?? null,
    runway_width_ft:  primary.width_ft  ?? null,
    runway_surface:   primary.surface   ?? null,
    found: true,
  })
}
