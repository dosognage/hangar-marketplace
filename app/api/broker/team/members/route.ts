/**
 * /api/broker/team/members
 *
 * POST   — add a verified broker to the caller's team (owner only)
 *          body: { broker_profile_id: string }
 * DELETE — remove a member from the team (owner only, or self-leave)
 *          body: { broker_profile_id: string }
 * GET    — search verified brokers not yet on a team (for the add-member picker)
 *          ?q=search+term
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function getCallerProfile(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, team_id, is_verified')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return null
  return profile
}

// ── GET: search available brokers ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const profile = await getCallerProfile(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  let query = supabaseAdmin
    .from('broker_profiles')
    .select('id, full_name, brokerage, avatar_url, team_id')
    .eq('is_verified', true)
    .neq('id', profile.id)      // exclude self
    .is('team_id', null)         // only brokers not already on a team

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,brokerage.ilike.%${q}%`)
  }

  const { data, error } = await query.limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ brokers: data ?? [] })
}

// ── POST: add member ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const caller = await getCallerProfile(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = (caller as { team_id?: string | null }).team_id
  if (!teamId) return NextResponse.json({ error: 'You are not part of a team' }, { status: 400 })

  // Must be owner
  const { data: team } = await supabaseAdmin
    .from('broker_teams')
    .select('owner_profile_id, name')
    .eq('id', teamId)
    .single()

  if (!team || team.owner_profile_id !== caller.id) {
    return NextResponse.json({ error: 'Only the team owner can add members' }, { status: 403 })
  }

  const { broker_profile_id } = await req.json() as { broker_profile_id: string }
  if (!broker_profile_id) return NextResponse.json({ error: 'Missing broker_profile_id' }, { status: 400 })

  // Verify the target broker is verified and not already on a team
  const { data: target } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, full_name, team_id, is_verified, user_id')
    .eq('id', broker_profile_id)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: 'Broker not found' }, { status: 404 })
  if (!(target as { is_verified?: boolean }).is_verified) {
    return NextResponse.json({ error: 'Broker must be verified to join a team' }, { status: 400 })
  }
  if ((target as { team_id?: string | null }).team_id) {
    return NextResponse.json({ error: 'Broker is already part of a team' }, { status: 400 })
  }

  // Add to team
  await supabaseAdmin
    .from('broker_profiles')
    .update({ team_id: teamId })
    .eq('id', broker_profile_id)

  // Notify the added broker
  if ((target as { user_id?: string }).user_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: (target as { user_id: string }).user_id,
      type: 'team_invite',
      title: 'You\'ve been added to a team',
      message: `You've been added to the "${team.name}" team on Hangar Marketplace.`,
      link: '/broker/dashboard',
    }).then(() => {/* non-fatal */}, () => {/* non-fatal */})
  }

  return NextResponse.json({ success: true })
}

// ── DELETE: remove member / leave team ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const caller = await getCallerProfile(req)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = (caller as { team_id?: string | null }).team_id
  if (!teamId) return NextResponse.json({ error: 'Not part of a team' }, { status: 400 })

  const { broker_profile_id } = await req.json() as { broker_profile_id: string }
  if (!broker_profile_id) return NextResponse.json({ error: 'Missing broker_profile_id' }, { status: 400 })

  const { data: team } = await supabaseAdmin
    .from('broker_teams')
    .select('owner_profile_id')
    .eq('id', teamId)
    .single()

  const isSelfLeave  = broker_profile_id === caller.id
  const isOwer       = team?.owner_profile_id === caller.id

  // Allow: owner removing anyone, or a member removing themselves
  if (!isSelfLeave && !isOwer) {
    return NextResponse.json({ error: 'Only the team owner can remove other members' }, { status: 403 })
  }

  // Owner can't leave their own team — they must disband it
  if (isSelfLeave && isOwer) {
    return NextResponse.json({ error: 'Team owners cannot leave. Disband the team instead.' }, { status: 400 })
  }

  await supabaseAdmin
    .from('broker_profiles')
    .update({ team_id: null })
    .eq('id', broker_profile_id)

  return NextResponse.json({ success: true })
}
