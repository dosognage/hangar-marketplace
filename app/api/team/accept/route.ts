import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required.' }, { status: 400 })

  // Look up the invitation
  const { data: member, error: fetchErr } = await supabase
    .from('organization_members')
    .select('id, org_id, invited_email, status')
    .eq('invite_token', token)
    .single()

  if (fetchErr || !member) {
    return NextResponse.json({ error: 'Invitation not found or already used.' }, { status: 404 })
  }

  if (member.status === 'active') {
    return NextResponse.json({ ok: true, message: 'Already a member.' })
  }

  if (member.status === 'removed') {
    return NextResponse.json({ error: 'This invitation has been revoked.' }, { status: 410 })
  }

  // Accept: link the user_id and mark active
  const { error: updateErr } = await supabase
    .from('organization_members')
    .update({
      user_id: user.id,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', member.id)

  if (updateErr) {
    console.error('[team/accept]', updateErr)
    return NextResponse.json({ error: 'Could not accept invitation.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
