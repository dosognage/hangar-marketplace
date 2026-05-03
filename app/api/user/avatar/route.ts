import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveBrokerProfileId } from '@/lib/auth-broker'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/user/avatar
 *
 * Accepts multipart FormData with a `file` field.
 * Uploads to the user-avatars bucket under {userId}/avatar.{ext},
 * then stores the public URL in auth user_metadata.avatar_url.
 * If the user is a verified broker, also updates broker_profiles.avatar_url.
 *
 * Uses supabaseAdmin for storage to bypass RLS; auth is verified via cookie first.
 */
export async function POST(request: NextRequest) {
  // Verify auth via cookie
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file || !file.size) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload (upsert so re-uploads overwrite the old file)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('user-avatars')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('[user/avatar] upload error:', uploadError.message)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('user-avatars')
    .getPublicUrl(path)

  // Store in auth user_metadata
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: publicUrl },
  })

  // If user is a verified broker, sync avatar to broker_profiles too.
  // SECURITY: never trust user_metadata.broker_profile_id (user-editable
  // — would let an attacker overwrite a victim broker's avatar by setting
  // their own metadata to the victim's profile id). Look up by user.id.
  const brokerProfileId = await resolveBrokerProfileId(user)
  if (brokerProfileId) {
    await supabaseAdmin
      .from('broker_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', brokerProfileId)
  }

  return NextResponse.json({ publicUrl })
}
