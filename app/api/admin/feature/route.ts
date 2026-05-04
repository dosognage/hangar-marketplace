import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth-admin'

export async function PATCH(req: NextRequest) {
  // Auth: must be an admin (also enforced by proxy.ts; defence in depth)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, is_featured, days } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing listing id' }, { status: 400 })

  let featured_until: string | null = null
  if (is_featured && days) {
    const d = new Date()
    d.setDate(d.getDate() + Number(days))
    featured_until = d.toISOString()
  }

  const { error } = await supabaseAdmin
    .from('listings')
    .update({ is_featured, featured_until: is_featured ? featured_until : null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
