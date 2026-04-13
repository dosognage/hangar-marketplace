import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())

async function assertAdmin(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
    return null
  }
  return user
}

// ── PATCH /api/admin/requests  ────────────────────────────────────────────────
// Update status or fields on a hangar request
export async function PATCH(req: NextRequest) {
  const user = await assertAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    id: string
    status?: string
    is_priority?: boolean
    notes?: string
  }

  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.status    !== undefined) updates.status      = body.status
  if (body.is_priority !== undefined) updates.is_priority = body.is_priority
  if (body.notes     !== undefined) updates.notes       = body.notes

  const { error } = await supabaseAdmin
    .from('hangar_requests')
    .update(updates)
    .eq('id', body.id)

  if (error) {
    console.error('[PATCH /api/admin/requests]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ── DELETE /api/admin/requests  ───────────────────────────────────────────────
// Permanently delete a hangar request
export async function DELETE(req: NextRequest) {
  const user = await assertAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('hangar_requests')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[DELETE /api/admin/requests]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
