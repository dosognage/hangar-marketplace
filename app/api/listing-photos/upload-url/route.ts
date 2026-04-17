/**
 * POST /api/listing-photos/upload-url
 *
 * Generates a signed upload URL for a single photo using the admin key,
 * bypassing storage RLS. The client then uploads the file directly to
 * Supabase Storage using the returned token — no file proxying needed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  void req
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id, filename } = await req.json()
  if (!listing_id || !filename) {
    return NextResponse.json({ error: 'Missing listing_id or filename' }, { status: 400 })
  }

  // Build a unique storage path
  const ext = (filename.split('.').pop() ?? 'jpg').toLowerCase()
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
