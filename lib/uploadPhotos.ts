/**
 * Upload photos for a listing.
 *
 * Flow:
 *  1. For each file, ask the server for a signed upload URL (bypasses storage RLS)
 *  2. Upload the file directly to Supabase Storage via that URL
 *  3. Save all storage_path records to the DB via the server API (bypasses table RLS)
 *
 * Returns the saved photo records (id, storage_path, display_order).
 */

import { supabase } from '@/lib/supabase'

export type SavedPhoto = {
  id: string
  storage_path: string
  display_order: number
}

export async function uploadPhotos(
  listingId: string,
  files: File[],
  startOrder = 0,
  onProgress?: (msg: string) => void,
): Promise<SavedPhoto[]> {
  const uploaded: { storage_path: string; display_order: number }[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(`Uploading photo ${i + 1} of ${files.length}…`)

    // 1. Get a signed upload URL from the server
    const urlRes = await fetch('/api/listing-photos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, filename: file.name }),
    })

    if (!urlRes.ok) {
      const err = await urlRes.json().catch(() => ({}))
      console.warn(`Failed to get upload URL for photo ${i + 1}:`, err.error)
      continue
    }

    const { path, token } = await urlRes.json()

    // 2. Upload directly to Supabase Storage using the signed URL
    const { error: uploadErr } = await supabase.storage
      .from('listing-photos')
      .uploadToSignedUrl(path, token, file, {
        cacheControl: '3600',
        contentType: file.type,
      })

    if (uploadErr) {
      console.warn(`Storage upload failed for photo ${i + 1}:`, uploadErr.message)
      continue
    }

    uploaded.push({ storage_path: path, display_order: startOrder + i })
  }

  if (uploaded.length === 0) return []

  // 3. Save photo records via server API
  onProgress?.('Saving photo records…')
  const saveRes = await fetch('/api/listing-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listing_id: listingId, photos: uploaded }),
  })

  if (!saveRes.ok) {
    const err = await saveRes.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to save photo records')
  }

  const { photos } = await saveRes.json()
  return photos as SavedPhoto[]
}
