'use client'

import { useState, useRef } from 'react'
import { uploadPhotos } from '@/lib/uploadPhotos'

type Photo = {
  id: string
  storage_path: string
  display_order: number
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function photoUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-photos/${path}`
}

// Shared style for the move-left / move-right arrow pills on hover.
function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    width: '26px', height: '26px',
    padding: 0,
    borderRadius: '50%',
    backgroundColor: 'rgba(15,23,42,0.72)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    color: 'white',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.3 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

export default function EditPhotoManager({
  listingId,
  initialPhotos,
}: {
  listingId: string
  initialPhotos: Photo[]
}) {
  const sorted = [...initialPhotos].sort((a, b) => a.display_order - b.display_order)
  const [photos, setPhotos] = useState<Photo[]>(sorted)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Delete a single photo ──────────────────────────────────────────────────
  async function handleDelete(photo: Photo) {
    setDeletingId(photo.id)
    setError('')
    try {
      const res = await fetch('/api/listing-photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photo.id, listing_id: listingId, storage_path: photo.storage_path }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Delete failed')
      const remaining = photos.filter(p => p.id !== photo.id)
      const reordered = remaining.map((p, i) => ({ ...p, display_order: i }))
      setPhotos(reordered)
      await saveOrder(reordered)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete photo. Try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Move photo left/right ──────────────────────────────────────────────────
  async function handleMove(index: number, direction: 'left' | 'right') {
    const next = [...photos]
    const swapWith = direction === 'left' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= next.length) return
    ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
    const reordered = next.map((p, i) => ({ ...p, display_order: i }))
    setPhotos(reordered)
    await saveOrder(reordered)
  }

  async function saveOrder(ordered: Photo[]) {
    await fetch('/api/listing-photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listingId,
        updates: ordered.map(p => ({ id: p.id, display_order: p.display_order })),
      }),
    })
  }

  // ── Upload new photos ──────────────────────────────────────────────────────
  async function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!fileArr.length) return
    setUploading(true)
    setError('')
    try {
      const newPhotos = await uploadPhotos(listingId, fileArr, photos.length)
      if (newPhotos.length === 0) {
        setError('No photos could be uploaded. Check file types and try again.')
        return
      }
      setPhotos(prev => [...prev, ...newPhotos])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) handleFiles(e.target.files)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151' }}>Photos</h2>

      {error && (
        <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.825rem', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Existing photos grid */}
      {photos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
          {photos.map((photo, idx) => (
            <div key={photo.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: idx === 0 ? '2px solid #6366f1' : '1px solid #e5e7eb', aspectRatio: '4/3' }}>
              {/* Cover badge */}
              {idx === 0 && (
                <div style={{ position: 'absolute', top: '5px', left: '5px', backgroundColor: '#6366f1', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', zIndex: 2 }}>
                  COVER
                </div>
              )}

              <img
                src={photoUrl(photo.storage_path)}
                alt={`Photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Overlay controls — hidden by default, revealed on hover. */}
              <div
                className="photo-tile-overlay"
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  padding: '6px',
                  background: 'linear-gradient(to bottom, rgba(15,23,42,0.35) 0%, rgba(15,23,42,0) 45%, rgba(15,23,42,0.35) 100%)',
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
              >
                {/* Delete — monochrome, matches the submit uploader. */}
                <button
                  onClick={() => handleDelete(photo)}
                  disabled={deletingId === photo.id}
                  title="Remove photo"
                  aria-label="Remove photo"
                  style={{
                    alignSelf: 'flex-end',
                    width: '26px', height: '26px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(15,23,42,0.72)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    color: 'white',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(15,23,42,0.92)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(15,23,42,0.72)' }}
                >
                  {deletingId === photo.id ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                         style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6"  y2="18" />
                      <line x1="6"  y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </button>

                {/* Move arrows — consistent dark pills, disabled states dimmed. */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleMove(idx, 'left')}
                    disabled={idx === 0}
                    title="Move left"
                    aria-label="Move left"
                    style={arrowBtn(idx === 0)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'right')}
                    disabled={idx === photos.length - 1}
                    title="Move right"
                    aria-label="Move right"
                    style={arrowBtn(idx === photos.length - 1)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1rem' }}>No photos yet. Add some below.</p>
      )}

      {/* Spin keyframes for the delete spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Upload zone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#6366f1' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '1.25rem',
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          backgroundColor: dragOver ? '#eef2ff' : '#fafafa',
          transition: 'all 0.15s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={onFileInputChange}
        />
        {uploading ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Uploading…</p>
        ) : (
          <>
            <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>
              Click or drag photos here to add
            </p>
            <p style={{ margin: 0, fontSize: '0.775rem', color: '#9ca3af' }}>
              JPG, PNG, WEBP · max 10 MB each · first photo is the cover
            </p>
          </>
        )}
      </div>
    </div>
  )
}
