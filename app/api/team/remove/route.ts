import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getOrCreateOrg } from '@/lib/team'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId required.' }, { status: 400 })

  const org = await getOrCreateOrg(user.id)
  if (!org) return NextResponse.json({ error: 'Could not load organization.' }, { status: 500 })

  if (org.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the account owner can remove members.' }, { status: 403 })
  }

  // Verify the member belongs to this org
  const { data: member, error: fetchErr } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('id', memberId)
    .eq('org_id', org.id)
    .single()

  if (fetchErr || !member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
  }

  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the account owner.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ status: 'removed', user_id: null })
    .eq('id', memberId)
    .eq('org_id', org.id)

  if (error) {
    console.error('[team/remove]', error)
    return NextResponse.json({ error: 'Could not remove member.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
