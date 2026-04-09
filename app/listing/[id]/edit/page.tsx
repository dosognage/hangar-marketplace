'use client'

/**
 * Edit Listing page
 *
 * Pre-fills all listing fields so the seller can update and resubmit.
 * Saving resets status to "pending" so admin reviews the changes.
 */

import { useEffect, useState, useActionState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { updateListing, type UpdateState } from '@/app/actions/listings'

type Listing = {
  id: string
  title: string
  airport_name: string
  airport_code: string
  city: string
  state: string
  listing_type: string
  ownership_type: string
  asking_price: number | null
  monthly_lease: number | null
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  description: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
}

export default function EditListingPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [listingType, setListingType] = useState('sale')

  const boundUpdate = updateListing.bind(null, id)
  const [state, formAction, isPending] = useActionState<UpdateState, FormData>(boundUpdate, null)

  useEffect(() => {
    async function load() {
      // Verify user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        setLoadError('Listing not found or you don\'t have permission to edit it.')
        return
      }
      setListing(data as Listing)
      setListingType(data.listing_type)
    }
    load()
  }, [id, router])

  if (loadError) {
    return (
      <div style={{ maxWidth: '700px' }}>
        <Link href="/dashboard" style={backLink}>← Back to dashboard</Link>
        <p style={{ color: '#dc2626', marginTop: '1rem' }}>{loadError}</p>
      </div>
    )
  }

  if (!listing) {
    return (
      <div style={{ maxWidth: '700px' }}>
        <Link href="/dashboard" style={backLink}>← Back to dashboard</Link>
        <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <Link href="/dashboard" style={backLink}>← Back to dashboard</Link>
      <h1 style={{ margin: '1rem 0 0.25rem' }}>Edit Listing</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Saving will reset your listing to <strong>pending review</strong> so the admin can approve your changes.
      </p>

      {state?.error && <div style={errorBox}>{state.error}</div>}

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Title */}
        <Field label="Listing Title">
          <input name="title" defaultValue={listing.title} required style={inputStyle} />
        </Field>

        {/* Airport */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem' }}>
          <Field label="Airport Name">
            <input name="airport_name" defaultValue={listing.airport_name} required style={inputStyle} />
          </Field>
          <Field label="Airport Code">
            <input name="airport_code" defaultValue={listing.airport_code} required style={inputStyle} />
          </Field>
        </div>

        {/* City / State */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem' }}>
          <Field label="City">
            <input name="city" defaultValue={listing.city} required style={inputStyle} />
          </Field>
          <Field label="State">
            <input name="state" defaultValue={listing.state} required style={inputStyle} />
          </Field>
        </div>

        {/* Listing type */}
        <Field label="Listing Type">
          <select
            name="listing_type"
            defaultValue={listing.listing_type}
            onChange={e => setListingType(e.target.value)}
            style={inputStyle}
          >
            <option value="sale">For Sale</option>
            <option value="lease">For Lease</option>
          </select>
        </Field>

        {/* Price */}
        {listingType === 'sale' ? (
          <Field label="Asking Price ($)">
            <input name="asking_price" type="number" min="0" defaultValue={listing.asking_price ?? ''} style={inputStyle} />
          </Field>
        ) : (
          <Field label="Monthly Lease ($)">
            <input name="monthly_lease" type="number" min="0" defaultValue={listing.monthly_lease ?? ''} style={inputStyle} />
          </Field>
        )}

        {/* Ownership */}
        <Field label="Ownership Type">
          <select name="ownership_type" defaultValue={listing.ownership_type} style={inputStyle}>
            <option value="">Select…</option>
            <option value="fee simple">Fee Simple (own the land)</option>
            <option value="leasehold">Leasehold (lease the land)</option>
            <option value="condo">Hangar Condo</option>
            <option value="T-hangar">T-Hangar</option>
            <option value="Business">Business</option>
          </select>
        </Field>

        {/* Dimensions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <Field label="Square Feet">
            <input name="square_feet" type="number" min="0" defaultValue={listing.square_feet ?? ''} style={inputStyle} />
          </Field>
          <Field label="Door Width (ft)">
            <input name="door_width" type="number" min="0" defaultValue={listing.door_width ?? ''} style={inputStyle} />
          </Field>
          <Field label="Door Height (ft)">
            <input name="door_height" type="number" min="0" defaultValue={listing.door_height ?? ''} style={inputStyle} />
          </Field>
        </div>

        {/* Description */}
        <Field label="Description">
          <textarea
            name="description"
            rows={5}
            defaultValue={listing.description ?? ''}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        {/* Contact */}
        <Field label="Contact Name">
          <input name="contact_name" defaultValue={listing.contact_name} required style={inputStyle} />
        </Field>
        <Field label="Contact Email">
          <input name="contact_email" type="email" defaultValue={listing.contact_email} required style={inputStyle} />
        </Field>
        <Field label="Contact Phone (optional)">
          <input name="contact_phone" defaultValue={listing.contact_phone ?? ''} style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="submit" disabled={isPending} style={saveBtn}>
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
          <Link href="/dashboard" style={cancelLink}>Cancel</Link>
        </div>
      </form>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const backLink: React.CSSProperties = {
  color: '#6366f1',
  textDecoration: 'none',
  fontSize: '0.875rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  color: '#111827',
  backgroundColor: 'white',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#374151',
}

const saveBtn: React.CSSProperties = {
  padding: '0.65rem 1.5rem',
  backgroundColor: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
}

const cancelLink: React.CSSProperties = {
  padding: '0.65rem 1rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  color: '#6b7280',
  textDecoration: 'none',
  display: 'inline-block',
}

const errorBox: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '0.75rem 1rem',
  color: '#dc2626',
  fontSize: '0.875rem',
  marginBottom: '1rem',
}
