'use client'

/**
 * PhotoUploader
 *
 * Drag-and-drop (or click-to-select) photo picker.
 * - Accepts image files only
 * - Max 20 / Min 5 photos
 * - Shows live previews with a remove button on each
 * - First photo = cover photo (shown on listing cards)
 * - Calls onChange whenever the file list changes so the parent
 *   form can read the latest selection
 */

import { useRef, useState, useCallback } from 'react'

const MAX_PHOTOS = 20
const MIN_PHOTOS = 5
const MAX_FILE_MB = 10

type Props = {
  onChange: (files: File[]) => void
}

export default function PhotoUploader({ onChange }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const arr = Array.from(incoming)
      const images = arr.filter((f) => f.type.startsWith('image/'))
      const oversized = images.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024)

      if (oversized.length > 0) {
        alert(`Some files are over ${MAX_FILE_MB} MB and were skipped.`)
      }

      const valid = images.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
      const combined = [...files, ...valid].slice(0, MAX_PHOTOS)

      // Build object URL previews
      const newPreviews = combined.map((f, i) =>
        i < files.length ? previews[i] : URL.createObjectURL(f)
      )

      setFiles(combined)
      setPreviews(newPreviews)
      onChange(combined)
    },
    [files, previews, onChange]
  )

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index])
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
    onChange(newFiles)
  }

  // Drag handlers
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const remaining = MAX_PHOTOS - files.length
  const meetsMin = files.length >= MIN_PHOTOS

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: '10px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragging ? '#f0f0ff' : '#fafafa',
          transition: 'border-color 0.15s, background-color 0.15s',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
        <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
          {files.length === 0
            ? 'Click or drag photos here'
            : remaining > 0
              ? `Add more photos (${remaining} remaining)`
              : 'Maximum photos reached'}
        </p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
          JPG, PNG, WEBP · Max {MAX_FILE_MB} MB each · {MIN_PHOTOS}–{MAX_PHOTOS} photos required
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Counter + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          {files.length} / {MAX_PHOTOS} photos selected
          {files.length > 0 && ' · First photo is the cover image'}
        </span>
        {files.length > 0 && !meetsMin && (
          <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: '600' }}>
            Add {MIN_PHOTOS - files.length} more photo{MIN_PHOTOS - files.length !== 1 ? 's' : ''} (min {MIN_PHOTOS} required)
          </span>
        )}
        {meetsMin && (
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '600' }}>
            ✓ Minimum met
          </span>
        )}
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '0.6rem',
          marginTop: '0.75rem',
        }}>
          {previews.map((src, i) => (
            <div
              key={src}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden' }}
            >
              {/* Cover badge */}
              {i === 0 && (
                <span style={{
                  position: 'absolute', top: '4px', left: '4px',
                  backgroundColor: '#6366f1', color: 'white',
                  fontSize: '0.65rem', fontWeight: '700',
                  padding: '2px 6px', borderRadius: '4px', zIndex: 1,
                }}>
                  COVER
                </span>
              )}
              <img
                src={src}
                alt={`Photo ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(i) }}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '22px', height: '22px',
                  backgroundColor: 'rgba(0,0,0,0.6)', color: 'white',
                  border: 'none', borderRadius: '50%', cursor: 'pointer',
                  fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, zIndex: 1,
                }}
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
