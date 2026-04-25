'use client'

/**
 * Submit Listing page
 *
 * Flow:
 *  1. User fills out listing details and selects 3–40 photos
 *  2. On submit:
 *     a. Insert listing → get back the new listing ID
 *     b. Upload each photo to Supabase Storage under listing-photos/{listingId}/
 *     c. Insert a row in listing_photos for each uploaded file
 *  3. Show success (or a clear error if something went wrong)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import FeetInchesInput from '@/app/components/FeetInchesInput'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import PhotoUploader from '@/app/components/PhotoUploader'
import { createListing, getListingFeeInfo } from '@/app/actions/listing'
import { uploadPhotos } from '@/lib/uploadPhotos'
import AirportAutocomplete, { type AirportSuggestion } from '@/app/components/AirportAutocomplete'

type AirportCoords = { lat: number; lng: number; icao: string }

type AddrSuggestion = {
  display: string
  street:  string
  city:    string
  state:   string
  zip:     string
  lat:     number
  lng:     number
}


// Leaflet must be loaded client-side only
const AirportMap = dynamic(() => import('@/app/components/AirportMap'), { ssr: false })

const MIN_PHOTOS = 3

const EMPTY_FORM = {
  title: '',
  airport_name: '',
  airport_code: '',
  city: '',
  state: '',
  property_type: 'hangar',
  listing_type: 'sale',
  ownership_type: '',
  asking_price: '',
  monthly_lease: '',
  // Leasehold only: years remaining on the ground lease
  leasehold_years_remaining: '',
  // Recurring costs — both fields must accept literal 0
  hoa_monthly: '',
  annual_property_tax: '',
  // Hangar-specific
  square_feet: '',
  door_width: '',
  door_height: '',
  hangar_depth: '',
  // Home/land-specific
  bedrooms: '',
  bathrooms: '',
  home_sqft: '',
  lot_acres: '',
  airpark_name: '',
  // Address (non-hangar)
  address: '',
  zip_code: '',
  // Runway
  runway_length_ft: '',
  runway_width_ft: '',
  runway_surface: '',
  description: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
}

// Canonical amenity keys. Add new items here — they flow into the form checkbox
// grid, the listing detail page, and any admin reports.
const AMENITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'heat',             label: 'Heat' },
  { value: 'power',            label: 'Power' },
  { value: 'water',            label: 'Water' },
  { value: 'air_conditioning', label: 'Air conditioning' },
  { value: 'bathroom',         label: 'Bathroom' },
  { value: 'wifi',             label: 'WiFi' },
  { value: 'fuel_nearby',      label: 'Fuel nearby' },
  { value: 'floor_drain',      label: 'Floor drain' },
  { value: 'compressed_air',   label: 'Compressed air' },
  { value: 'office_space',     label: 'Office space' },
  { value: 'loft_storage',     label: 'Loft storage' },
  { value: 'security_system',  label: 'Security system' },
]

const SURFACE_OPTIONS = [
  'Asphalt',
  'Asphalt (grooved)',
  'Concrete',
  'Asphalt/Concrete',
  'Turf/Grass',
  'Gravel',
  'Turf/Gravel',
  'Dirt',
  'Water',
  'Sand',
  'Other',
]

const PROPERTY_TYPE_OPTIONS = [
  { value: 'hangar',           label: 'Hangar' },
  { value: 'airport_home',     label: 'Airport Home' },
  { value: 'land',             label: 'Land / Lot' },
  { value: 'fly_in_community', label: 'Fly-in Community' },
]

// Listings that require a monthly rate (not a sale price)
const IS_RENTAL = (t: string) => t === 'lease' || t === 'space'

type FeeInfo = {
  trialActive:      boolean
  trialEnds:        string | null
  feeHangar:        number
  feeHome:          number
  isVerifiedBroker: boolean
}

// sessionStorage key for the auto-saved draft of in-progress submit form data.
// Survives browser refresh, accidental nav-aways, and the auth-redirect bounce.
// Photos are intentionally not persisted (binary blobs, not safe in sessionStorage).
const DRAFT_STORAGE_KEY = 'hm:submit-draft-v1'

type StoredDraft = {
  formData?:        typeof EMPTY_FORM
  amenities?:       string[]
  hasRunwayAccess?: boolean
  hangarLat?:       number | null
  hangarLng?:       number | null
}

export default function SubmitForm() {
  const router = useRouter()
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [hasRunwayAccess, setHasRunwayAccess] = useState(false)
  const [amenities, setAmenities] = useState<string[]>([])
  const [draftRestored, setDraftRestored] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [status, setStatus] = useState<{ type: 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitMode, setSubmitMode] = useState<'publish' | 'draft' | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null)
  const [hangarLat, setHangarLat] = useState<number | null>(null)
  const [hangarLng, setHangarLng] = useState<number | null>(null)
  const [runwayLoading, setRunwayLoading] = useState(false)
  // Address autocomplete
  const [addrSuggestions, setAddrSuggestions] = useState<AddrSuggestion[]>([])
  const [addrOpen, setAddrOpen] = useState(false)
  const [addrActiveIdx, setAddrActiveIdx] = useState(-1)
  const addrDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addrContainerRef = useRef<HTMLDivElement>(null)
  // Auto-geocoded airport coordinates (from ICAO lookup)
  const [airportCoords, setAirportCoords] = useState<AirportCoords | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  // Track the ICAO code to pass to AirportMap (debounced — only commits after user stops typing)
  const [mapIcao, setMapIcao] = useState('')
  const icaoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load trial/fee info from server action once on mount
  useEffect(() => {
    getListingFeeInfo().then(setFeeInfo).catch(() => {/* non-fatal */})
  }, [])

  // ── Restore any in-progress draft from sessionStorage on mount ──────────
  // This is what saves a 20-minute fill-out from being wiped if the user gets
  // bounced through login or accidentally refreshes the tab.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as StoredDraft
      if (parsed.formData)        setFormData(prev => ({ ...prev, ...parsed.formData }))
      if (parsed.amenities)       setAmenities(parsed.amenities)
      if (typeof parsed.hasRunwayAccess === 'boolean') setHasRunwayAccess(parsed.hasRunwayAccess)
      if (typeof parsed.hangarLat === 'number') setHangarLat(parsed.hangarLat)
      if (typeof parsed.hangarLng === 'number') setHangarLng(parsed.hangarLng)
      setDraftRestored(true)
    } catch {
      /* corrupt storage — ignore and start fresh */
    }
  }, [])

  // ── Auto-save in-progress form to sessionStorage on every change ────────
  // Photos are not persisted (Files don't serialize). Everything else does.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload: StoredDraft = {
      formData,
      amenities,
      hasRunwayAccess,
      hangarLat,
      hangarLng,
    }
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* sessionStorage might be disabled (Safari private mode); non-fatal */
    }
  }, [formData, amenities, hasRunwayAccess, hangarLat, hangarLng])

  // Debounce airport_code → geocode + map load (fires 600ms after user stops typing)
  useEffect(() => {
    return () => {
      if (icaoDebounceRef.current) clearTimeout(icaoDebounceRef.current)
    }
  }, [])

  // Address autocomplete — click-outside handler
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addrContainerRef.current && !addrContainerRef.current.contains(e.target as Node)) {
        setAddrOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function fetchAddrSuggestions(q: string) {
    if (q.length < 4) { setAddrSuggestions([]); setAddrOpen(false); return }
    try {
      const res = await fetch(`/api/address/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json() as AddrSuggestion[]
        setAddrSuggestions(data)
        setAddrOpen(data.length > 0)
        setAddrActiveIdx(-1)
      }
    } catch { /* silent */ }
  }

  function handleAddrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setFormData(prev => ({ ...prev, address: v }))
    if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current)
    addrDebounceRef.current = setTimeout(() => fetchAddrSuggestions(v), 350)
  }

  function handleAddrSelect(s: AddrSuggestion) {
    setFormData(prev => ({
      ...prev,
      address:  s.street || s.display,
      city:     s.city     || prev.city,
      state:    s.state    || prev.state,
      zip_code: s.zip      || prev.zip_code,
    }))
    setAddrSuggestions([])
    setAddrOpen(false)
  }

  function handleAddrKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!addrOpen) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setAddrActiveIdx(i => Math.min(i + 1, addrSuggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAddrActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && addrActiveIdx >= 0) { e.preventDefault(); handleAddrSelect(addrSuggestions[addrActiveIdx]) }
    else if (e.key === 'Escape') setAddrOpen(false)
  }

  // Called when the user picks an airport from the autocomplete dropdown.
  // This is the best path: we get exact coords + code from our own DB with no geocoding needed.
  async function applyAirportSelection(airport: AirportSuggestion) {
    // Fill both fields
    setFormData(prev => ({
      ...prev,
      airport_name: airport.name,
      airport_code: airport.ident,
    }))
    // Set coords directly from the database — no Nominatim round-trip needed
    setAirportCoords({ lat: airport.latitude_deg, lng: airport.longitude_deg, icao: airport.ident })
    // Trigger the airport diagram map
    setMapIcao(airport.ident)
    // Auto-fetch runway data
    fetchRunwayData(airport.ident)
  }

  // Fetch runway data from AviationAPI and pre-populate fields if found
  async function fetchRunwayData(code: string) {
    setRunwayLoading(true)
    try {
      const res = await fetch(`/api/airports/runways?code=${encodeURIComponent(code)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found) {
          setFormData(prev => ({
            ...prev,
            runway_length_ft: data.runway_length_ft != null ? String(data.runway_length_ft) : prev.runway_length_ft,
            runway_width_ft:  data.runway_width_ft  != null ? String(data.runway_width_ft)  : prev.runway_width_ft,
            runway_surface:   data.runway_surface   != null ? data.runway_surface            : prev.runway_surface,
          }))
        }
      }
    } catch {
      // Non-fatal — user can fill in manually
    } finally {
      setRunwayLoading(false)
    }
  }

  // Auto-geocode the airport by code when typed manually (not via autocomplete).
  // Priority: first tries the code directly, then falls back to name + state.
  async function geocodeAirport(code: string) {
    setGeocoding(true)
    setAirportCoords(null)
    try {
      // 1️⃣ Try searching our own airports table first (most accurate)
      const dbRes = await fetch(`/api/airports/search?q=${encodeURIComponent(code)}&limit=1`)
      if (dbRes.ok) {
        const dbData = await dbRes.json()
        if (dbData[0] && dbData[0].ident.toUpperCase() === code.toUpperCase()) {
          setAirportCoords({ lat: dbData[0].latitude_deg, lng: dbData[0].longitude_deg, icao: code })
          return
        }
      }

      // 2️⃣ Fall back to Nominatim with code
      const q1 = encodeURIComponent(`${code} airport USA`)
      const r1 = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q1}&format=json&limit=1&countrycodes=us`,
        { headers: { 'User-Agent': 'HangarMarketplace/1.0' } }
      )
      const d1 = await r1.json()
      if (d1[0]) {
        setAirportCoords({ lat: parseFloat(d1[0].lat), lng: parseFloat(d1[0].lon), icao: code })
        return
      }

      // 3️⃣ Last resort: Nominatim with airport name + state
      const name  = formData.airport_name.trim()
      const state = formData.state.trim()
      if (name) {
        const q2 = encodeURIComponent(`${name}${state ? `, ${state}` : ''}, USA`)
        const r2 = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1&countrycodes=us`,
          { headers: { 'User-Agent': 'HangarMarketplace/1.0' } }
        )
        const d2 = await r2.json()
        if (d2[0]) {
          setAirportCoords({ lat: parseFloat(d2[0].lat), lng: parseFloat(d2[0].lon), icao: code })
        }
      }
    } catch {
      // Non-fatal — listing can still be saved, coordinates just won't be set
    } finally {
      setGeocoding(false)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: string } }
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === 'airport_code') {
      const code = value.trim().toUpperCase()
      if (icaoDebounceRef.current) clearTimeout(icaoDebounceRef.current)
      // ICAO codes are 3–4 chars; wait until user stops typing
      if (code.length >= 3 && code.length <= 6) {
        icaoDebounceRef.current = setTimeout(() => {
          setMapIcao(code)
          geocodeAirport(code)   // auto-capture airport lat/lng
          fetchRunwayData(code)  // auto-populate runway dimensions
        }, 600)
      } else {
        // Code too short/long — clear any previous coords
        setAirportCoords(null)
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

    // Publish path requires the usual photo minimum; drafts can be saved with
    // no photos at all so the user can capture a work-in-progress snapshot.
    const isDraft = submitMode === 'draft'
    if (!isDraft && photos.length < MIN_PHOTOS) {
      setStatus({ type: 'error', message: `Please upload at least ${MIN_PHOTOS} photos before publishing, or click Save as Draft to finish later.` })
      return
    }

    setLoading(true)

    try {
      // ── Step 1: Insert the listing (server action — bypasses RLS) ──────
      setUploadProgress(isDraft ? 'Saving draft…' : 'Saving listing…')

      // Coordinate priority:
      //  1. Pin drop (hangarLat/Lng) — most precise, user placed it on the airport diagram
      //  2. Auto-geocoded airport (airportCoords) — captured when airport code was typed
      // The pin-drop position is also the best lat/lng for radius search.
      const resolvedLat = hangarLat ?? airportCoords?.lat ?? null
      const resolvedLng = hangarLng ?? airportCoords?.lng ?? null

      const result = await createListing({
        ...formData,
        has_runway_access: hasRunwayAccess,
        amenities,
        hangar_lat: hangarLat,
        hangar_lng: hangarLng,
        latitude:   resolvedLat,
        longitude:  resolvedLng,
        runway_length_ft: formData.runway_length_ft,
        runway_width_ft:  formData.runway_width_ft,
        runway_surface:   formData.runway_surface,
        isDraft,
      })

      const listingId = result.id

      // If neither pin nor auto-geocode produced coords, do a final fallback
      // geocode using airport name + city + state (non-fatal, best-effort).
      if (resolvedLat == null || resolvedLng == null) {
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
                latitude:  parseFloat(geoData[0].lat),
                longitude: parseFloat(geoData[0].lon),
              })
              .eq('id', listingId)
          }
        } catch {
          console.warn('Fallback geocoding failed — listing saved without coordinates.')
        }
      }

      // ── Steps 2 & 3: Upload photos + save records ─────────────────────
      // Photos are optional for drafts but still uploaded if present.
      const saved = photos.length > 0
        ? await uploadPhotos(listingId, photos, 0, setUploadProgress)
        : []

      // Listing successfully created — clear the auto-saved draft so it
      // doesn't haunt the next time this user starts a new submission.
      try { window.sessionStorage.removeItem(DRAFT_STORAGE_KEY) } catch { /* ignore */ }

      // ── Draft path — go straight to the dashboard ─────────────────────
      if (isDraft) {
        setUploadProgress('Draft saved.')
        router.push('/dashboard?drafts=1')
        return
      }

      // ── Payment required — redirect to Stripe checkout ───────────────────
      if (result.requiresPayment && result.checkoutUrl) {
        setUploadProgress(`Photos saved (${saved.length}) — redirecting to payment…`)
        window.location.href = result.checkoutUrl
        return
      }

      // ── Free path — redirect to success page ────────────────────────────
      router.push(`/submit/success?photos=${saved.length}`)
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setLoading(false)
      setUploadProgress(null)
      setSubmitMode(null)
    }
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Submit a Listing</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          List a hangar, airport home, land, or fly-in community property. Fill out the details below
          and your listing will be reviewed before going live.
        </p>
      </div>

      {/* ── Draft-restored banner ────────────────────────────────────────── */}
      {/* Surfaces when sessionStorage had a saved draft on mount, so users */}
      {/* realize their previous work is back instead of starting from blank. */}
      {draftRestored && (
        <div style={{
          padding: '0.7rem 0.95rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}>
          <span>We restored your in-progress listing from your last session. Photos need to be re-added.</span>
          <button
            type="button"
            onClick={() => {
              if (!confirm('Discard the restored draft and start fresh?')) return
              setFormData(EMPTY_FORM)
              setAmenities([])
              setHasRunwayAccess(false)
              setHangarLat(null)
              setHangarLng(null)
              try { window.sessionStorage.removeItem(DRAFT_STORAGE_KEY) } catch {}
              setDraftRestored(false)
            }}
            style={{
              border: '1px solid #bfdbfe',
              background: 'white',
              color: '#1e40af',
              fontSize: '0.78rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Start over
          </button>
        </div>
      )}

      {/* ── Pricing / trial banner ───────────────────────────────────────── */}
      {/* Verified brokers always list for free — the banner is noise for them. */}
      {feeInfo && !feeInfo.isVerifiedBroker && (
        feeInfo.trialActive ? (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.1rem' }}>🎉</span>
            <span>
              <strong>Free to list:</strong> we&apos;re in our founding period
              {feeInfo.trialEnds && (
                <> through {new Date(feeInfo.trialEnds).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
              )}
              . No credit card needed.
            </span>
          </div>
        ) : (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.1rem', marginTop: '0.05rem' }}>💳</span>
            <span>
              <strong>One-time listing fee:</strong>{' '}
              ${feeInfo.feeHangar} for hangars · ${feeInfo.feeHome} for airport homes &amp; land.
              {' '}You&apos;ll be taken to a secure checkout after submitting, and your listing goes live once payment is confirmed.
            </span>
          </div>
        )
      )}

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

        {/* ── Property Type ────────────────────────────────────────────── */}
        <Section title="Property Type">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
            {PROPERTY_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, property_type: opt.value }))}
                style={{
                  padding: '0.7rem 0.5rem',
                  border: `2px solid ${formData.property_type === opt.value ? '#6366f1' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: formData.property_type === opt.value ? '#eef2ff' : 'white',
                  color: formData.property_type === opt.value ? '#4338ca' : '#374151',
                  fontWeight: formData.property_type === opt.value ? '700' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt.value === 'hangar'           && '🏗 '}
                {opt.value === 'airport_home'     && '🏡 '}
                {opt.value === 'land'             && '🌿 '}
                {opt.value === 'fly_in_community' && '✈ '}
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Basic Info ──────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <Field label="Listing title *">
            <input
              name="title"
              placeholder={
                formData.property_type === 'hangar'           ? 'e.g. 60×60 T-Hangar at KPAE' :
                formData.property_type === 'airport_home'     ? 'e.g. 3BR Fly-in Home at KCMA' :
                formData.property_type === 'land'             ? 'e.g. 2-Acre Aviation Lot at KLGU' :
                'e.g. Camarillo Airpark Lot 12'
              }
              value={formData.title} onChange={handleChange} required style={inputStyle}
            />
          </Field>
          <TwoCol>
            <Field label="Airport name *">
              <AirportAutocomplete
                value={formData.airport_name}
                onChange={(v) => setFormData(prev => ({ ...prev, airport_name: v }))}
                onSelect={applyAirportSelection}
                placeholder="Paine Field, Cawley's South Prairie…"
                required
                inputStyle={inputStyle}
              />
            </Field>
            <Field label="Airport code *">
              <div style={{ position: 'relative' }}>
                <input
                  name="airport_code"
                  placeholder="KPAE"
                  value={formData.airport_code}
                  onChange={handleChange}
                  required
                  style={{ ...inputStyle, paddingRight: airportCoords || geocoding ? '2.5rem' : undefined }}
                />
                {/* Geocode status badge — spins while loading, checkmark when found */}
                {(geocoding || airportCoords) && (
                  <span style={{
                    position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '0.8rem',
                  }}>
                    {geocoding ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
                        style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                )}
              </div>
              {airportCoords && !geocoding && (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#16a34a', fontWeight: '500' }}>
                  ✓ Airport location captured. Listing will be searchable by radius.
                </p>
              )}
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
              {formData.property_type === 'hangar' ? (
                <>
                  <option value="sale">For Sale (full hangar)</option>
                  <option value="lease">For Lease (full hangar)</option>
                  <option value="space">Space Available (partial hangar)</option>
                </>
              ) : (
                <>
                  <option value="sale">For Sale</option>
                  <option value="lease">For Lease</option>
                </>
              )}
            </select>
          </Field>
          {formData.property_type === 'hangar' && (
            <>
              <Field label="Ownership type *">
                <select
                  name="ownership_type"
                  value={formData.ownership_type}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                >
                  <option value="">Select…</option>
                  <option value="fee simple">Fee Simple (own the land)</option>
                  <option value="leasehold">Leasehold (lease the land)</option>
                  <option value="condo">Hangar Condo</option>
                  <option value="T-hangar">T-Hangar</option>
                  <option value="Business">Business</option>
                </select>
              </Field>
              {formData.ownership_type === 'leasehold' && (
                <Field label="Years remaining on the ground lease *">
                  <input
                    name="leasehold_years_remaining"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 25"
                    value={formData.leasehold_years_remaining}
                    onChange={handleChange}
                    required
                    style={{ ...inputStyle, maxWidth: '200px' }}
                  />
                </Field>
              )}
            </>
          )}
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
        {/* For Sale  → asking price only. */}
        {/* For Lease / Space → monthly lease only. */}
        <Section title="Pricing">
          {IS_RENTAL(formData.listing_type) ? (
            <Field label={formData.listing_type === 'space' ? 'Monthly rent for the space ($)' : 'Monthly lease ($)'}>
              <input name="monthly_lease" type="number" min="0" placeholder="0" value={formData.monthly_lease} onChange={handleChange} style={inputStyle} />
            </Field>
          ) : (
            <Field label="Asking price ($)">
              <input name="asking_price" type="number" min="0" placeholder="0" value={formData.asking_price} onChange={handleChange} style={inputStyle} />
            </Field>
          )}
        </Section>

        {/* ── Recurring costs ─────────────────────────────────────────── */}
        {/* HOA + property tax apply to any property type. Both accept 0 (e.g. */}
        {/* "no HOA at this airpark"), so we send the raw string — the server */}
        {/* action distinguishes empty string (→ null) from "0" (→ 0).        */}
        <Section title="Monthly HOA and annual property tax">
          <TwoCol>
            <Field label="HOA (monthly, $)">
              <input
                name="hoa_monthly"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formData.hoa_monthly}
                onChange={handleChange}
                style={inputStyle}
              />
            </Field>
            <Field label="Annual property tax ($)">
              <input
                name="annual_property_tax"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={formData.annual_property_tax}
                onChange={handleChange}
                style={inputStyle}
              />
            </Field>
          </TwoCol>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>
            Enter 0 if neither applies. Leave blank if unknown.
          </p>
        </Section>

        {/* ── Amenities ───────────────────────────────────────────────── */}
        <Section title="Amenities">
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>
            Check every feature that's included or easily available.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.55rem',
          }}>
            {AMENITY_OPTIONS.map(opt => {
              const checked = amenities.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    border: `1px solid ${checked ? '#6366f1' : '#e5e7eb'}`,
                    borderRadius: '7px',
                    backgroundColor: checked ? '#eef2ff' : 'white',
                    color: checked ? '#4338ca' : '#374151',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      setAmenities(prev =>
                        e.target.checked
                          ? [...prev, opt.value]
                          : prev.filter(a => a !== opt.value),
                      )
                    }}
                    style={{ width: '15px', height: '15px', accentColor: '#6366f1' }}
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </Section>

        {/* ── Hangar Dimensions (hangar only) ─────────────────────────── */}
        {formData.property_type === 'hangar' && (
          <Section title="Dimensions">
            <TwoCol>
              <Field label="Square feet">
                <input name="square_feet" type="number" placeholder="3600" value={formData.square_feet} onChange={handleChange} style={inputStyle} />
              </Field>
              <Field label=""><span /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Door width">
                <FeetInchesInput name="door_width" placeholder="40" value={formData.door_width} onChange={handleChange} style={inputStyle} />
              </Field>
              <Field label="Door height">
                <FeetInchesInput name="door_height" placeholder="14" value={formData.door_height} onChange={handleChange} style={inputStyle} />
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Hangar depth">
                <FeetInchesInput name="hangar_depth" placeholder="45" value={formData.hangar_depth} onChange={handleChange} style={inputStyle} />
              </Field>
              <Field label=""><span /></Field>
            </TwoCol>
          </Section>
        )}

        {/* ── Property Details (home / land / fly-in) ──────────────────── */}
        {formData.property_type !== 'hangar' && (
          <Section title="Property Details">
            {/* Address autocomplete */}
            <Field label="Street address">
              <div ref={addrContainerRef} style={{ position: 'relative' }}>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleAddrChange}
                  onKeyDown={handleAddrKeyDown}
                  onFocus={() => addrSuggestions.length > 0 && setAddrOpen(true)}
                  placeholder="123 Runway Drive"
                  autoComplete="off"
                  style={inputStyle}
                />
                {addrOpen && addrSuggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    backgroundColor: 'white', border: '1px solid #e5e7eb',
                    borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    zIndex: 2000, margin: 0, padding: '4px 0', listStyle: 'none',
                    maxHeight: '220px', overflowY: 'auto',
                  }}>
                    {addrSuggestions.map((s, i) => (
                      <li
                        key={i}
                        onMouseDown={() => handleAddrSelect(s)}
                        onMouseEnter={() => setAddrActiveIdx(i)}
                        style={{
                          padding: '0.5rem 0.85rem',
                          cursor: 'pointer',
                          backgroundColor: i === addrActiveIdx ? '#f5f3ff' : 'transparent',
                          borderLeft: i === addrActiveIdx ? '3px solid #6366f1' : '3px solid transparent',
                          fontSize: '0.85rem',
                          color: '#111827',
                        }}
                      >
                        <div style={{ fontWeight: '500' }}>{s.street || s.display}</div>
                        {(s.city || s.state) && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>
                            {[s.city, s.state, s.zip].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#9ca3af' }}>
                Start typing to get address suggestions. City and state will auto-fill.
              </p>
            </Field>
            <Field label="ZIP code">
              <input
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                placeholder="98101"
                maxLength={10}
                style={{ ...inputStyle, maxWidth: '160px' }}
              />
            </Field>

            {(formData.property_type === 'airport_home' || formData.property_type === 'fly_in_community') && (
              <>
                <TwoCol>
                  <Field label="Bedrooms">
                    <input name="bedrooms" type="number" placeholder="3" value={formData.bedrooms} onChange={handleChange} style={inputStyle} />
                  </Field>
                  <Field label="Bathrooms">
                    <input name="bathrooms" type="number" step="0.5" placeholder="2.5" value={formData.bathrooms} onChange={handleChange} style={inputStyle} />
                  </Field>
                </TwoCol>
                <Field label="Home square footage">
                  <input name="home_sqft" type="number" step="any" placeholder="2400" value={formData.home_sqft} onChange={handleChange} style={inputStyle} />
                </Field>
              </>
            )}
            <Field label="Lot size (acres)">
              <input name="lot_acres" type="number" step="any" placeholder="1.5" value={formData.lot_acres} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Airpark / community name">
              <input name="airpark_name" placeholder="e.g. Spruce Creek Fly-In" value={formData.airpark_name} onChange={handleChange} style={inputStyle} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>
              <input
                type="checkbox"
                checked={hasRunwayAccess}
                onChange={e => setHasRunwayAccess(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
              />
              Direct runway / taxiway access from property
            </label>
          </Section>
        )}

        {/* ── Runway Info ─────────────────────────────────────────────── */}
        <Section title={`Runway Info${runwayLoading ? ' (loading…)' : ''}`}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>
            {runwayLoading
              ? '✈ Fetching runway data from public FAA records…'
              : 'Auto-filled from public airport data when you select an airport. Edit or clear any field if needed.'}
          </p>
          <TwoCol>
            <Field label="Runway length (ft)">
              <input
                name="runway_length_ft"
                type="number"
                placeholder="e.g. 5000"
                value={formData.runway_length_ft}
                onChange={handleChange}
                style={inputStyle}
              />
            </Field>
            <Field label="Runway width (ft)">
              <input
                name="runway_width_ft"
                type="number"
                placeholder="e.g. 75"
                value={formData.runway_width_ft}
                onChange={handleChange}
                style={inputStyle}
              />
            </Field>
          </TwoCol>
          <Field label="Runway surface">
            <select
              name="runway_surface"
              value={formData.runway_surface}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select surface type…</option>
              {SURFACE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* ── Description ─────────────────────────────────────────────── */}
        <Section title="Description">
          <Field label={`Tell buyers about this ${formData.property_type === 'hangar' ? 'hangar' : formData.property_type === 'land' ? 'land' : 'property'}`}>
            <textarea
              name="description"
              placeholder={
                formData.property_type === 'hangar'
                  ? 'Include any notable features, amenities, access details, tie-down info, etc.'
                  : formData.property_type === 'land'
                  ? 'Describe the lot, zoning, utilities, proximity to runway, adjacent amenities, etc.'
                  : 'Describe the home, hangar setup, community amenities, runway access, nearby services, etc.'
              }
              value={formData.description}
              onChange={handleChange}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </Section>

        {/* ── Location on Airport ──────────────────────────────────────── */}
        <Section title={formData.property_type === 'hangar' ? 'Hangar Location (optional)' : 'Property Location on Airport (optional)'}>
          <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Enter your airport code above and pin exactly where your property is on the field. Buyers can see it on
            the airport diagram, a feature no other marketplace offers.
          </p>
          {mapIcao ? (
            <>
              <AirportMap
                icao={mapIcao}
                savedLat={hangarLat}
                savedLng={hangarLng}
                centerLat={airportCoords?.lat}
                centerLng={airportCoords?.lng}
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
              minHeight: '220px',
              borderRadius: '10px',
              border: '1px dashed #d1d5db',
              backgroundColor: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#6b7280',
              padding: '1.5rem 1rem',
              textAlign: 'center',
            }}>
              {geocoding ? (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                       stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                       style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                    Looking up {formData.airport_code || 'airport'}…
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af' }}>
                    Loading the airport diagram so you can pin your hangar.
                  </p>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                       stroke="#9ca3af" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
                    <path d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>
                    Map will appear once you enter an airport code
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af', maxWidth: '380px', lineHeight: 1.5 }}>
                    Type your ICAO code (like KBFI) above. We&apos;ll load the airport diagram so you can drop a pin
                    on your exact hangar location. The pin is optional — you can submit without one.
                  </p>
                </>
              )}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </Section>

        {/* ── Photos ──────────────────────────────────────────────────── */}
        <Section title={`Photos (${MIN_PHOTOS}–40 allowed)`}>
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

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="submit"
            disabled={loading}
            onClick={() => setSubmitMode('draft')}
            style={draftButtonStyle}
          >
            {loading && submitMode === 'draft'
              ? (uploadProgress ?? 'Saving draft…')
              : 'Save as Draft'}
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={() => setSubmitMode('publish')}
            style={submitButtonStyle}
          >
            {loading && submitMode === 'publish'
              ? (uploadProgress ?? 'Publishing…')
              : 'Publish Listing'}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center' }}>
          Drafts stay private until you publish. You can finish them anytime from your dashboard.
        </p>
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
  return <div className="form-two-col">{children}</div>
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

const draftButtonStyle: React.CSSProperties = {
  padding: '0.85rem',
  backgroundColor: 'white',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
}
