import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  // Verify the profile belongs to this user
  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Upload via admin client — bypasses RLS entirely
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/avatar.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('broker-avatars')
    .upload(path, buffer, { upsert: true, contentType: file.type })

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
