'use client'

import { useState, useRef } from 'react'

type Props = {
  userId: string
  profileId: string
  currentAvatarUrl: string | null
  displayName: string
}

export default function AvatarUpload({ userId, profileId, currentAvatarUrl, displayName }: Props) {
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(currentAvatarUrl)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)

  const initials = displayName.charAt(0).toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }

    setUploading(true)
    setError(null)

    // Send file directly to the API route — upload happens server-side
    // using the admin client so RLS never blocks it
    const body = new FormData()
    body.append('file', file)
    body.append('profileId', profileId)

    const res = await fetch('/api/broker/avatar', { method: 'POST', body })

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Upload failed.' }))
      setError(msg ?? 'Upload failed.')
      setUploading(false)
      return
    }

    const { publicUrl } = await res.json()
    // Bust cache so the browser fetches the new image
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      {/* Avatar preview */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: '80px', height: '80px', borderRadius: '50%',
          flexShrink: 0, overflow: 'hidden', cursor: uploading ? 'default' : 'pointer',
          backgroundColor: '#1a3a5c', display: 'flex', alignItems: 'center',
          justifyContent: 'center', position: 'relative',
          border: '3px solid rgba(255,255,255,0.25)',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: 'white', fontSize: '1.8rem', fontWeight: '700' }}>
            {initials}
          </span>
        )}

        {/* Hover overlay */}
        {!uploading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.15s',
          }}
            className="avatar-overlay"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        )}

        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '0.4rem 0.9rem', backgroundColor: 'rgba(255,255,255,0.15)',
            color: 'white', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600',
            cursor: uploading ? 'default' : 'pointer', display: 'block', marginBottom: '0.3rem',
          }}
        >
          {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
        </button>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
          JPG, PNG or WebP · max 5 MB
        </p>
        {error && (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#fca5a5' }}>{error}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <style>{`
        .avatar-overlay { opacity: 0 !important; }
        div:hover > .avatar-overlay { opacity: 1 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
