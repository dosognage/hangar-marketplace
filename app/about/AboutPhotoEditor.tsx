'use client'

import { useRef, useState } from 'react'

interface Props {
  currentUrl: string | null
}

export default function AboutPhotoEditor({ currentUrl }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/admin/about-photo', { method: 'POST', body: fd })
    const json = await res.json()

    setUploading(false)

    if (!res.ok) {
      setError(json.error ?? 'Upload failed')
      return
    }

    setPreviewUrl(json.publicUrl)
  }

  return (
    <div style={{ position: 'relative', marginBottom: '1.5rem', width: 'fit-content' }}>
      {/* Photo or placeholder */}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Andre Dosogne"
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid #254e7a',
            display: 'block',
          }}
        />
      ) : (
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          backgroundColor: '#1a3a5c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '3px solid #254e7a',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <p style={{ margin: '0.4rem 0 0', color: '#93c5fd', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            No photo
          </p>
        </div>
      )}

      {/* Admin edit button — overlaid on photo */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload founder photo"
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          border: '2px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        {uploading ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {error && (
        <p style={{ margin: '0.5rem 0 0', color: '#dc2626', fontSize: '0.75rem' }}>{error}</p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
