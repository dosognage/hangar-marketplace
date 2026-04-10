import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) return null
  return user
}

/**
 * PATCH /api/admin/broker-profiles
 * Body: { profileId: string, is_hidden: boolean }
 *
 * Toggles a broker profile's visibility on the public /brokers page.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profileId, is_hidden } = await req.json() as { profileId: string; is_hidden: boolean }
  if (!profileId || typeof is_hidden !== 'boolean') {
    return NextResponse.json({ error: 'Missing profileId or is_hidden' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('broker_profiles')
    .update({ is_hidden })
    .eq('id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, is_hidden })
}
