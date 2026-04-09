'use client'

/**
 * Submit Listing page
 *
 * Flow:
 *  1. User fills out listing details and selects 5–20 photos
 *  2. On submit:
 *     a. Insert listing → get back the new listing ID
 *     b. Upload each photo to Supabase Storage under listing-photos/{listingId}/
 *     c. Insert a row in listing_photos for each uploaded file
 *  3. Show success (or a clear error if something went wrong)
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PhotoUploader from '@/app/components/PhotoUploader'

const MIN_PHOTOS = 5

const EMPTY_FORM = {
  title: '',
  airport_name: '',
  airport_code: '',
  city: '',
  state: '',
  listing_type: 'sale',
  ownership_type: '',
  asking_price: '',
  monthly_lease: '',
  square_feet: '',
  door_width: '',
  door_height: '',
  hangar_depth: '',
  description: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
}

// Listings that require a monthly rate (not a sale price)
const IS_RENTAL = (t: string) => t === 'lease' || t === 'space'

export default function SubmitPage() {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [photos, setPhotos] = useState<File[]>([])
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotosChange = useCallback((files: File[]) => {
    setPhotos(files)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)

    if (photos.length < MIN_PHOTOS) {
      setStatus({ type: 'error', message: `Please upload at least ${MIN_PHOTOS} photos before submitting.` })
      return
    }

    setLoading(true)

    try {
      // ── Step 1: Insert the listing ──────────────────────────────────────
      setUploadProgress('Saving listing…')

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert([{
          title: formData.title,
          airport_name: formData.airport_name,
          airport_code: formData.airport_code,
          city: formData.city,
          state: formData.state,
          listing_type: formData.listing_type,
          ownership_type: formData.ownership_type,
          asking_price: formData.listing_type === 'sale' && formData.asking_price ? Number(formData.asking_price) : null,
          monthly_lease: IS_RENTAL(formData.listing_type) && formData.monthly_lease ? Number(formData.monthly_lease) : null,
          square_feet: formData.square_feet ? Number(formData.square_feet) : null,
          door_width: formData.door_width ? Number(formData.door_width) : null,
          door_height: formData.door_height ? Number(formData.door_height) : null,
          hangar_depth: formData.hangar_depth ? Number(formData.hangar_depth) : null,
          description: formData.description || null,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          status: 'pending',
        }])
        .select('id')
        .single()

      if (listingError || !listing) {
        throw new Error(listingError?.message ?? 'Failed to save listing.')
      }

      const listingId = listing.id

      // ── Step 1b: Geocode city + state → lat/lng ─────────────────────────
      // Uses OpenStreetMap's Nominatim (free, no API key needed).
      // Non-fatal if it fails — listing still saves without coordinates.
      try {
        setUploadProgress('Getting location coordinates…')
        const geoQuery = encodeURIComponent(
          `${formData.airport_name}, ${formData.city}, ${formData.state}, USA`
        )
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${geoQuery}&format=json&limit=1`,
          { headers: { 'User-Agent': 'HangarMarketplace/1.0' } }
        )
        const geoData = await geoRes.json()
        if (geoData[0]) {
          await supabase
            .from('listings')
            .update({
              latitude: parseFloat(geoData[0].lat),
              longitude: parseFloat(geoData[0].lon),
            })
            .eq('id', listingId)
        }
      } catch {
        console.warn('Geocoding failed — listing saved without coordinates.')
      }

      // ── Step 2: Upload photos to Supabase Storage ───────────────────────
      const photoRecords: { listing_id: string; storage_path: string; display_order: number }[] = []

      for (let i = 0; i < photos.length; i++) {
        const file = photos[i]
        setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}…`)

        // Build a unique, clean file path
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${listingId}/${Date.now()}-${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

        if (uploadError) {
          // Non-fatal: log and continue with other photos
          console.warn(`Photo ${i + 1} upload failed:`, uploadError.message)
          continue
        }

        photoRecords.push({ listing_id: listingId, storage_path: path, display_order: i })
      }

      // ── Step 3: Save photo records ──────────────────────────────────────
      if (photoRecords.length > 0) {
        setUploadProgress('Saving photo records…')
        const { error: photoError } = await supabase.from('listing_photos').insert(photoRecords)
        if (photoError) {
          console.warn('Photo records insert failed:', photoError.message)
        }
      }

      // ── Done ────────────────────────────────────────────────────────────
      setStatus({
        type: 'success',
        message: `Listing submitted with ${photoRecords.length} photo${photoRecords.length !== 1 ? 's' : ''}! It will go live once reviewed by our team.`,
      })
      setFormData(EMPTY_FORM)
      setPhotos([])
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setLoading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Submit a Hangar Listing</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Listing a full hangar for sale or lease, or have extra space to share? Fill out the details below.
          Your listing will be reviewed before going live.
        </p>
      </div>

      {status && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          backgroundColor: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#166534' : '#dc2626',
        }}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>

        {/* ── Basic Info ──────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <Field label="Listing title *">
            <input name="title" placeholder="e.g. 60×60 T-Hangar at KGVL" value={formData.title} onChange={handleChange} required style={inputStyle} />
          </Field>
          <TwoCol>
            <Field label="Airport name *">
              <input name="airport_name" placeholder="Gainesville Regional Airport" value={formData.airport_name} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="Airport code *">
              <input name="airport_code" placeholder="KGVL" value={formData.airport_code} onChange={handleChange} required style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="City *">
              <input name="city" placeholder="Gainesville" value={formData.city} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="State *">
              <input name="state" placeholder="FL" value={formData.state} onChange={handleChange} required style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Listing type *">
            <select name="listing_type" value={formData.listing_type} onChange={handleChange} style={inputStyle}>
              <option value="sale">For Sale — full hangar</option>
              <option value="lease">For Lease — full hangar</option>
              <option value="space">Space Available — partial hangar</option>
            </select>
          </Field>
          <Field label="Ownership type *">
            <input name="ownership_type" placeholder="Private / Municipal / Condo" value={formData.ownership_type} onChange={handleChange} required style={inputStyle} />
          </Field>
          {formData.listing_type === 'space' && (
            <div style={{
              backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: '6px', padding: '0.65rem 0.85rem',
              fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.5,
            }}>
              ✈ Use this option if you own or lease a hangar and have extra space you'd like to share.
              Enter the available space dimensions and your monthly rate below.
            </div>
          )}
        </Section>

        {/* ── Pricing ─────────────────────────────────────────────────── */}
        <Section title="Pricing">
          {IS_RENTAL(formData.listing_type) ? (
            <Field label={formData.listing_type === 'space' ? 'Monthly rent for the space ($)' : 'Monthly lease ($)'}>
              <input name="monthly_lease" type="number" placeholder="0" value={formData.monthly_lease} onChange={handleChange} style={inputStyle} />
            </Field>
          ) : (
            <TwoCol>
              <Field label="Asking price ($)">
                <input name="asking_price" type="number" placeholder="0" value={formData.asking_price} onChange={handleChange} style={inputStyle} />
              </Field>
              <Field label="Monthly lease ($)">
                <input name="monthly_lease" type="number" placeholder="0" value={formData.monthly_lease} onChange={handleChange} style={inputStyle} />
              </Field>
            </TwoCol>
          )}
        </Section>

        {/* ── Dimensions ──────────────────────────────────────────────── */}
        <Section title="Dimensions">
          <TwoCol>
            <Field label="Square feet">
              <input name="square_feet" type="number" placeholder="3600" value={formData.square_feet} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="">
              <span /> {/* spacer */}
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="Door width (ft)">
              <input name="door_width" type="number" placeholder="40" value={formData.door_width} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Door height (ft)">
              <input name="door_height" type="number" placeholder="14" value={formData.door_height} onChange={handleChange} style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="Hangar depth (ft)">
              <input name="hangar_depth" type="number" placeholder="45" value={formData.hangar_depth} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label=""><span /></Field>
          </TwoCol>
        </Section>

        {/* ── Description ─────────────────────────────────────────────── */}
        <Section title="Description">
          <Field label="Tell buyers about this hangar">
            <textarea
              name="description"
              placeholder="Include any notable features, amenities, access details, tie-down info, etc."
              value={formData.description}
              onChange={handleChange}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </Section>

        {/* ── Photos ──────────────────────────────────────────────────── */}
        <Section title={`Photos (${MIN_PHOTOS}–20 required)`}>
          <PhotoUploader onChange={handlePhotosChange} />
        </Section>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <Section title="Contact Info">
          <Field label="Your name *">
            <input name="contact_name" placeholder="Jane Smith" value={formData.contact_name} onChange={handleChange} required style={inputStyle} />
          </Field>
          <TwoCol>
            <Field label="Email *">
              <input name="contact_email" type="email" placeholder="jane@example.com" value={formData.contact_email} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="Phone">
              <input name="contact_phone" type="tel" placeholder="(555) 000-0000" value={formData.contact_phone} onChange={handleChange} style={inputStyle} />
            </Field>
          </TwoCol>
        </Section>

        <button type="submit" disabled={loading} style={submitButtonStyle}>
          {loading ? (uploadProgress ?? 'Submitting…') : 'Submit Listing'}
        </button>
      </form>
    </div>
  )
}

// ── Small layout helpers ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem' }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151' }}>{title}</h2>
      <div style={{ display: 'grid', gap: '0.85rem' }}>{children}</div>
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      {label && <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280' }}>{label}</label>}
      {children}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#fafafa',
}

const submitButtonStyle: React.CSSProperties = {
  padding: '0.85rem',
  backgroundColor: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '700',
  cursor: 'pointer',
}
