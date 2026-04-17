/**
 * /api/broker/team
 *
 * POST   — create a new team (caller becomes owner + first member)
 * PATCH  — update team info (name, description, website, logo_url) — owner only
 * DELETE — disband the team (removes team_id from all members, deletes team) — owner only
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function getVerifiedBrokerProfile(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('id, team_id, is_verified')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || !(profile as { is_verified?: boolean }).is_verified) return null
  return profile
}

// ── POST: create team ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const profile = await getVerifiedBrokerProfile(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized or not a verified broker' }, { status: 401 })

  if ((profile as { team_id?: string | null }).team_id) {
    return NextResponse.json({ error: 'You are already part of a team' }, { status: 400 })
  }

  const { name, description, website } = await req.json() as {
    name?: string
    description?: string
    website?: string
  }

  if (!name?.trim()) return NextResponse.json({ error: 'Team name is required' }, { status: 400 })

  // Create the team
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('broker_teams')
    .insert({ name: name.trim(), description: description?.trim() || null, website: website?.trim() || null, owner_profile_id: profile.id })
    .select('*')
    .single()

  if (teamErr || !team) {
    console.error('[POST /api/broker/team]', teamErr?.message)
    return NextResponse.json({ error: teamErr?.message ?? 'Failed to create team' }, { status: 500 })
  }

  // Assign the creator as the first team member
  await supabaseAdmin
    .from('broker_profiles')
    .update({ team_id: team.id })
    .eq('id', profile.id)

  return NextResponse.json({ team })
}

// ── PATCH: update team info ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const profile = await getVerifiedBrokerProfile(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = (profile as { team_id?: string | null }).team_id
  if (!teamId) return NextResponse.json({ error: 'Not part of a team' }, { status: 400 })

  // Must be team owner
  const { data: team } = await supabaseAdmin
    .from('broker_teams')
    .select('owner_profile_id')
    .eq('id', teamId)
    .single()

  if (!team || team.owner_profile_id !== profile.id) {
    return NextResponse.json({ error: 'Only the team owner can update team info' }, { status: 403 })
  }

  const body = await req.json() as {
    name?: string
    description?: string
    website?: string
    logo_url?: string
  }

  const updates: Record<string, unknown> = {}
  if (body.name        !== undefined) updates.name        = body.name.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.website     !== undefined) updates.website     = body.website?.trim() || null
  if (body.logo_url    !== undefined) updates.logo_url    = body.logo_url || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: updated, error } = await supabaseAdmin
    .from('broker_teams')
    .update(updates)
    .eq('id', teamId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ team: updated })
}

// ── DELETE: disband team ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  void req
  const profile = await getVerifiedBrokerProfile(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teamId = (profile as { team_id?: string | null }).team_id
  if (!teamId) return NextResponse.json({ error: 'Not part of a team' }, { status: 400 })

  const { data: team } = await supabaseAdmin
    .from('broker_teams')
    .select('owner_profile_id')
    .eq('id', teamId)
    .single()

  if (!team || team.owner_profile_id !== profile.id) {
    return NextResponse.json({ error: 'Only the team owner can disband the team' }, { status: 403 })
  }

  // Remove all members from the team
  await supabaseAdmin
    .from('broker_profiles')
    .update({ team_id: null })
    .eq('team_id', teamId)

  // Delete the team
  await supabaseAdmin.from('broker_teams').delete().eq('id', teamId)

  return NextResponse.json({ success: true })
}
