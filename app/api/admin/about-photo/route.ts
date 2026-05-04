import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sniffImage } from '@/lib/image-sniff'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB (admin uploads, marketing photos can be larger)

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
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
  }

  // SECURITY: sniff actual file bytes — never trust the filename extension
  // or browser-supplied Content-Type. Even though this endpoint is gated
  // to admins, defence-in-depth: if an admin account is ever compromised,
  // we don't want them able to upload an HTML payload as a "photo".
  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffImage(buffer)
  if (!sniffed) {
    return NextResponse.json(
      { error: 'Unsupported image type. Upload a JPG, PNG, WebP, or GIF.' },
      { status: 400 },
    )
  }

  // Upload to a fixed path so it's always the same URL (upsert replaces old photo)
  const { error: uploadError } = await supabaseAdmin.storage
    .from('broker-avatars')
    .upload(`about/founder.${sniffed.ext}`, buffer, {
      upsert: true,
      contentType: sniffed.mime,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Add cache-busting timestamp so Next.js picks up the new image
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('broker-avatars')
    .getPublicUrl(`about/founder.${sniffed.ext}`)

  const urlWithBust = `${publicUrl}?v=${Date.now()}`
  return NextResponse.json({ publicUrl: urlWithBust })
}
