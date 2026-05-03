import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/saved-searches/unsubscribe?token=xxx
 *
 * Uses supabaseAdmin (service role) — saved_searches has no public RLS
 * policies, and we previously had a `qual: true` DELETE policy that let
 * any anon caller wipe arbitrary rows. The token is the only auth here,
 * so the WHERE notify_token=$1 is what scopes the delete to one row.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe?status=invalid', req.url))
  }

  const { error } = await supabaseAdmin
    .from('saved_searches')
    .delete()
    .eq('notify_token', token)

  if (error) {
    return NextResponse.redirect(new URL('/unsubscribe?status=error', req.url))
  }

  return NextResponse.redirect(new URL('/unsubscribe?status=ok', req.url))
}
