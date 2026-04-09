import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/** GET /api/saved-searches/unsubscribe?token=xxx */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe?status=invalid', req.url))
  }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('notify_token', token)

  if (error) {
    return NextResponse.redirect(new URL('/unsubscribe?status=error', req.url))
  }

  return NextResponse.redirect(new URL('/unsubscribe?status=ok', req.url))
}
