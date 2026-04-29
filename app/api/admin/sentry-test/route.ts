import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/sentry-test
 *
 * Admin-only endpoint that throws an unhandled error so we can verify the
 * Sentry pipeline is working. Hit this URL once after deploying, then check
 * sentry.io for a new issue titled "Hangar Marketplace test error".
 *
 * Delete this file once you're satisfied things work — no harm leaving it,
 * but a redundant production endpoint is clutter.
 */

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  // Auth gate — only admins can fire test errors.
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Throw on purpose. Sentry should capture this with full stack trace.
  throw new Error('Hangar Marketplace test error — Sentry verification ping')
}
