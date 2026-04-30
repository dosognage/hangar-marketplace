'use client'

/**
 * ProfileForm — lets users edit their display name, phone, email, and avatar.
 *
 * Avatar upload goes directly to /api/user/avatar (bypasses RLS).
 * Name / phone / email changes go through the saveProfile server action.
 * Email changes trigger Supabase's confirmation flow.
 */

import { useActionState, useRef, useState } from 'react'
import { saveProfile, type ProfileState } from './actions'

type Props = {
  currentName:   string
  currentPhone:  string
  currentEmail:  string
  currentAvatar: string | null
  isBroker:      boolean
}

const INITIAL: ProfileState = {}

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.925rem',
  color: '#111827',
  backgroundColor: 'white',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#374151',
  marginBottom: '0.4rem',
}

export default function ProfileForm({
  currentName,
  currentPhone,
  currentEmail,
  currentAvatar,
  isBroker,
}: Props) {
  const [state, action, pending] = useActionState(saveProfile, INITIAL)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarSrc, setAvatarSrc]       = useState(currentAvatar)
  const [uploading, setUploading]       = useState(false)
  const [uploadMsg, setUploadMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  // Track the email field so we can reveal the password-confirmation input
  // only when the user is actually changing their email — no friction for
  // the common case of saving name/phone updates.
  const [emailDraft, setEmailDraft] = useState(currentEmail)
  const emailChanging = emailDraft.trim() !== '' && emailDraft.trim() !== currentEmail

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMsg(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res  = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setAvatarSrc(`${json.publicUrl}?t=${Date.now()}`)
      setUploadMsg({ ok: true, text: 'Photo updated.' })
    } catch (err) {
      setUploadMsg({ ok: false, text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
      // Reset so the same file can be re-selected
      e.target.value = ''
    }
  }

  const initials = currentName
    ? currentName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : currentEmail[0]?.toUpperCase() ?? '?'

  return (
    <div>
      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Avatar circle */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Click to change photo"
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            border: '2px solid #e5e7eb', background: '#f3f4f6',
            cursor: uploading ? 'wait' : 'pointer',
            overflow: 'hidden', flexShrink: 0, padding: 0, position: 'relative',
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Profile photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%',
              fontSize: '1.4rem', fontWeight: '700', color: '#6b7280',
            }}>
              {initials}
            </span>
          )}
          {/* Hover overlay */}
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </span>
        </button>

        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px',
              border: '1px solid #d1d5db', backgroundColor: 'white',
              color: '#374151', fontSize: '0.85rem', fontWeight: '600',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
            JPG or PNG · Max 5 MB
          </p>
          {uploadMsg && (
            <p style={{
              margin: '0.35rem 0 0', fontSize: '0.8rem',
              color: uploadMsg.ok ? '#16a34a' : '#dc2626',
            }}>
              {uploadMsg.ok ? '✓ ' : '✗ '}{uploadMsg.text}
            </p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
      </div>

      {/* ── Profile fields ─────────────────────────────────────────────────── */}
      <form action={action}>
        <div style={{ display: 'grid', gap: '1rem' }}>

          {/* Display name */}
          <div>
            <label htmlFor="full_name" style={labelStyle}>Display name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={currentName}
              placeholder="Jane Smith"
              maxLength={80}
              disabled={pending}
              style={inputStyle}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" style={labelStyle}>Phone number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={currentPhone}
              placeholder="(555) 000-0000"
              disabled={pending}
              style={inputStyle}
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
              Used only for contact on your listings. Never shown publicly on your profile.
            </p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" style={labelStyle}>
              Email
              <span style={{
                marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: '500',
                color: '#6b7280', textTransform: 'none',
              }}>
                (change requires confirmation)
              </span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={emailDraft}
              onChange={e => setEmailDraft(e.target.value)}
              disabled={pending}
              style={{
                ...inputStyle,
                borderColor: state.field === 'email' ? '#f87171' : '#d1d5db',
              }}
            />
          </div>

          {/* Password re-verification — only shown when the email is changing.
              Email is the recovery vector for the whole account, so we ask
              the user to prove they know their current password before
              kicking off the Supabase confirmation flow. */}
          {emailChanging && (
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '7px',
            }}>
              <label htmlFor="current_password" style={{ ...labelStyle, marginBottom: '0.35rem' }}>
                Confirm with your current password
              </label>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 }}>
                Changing your email is a security-sensitive action. Please re-enter your current password to continue.
              </p>
              <input
                id="current_password"
                name="current_password"
                type="password"
                required
                placeholder="Current password"
                autoComplete="current-password"
                disabled={pending}
                style={{
                  ...inputStyle,
                  borderColor: state.field === 'current_password' ? '#f87171' : '#d1d5db',
                }}
              />
            </div>
          )}

          {/* Broker sync note */}
          {isBroker && (
            <div style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '7px', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.5,
            }}>
              ✓ As a Verified Broker, your name and phone will also update your public broker profile.
            </div>
          )}

          {/* Feedback */}
          {state.success && (
            <div role="status" data-testid="profile-success" style={{
              padding: '0.6rem 0.85rem', backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0', borderRadius: '7px',
              fontSize: '0.85rem', color: '#166534',
              display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {state.success}
            </div>
          )}
          {state.error && (
            <div role="alert" data-testid="profile-error" style={{
              padding: '0.6rem 0.85rem', backgroundColor: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: '7px',
              fontSize: '0.85rem', color: '#dc2626',
            }}>
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              padding: '0.65rem 1.5rem', alignSelf: 'flex-start',
              backgroundColor: pending ? '#9ca3af' : '#1a3a5c',
              color: 'white', border: 'none', borderRadius: '7px',
              fontSize: '0.875rem', fontWeight: '700', cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
