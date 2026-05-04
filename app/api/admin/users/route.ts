import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth-admin'
import { verifyCurrentPassword } from '@/lib/reauth'

async function requireAdmin(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user) ? user : null
}

/**
 * DELETE /api/admin/users
 *
 * Permanently deletes a user account and all of their associated data:
 *   - saved_listings, saved_searches, email_subscribers, organization_members
 *   - listing_photos and inquiries linked to their listings
 *   - listings
 *   - broker_profiles
 *   - broker_applications
 *   - auth.users entry (via Supabase admin API)
 *
 * An admin cannot delete themselves.
 */
export async function DELETE(request: NextRequest) {
  const adminUser = await requireAdmin(request)
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, password } = await request.json()
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Safety guard: admins cannot delete themselves
    if (userId === adminUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
    }

    // Sensitive admin action: nuking a user account cascades through every
    // table they touch (listings, photos, inquiries, broker profile, the
    // auth row itself). Require fresh password proof so a stolen admin
    // session alone can't mass-delete users.
    const reauth = await verifyCurrentPassword(password)
    if (!reauth.ok) {
      return NextResponse.json({ error: reauth.error }, { status: 403 })
    }

    // ── 1. Clean up user-owned rows ───────────────────────────────────────────

    // Ancillary tables — simple user_id match
    await supabaseAdmin.from('saved_listings').delete().eq('user_id', userId)
    await supabaseAdmin.from('saved_searches').delete().eq('user_id', userId)
    await supabaseAdmin.from('email_subscribers').delete().eq('user_id', userId)
    await supabaseAdmin.from('organization_members').delete().eq('user_id', userId)

    // Listings: cascade to listing_photos and inquiries first
    const { data: userListings } = await supabaseAdmin
      .from('listings')
      .select('id')
      .eq('user_id', userId)

    const listingIds = (userListings ?? []).map(l => l.id)

    if (listingIds.length > 0) {
      await supabaseAdmin.from('listing_photos').delete().in('listing_id', listingIds)
      await supabaseAdmin.from('inquiries').delete().in('listing_id', listingIds)
      await supabaseAdmin.from('listings').delete().eq('user_id', userId)
    }

    // Broker data
    await supabaseAdmin.from('broker_applications').delete().eq('user_id', userId)
    await supabaseAdmin.from('broker_profiles').delete().eq('user_id', userId)

    // ── 2. Delete the auth user ───────────────────────────────────────────────
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('[admin/users] auth.admin.deleteUser failed:', authError.message)
      return NextResponse.json({ error: 'Failed to delete auth user: ' + authError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/users] unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
