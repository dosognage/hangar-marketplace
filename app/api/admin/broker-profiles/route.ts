import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth-admin'

async function requireAdmin(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user) ? user : null
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

  const body = await req.json() as {
    id?: string
    profileId?: string
    is_hidden?: boolean
    is_verified?: boolean
    is_founding_broker?: boolean
  }

  const profileId = body.id ?? body.profileId
  if (!profileId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.is_hidden          === 'boolean') updates.is_hidden          = body.is_hidden
  if (typeof body.is_founding_broker === 'boolean') updates.is_founding_broker = body.is_founding_broker
  if (typeof body.is_verified === 'boolean') {
    updates.is_verified  = body.is_verified
    updates.verified_at  = body.is_verified ? new Date().toISOString() : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('broker_profiles')
    .update(updates)
    .eq('id', profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, ...updates })
}
