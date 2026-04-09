import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getOrCreateOrg, SEAT_LIMITS } from '@/lib/team'

const RESEND_API  = 'https://api.resend.com/emails'
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'
const FROM        = 'Hangar Marketplace <no-reply@hangarmarketplace.com>'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()

  // Get or create the org for this owner
  const org = await getOrCreateOrg(user.id)
  if (!org) return NextResponse.json({ error: 'Could not load organization.' }, { status: 500 })

  // Check: is this the owner?
  if (org.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the account owner can invite members.' }, { status: 403 })
  }

  // Check: can't invite yourself
  if (normalized === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You are already the account owner.' }, { status: 400 })
  }

  // Enforce seat limit — count active + pending (not removed) members excluding owner
  const { count } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .neq('status', 'removed')
    .neq('role', 'owner')

  const limit = SEAT_LIMITS[org.subscription_tier as keyof typeof SEAT_LIMITS] ?? 1
  // limit is total seats including owner, so member slots = limit - 1
  if ((count ?? 0) >= limit - 1) {
    return NextResponse.json({
      error: `Your ${org.subscription_tier} plan includes ${limit} seat${limit === 1 ? '' : 's'} (including you). Upgrade to invite more members.`,
    }, { status: 403 })
  }

  // Upsert the invitation (re-invite if previously removed)
  const { data: member, error: upsertErr } = await supabase
    .from('organization_members')
    .upsert({
      org_id: org.id,
      invited_email: normalized,
      role: 'member',
      status: 'pending',
      invite_token: undefined, // let DB generate a fresh token on insert; keep existing on conflict
      invited_at: new Date().toISOString(),
    }, { onConflict: 'org_id,invited_email', ignoreDuplicates: false })
    .select('invite_token, status')
    .single()

  if (upsertErr) {
    // Already active member
    if (upsertErr.code === '23505') {
      return NextResponse.json({ error: 'This person is already a team member.' }, { status: 409 })
    }
    console.error('[team/invite]', upsertErr)
    return NextResponse.json({ error: 'Could not create invitation.' }, { status: 500 })
  }

  // Fetch the token (needed if it was an existing row)
  const { data: row } = await supabase
    .from('organization_members')
    .select('invite_token')
    .eq('org_id', org.id)
    .eq('invited_email', normalized)
    .single()

  const inviteUrl = `${SITE_URL}/invite/${row?.invite_token}`
  const ownerName = user.user_metadata?.full_name ?? user.email

  // Send invite email
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    await fetch(RESEND_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: process.env.RESEND_TEST_TO ?? normalized,
        subject: `You've been invited to join ${org.name} on Hangar Marketplace`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
            <div style="background:#1a3a5c;padding:24px 32px;border-radius:8px 8px 0 0;">
              <p style="margin:0;color:white;font-size:18px;font-weight:700;">✈ Hangar Marketplace</p>
            </div>
            <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <h2 style="margin:0 0 12px;color:#111827;">You've been invited</h2>
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                <strong>${ownerName}</strong> has invited you to join their team
                (<strong>${org.name}</strong>) on Hangar Marketplace.
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                As a team member you'll be able to post and manage hangar requests
                using the shared team account.
              </p>
              <a href="${inviteUrl}"
                style="display:inline-block;margin:20px 0;padding:12px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:7px;font-weight:600;font-size:14px;">
                Accept invitation →
              </a>
              <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </div>
          </div>
        `,
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
