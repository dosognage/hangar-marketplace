import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveBrokerProfileId } from '@/lib/auth-broker'
import { sniffImage } from '@/lib/image-sniff'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/user/avatar
 *
 * Accepts multipart FormData with a `file` field.
 * Uploads to the user-avatars bucket under {userId}/avatar.{ext},
 * then stores the public URL in auth user_metadata.avatar_url.
 * If the user is a verified broker, also updates broker_profiles.avatar_url.
 *
 * SECURITY: rejects any file whose first bytes don't match an allowlisted
 * image format, regardless of the browser-supplied Content-Type or filename.
 * SVG is intentionally NOT allowed (can embed scripts).
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

  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffImage(buffer)
  if (!sniffed) {
    return NextResponse.json(
      { error: 'Unsupported image type. Upload a JPG, PNG, WebP, or GIF.' },
      { status: 400 },
    )
  }

  // Use the SNIFFED extension + MIME, not anything from the form. Defends
  // against polyglot files (a file that's both a valid PNG AND a valid HTML
  // doc) by ensuring we always serve it as the format we verified.
  const path = `${user.id}/avatar.${sniffed.ext}`

  // Upload (upsert so re-uploads overwrite the old file)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('user-avatars')
    .upload(path, buffer, {
      contentType: sniffed.mime,
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
