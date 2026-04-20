import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(email: string | undefined): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes((email ?? '').toLowerCase())
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Only jpg, png, or webp allowed' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Upload to a fixed path so it's always the same URL (upsert replaces old photo)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('broker-avatars')
    .upload(`about/founder.${ext}`, buffer, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Add cache-busting timestamp so Next.js picks up the new image
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('broker-avatars')
    .getPublicUrl(`about/founder.${ext}`)

  const urlWithBust = `${publicUrl}?v=${Date.now()}`
  return NextResponse.json({ publicUrl: urlWithBust })
}
