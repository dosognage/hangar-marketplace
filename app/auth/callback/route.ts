/**
 * Handles the email confirmation redirect from Supabase.
 * Supabase appends ?code=... to the return URL; we exchange it for a
 * session and forward to ?next= (the mobile app sends
 * next=/auth/confirmed so app signups land on a "go back to the app"
 * page instead of a signed-in website they weren't using).
 *
 * Task #83: this route's absence meant every mobile signup's
 * confirmation link 404ed. Ported from HangarNight's implementation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const rawNext = req.nextUrl.searchParams.get('next') ?? '/'
  // Only same-site relative paths; anything else falls back to home so
  // the redirect can't be pointed off-site.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    const supabase = await createServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${SITE_URL}${next}`)
}
