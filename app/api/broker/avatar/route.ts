import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sniffImage } from '@/lib/image-sniff'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  // Verify auth via cookie session
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  const profileId = formData.get('profileId') as string | null

  if (!file || !profileId) {
    return NextResponse.json({ error: 'Missing file or profileId' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  // Verify the profile belongs to this user
  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // SECURITY: sniff the actual file bytes (see lib/image-sniff.ts). Never
  // trust the browser-supplied filename extension or Content-Type — both
  // are user-controlled and can be spoofed to upload HTML/SVG that the
  // public bucket will then serve with the spoofed type, triggering XSS.
  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffImage(buffer)
  if (!sniffed) {
    return NextResponse.json(
      { error: 'Unsupported image type. Upload a JPG, PNG, WebP, or GIF.' },
      { status: 400 },
    )
  }

  // Use the sniffed extension and MIME — never the filename or file.type.
  const path = `${user.id}/avatar.${sniffed.ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('broker-avatars')
    .upload(path, buffer, { upsert: true, contentType: sniffed.mime })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('broker-avatars')
    .getPublicUrl(path)

  // Save URL to broker_profiles
  const { error: updateError } = await supabaseAdmin
    .from('broker_profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', profileId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ publicUrl })
}
