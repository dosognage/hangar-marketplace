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

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import PhotoUploader from '@/app/components/PhotoUploader'
import { createListing } from '@/app/actions/listing'

// Leaflet must be loaded client-side only
const AirportMap = dynamic(() => import('@/app/components/AirportMap'), { ssr: false })

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
  const router = useRouter()
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [photos, setPhotos] = useState<File[]>([])
  const [status, setStatus] = useState<{ type: 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [hangarLat, setHangarLat] = useState<number | null>(null)
  const [hangarLng, setHangarLng] = useState<number | null>(null)
  // Track the ICAO code to pass to AirportMap (debounced — only commits after user stops typing)
  const [mapIcao, setMapIcao] = useState('')
  const icaoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce airport_code → map load (fires 600ms after user stops typing, only on 3-4 char codes)
  useEffect(() => {
    return () => {
      if (icaoDebounceRef.current) clearTimeout(icaoDebounceRef.current)
    }
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === 'airport_code') {
      const code = value.trim().toUpperCase()
      if (icaoDebounceRef.current) clearTimeout(icaoDebounceRef.current)
      // ICAO codes are 3–4 chars; wait until user stops typing before fetching
      if (code.length >= 3 && code.length <= 4) {
        icaoDebounceRef.current = setTimeout(() => setMapIcao(code), 600)
      }
    }
  }

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setHangarLat(lat)
    setHangarLng(lng)
  }, [])

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
      // ── Step 1: Insert the listing (server action — bypasses RLS) ──────
      setUploadProgress('Saving listing…')

      const { id: listingId } = await createListing({
        ...formData,
        hangar_lat: hangarLat,
        hangar_lng: hangarLng,
      })

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

      // ── Done — redirect to success page ─────────────────────────────────
      router.push(`/submit/success?photos=${photoRecords.length}`)
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
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
        }}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>

        {/* ── Basic Info ──────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <Field label="Listing title *">
            <input name="title" placeholder="e.g. 60×60 T-Hangar at KPAE" value={formData.title} onChange={handleChange} required style={inputStyle} />
          </Field>
          <TwoCol>
            <Field label="Airport name *">
              <input name="airport_name" placeholder="Paine Field" value={formData.airport_name} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="Airport code *">
              <input name="airport_code" placeholder="KPAE" value={formData.airport_code} onChange={handleChange} required style={inputStyle} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="City *">
              <input name="city" placeholder="Everett" value={formData.city} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="State *">
              <input name="state" placeholder="WA" value={formData.state} onChange={handleChange} required style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Listing type *">
            <select name="listing_type" value={formData.listing_type} onChange={handleChange} style={inputStyle}>
              <option value="sale">For Sale (full hangar)</option>
              <option value="lease">For Lease (full hangar)</option>
              <option value="space">Space Available (partial hangar)</option>
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

        {/* ── Hangar Location on Airport ───────────────────────────────── */}
        <Section title="Hangar Location (optional)">
          <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Enter your airport code above and pin exactly where your hangar is on the field. Buyers can see it on
            the airport diagram — a feature no other marketplace offers.
          </p>
          {mapIcao ? (
            <>
              <AirportMap
                icao={mapIcao}
                savedLat={hangarLat}
                savedLng={hangarLng}
                editable
                onLocationSelect={handleLocationSelect}
                height="380px"
              />
              {hangarLat && hangarLng && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: '500' }}>
                  ✓ Pin placed at {hangarLat.toFixed(5)}, {hangarLng.toFixed(5)}
                </p>
              )}
            </>
          ) : (
            <div style={{
              height: '120px', borderRadius: '8px', border: '1px dashed #d1d5db',
              backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem',
            }}>
              Fill in the airport code above to load the airport diagram
            </div>
          )}
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
