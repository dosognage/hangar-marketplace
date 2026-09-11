/**
 * POST /api/listing-photos/upload-url
 *
 * Generates a signed upload URL for a single photo using the admin key,
 * bypassing storage RLS. The client then uploads the file directly to
 * Supabase Storage using the returned token — no file proxying needed.
 *
 * SECURITY (audit SEC-10): the caller must be allowed to edit the
 * listing (this route used to mint URLs for ANY listing_id), the
 * listing_id must be a UUID (it becomes the storage prefix), and the
 * extension is allowlisted to image types so no .html/.svg lands in
 * the public bucket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { canEditListing } from '@/lib/listing-access'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, filename } = await req.json()
  if (!listing_id || !filename) {
    return NextResponse.json({ error: 'Missing listing_id or filename' }, { status: 400 })
  }
  if (!UUID_RE.test(String(listing_id))) {
    return NextResponse.json({ error: 'Invalid listing_id' }, { status: 400 })
  }
  if (!(await canEditListing(user.id, listing_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rawExt = (String(filename).split('.').pop() ?? 'jpg').toLowerCase()
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg'
  const path = `${listing_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from('listing-photos')
    .createSignedUploadUrl(path)

  if (error || !data) {
    console.error('[upload-url]', error?.message)
    return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
  }

  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl })
}
