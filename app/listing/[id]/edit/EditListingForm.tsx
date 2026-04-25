'use client'

/**
 * EditListingForm — interactive edit form.
 *
 * Receives a pre-fetched listing from the server component parent,
 * so no client-side auth check or data fetch is needed.
 * Saving resets the listing to "pending" for admin review.
 */

import { useState, useActionState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { updateListing, type UpdateState } from '@/app/actions/listings'
import FeetInchesInput from '@/app/components/FeetInchesInput'
import AirportAutocomplete, { type AirportSuggestion } from '@/app/components/AirportAutocomplete'

// Leaflet must be loaded client-side only — same dynamic-import pattern as
// the submit form.
const AirportMap = dynamic(() => import('@/app/components/AirportMap'), { ssr: false })

type AirportCoords = { lat: number; lng: number; icao: string }

const SURFACE_OPTIONS = [
  'Asphalt', 'Asphalt (grooved)', 'Concrete', 'Asphalt/Concrete',
  'Turf/Grass', 'Gravel', 'Turf/Gravel', 'Dirt', 'Water', 'Sand', 'Other',
]

const PROPERTY_TYPE_OPTIONS = [
  { value: 'hangar',           label: '🏗 Hangar' },
  { value: 'airport_home',     label: '🏡 Airport Home' },
  { value: 'land',             label: '🌿 Land / Lot' },
  { value: 'fly_in_community', label: '✈ Fly-in Community' },
]

// Must match the list in app/submit/page.tsx.
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

type Listing = {
  id: string
  title: string
  property_type: string
  airport_name: string
  airport_code: string
  city: string
  state: string
  listing_type: string
  ownership_type: string | null
  asking_price: number | null
  monthly_lease: number | null
  square_feet: number | null
  door_width: number | null
  door_height: number | null
  hangar_depth: number | null
  bedrooms: number | null
  bathrooms: number | null
  home_sqft: number | null
  lot_acres: number | null
  airpark_name: string | null
  has_runway_access: boolean | null
  address: string | null
  zip_code: string | null
  runway_length_ft: number | null
  runway_width_ft: number | null
  runway_surface: string | null
  description: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  // New fields from the drafts/amenities/HOA migration. Optional in the type
  // because old listings stored before the migration ran may not carry them.
  hoa_monthly?: number | null
  annual_property_tax?: number | null
  amenities?: string[] | null
  leasehold_years_remaining?: number | null
  status?: string
  // Pin location on the airport diagram + searchable map coords.
  hangar_lat?: number | null
  hangar_lng?: number | null
  latitude?: number | null
  longitude?: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const stateAbbr = (region: string | null) => region ? region.replace('US-', '') : ''

export default function EditListingForm({ listing }: { listing: Listing }) {
  const [propertyType, setPropertyType] = useState(listing.property_type ?? 'hangar')
  const [listingType, setListingType]   = useState(listing.listing_type  ?? 'sale')

  // Controlled airport fields (needed for auto-fill)
  const [airportName, setAirportName] = useState(listing.airport_name ?? '')
  const [airportCode, setAirportCode] = useState(listing.airport_code ?? '')
  const [city, setCity]               = useState(listing.city ?? '')
  const [state, setState]             = useState(listing.state ?? '')

  // Controlled ownership type so the leasehold years input can conditionally render.
  const [ownershipType, setOwnershipType] = useState(listing.ownership_type ?? '')

  // Runway auto-fill state
  const [runwayLength, setRunwayLength] = useState(listing.runway_length_ft != null ? String(listing.runway_length_ft) : '')
  const [runwayWidth,  setRunwayWidth]  = useState(listing.runway_width_ft  != null ? String(listing.runway_width_ft)  : '')
  const [runwaySurface, setRunwaySurface] = useState(listing.runway_surface ?? '')
  const [runwayLoading, setRunwayLoading] = useState(false)

  // Amenities checkbox state — hydrated from the listing's current amenity list.
  const [amenities, setAmenities] = useState<string[]>(
    Array.isArray(listing.amenities) ? listing.amenities.filter(a => typeof a === 'string') : []
  )

  // Drafts get Save as Draft + Publish buttons. Non-drafts just get Save changes.
  const isDraft = listing.status === 'draft'

  // ── Airport map / pin state ─────────────────────────────────────────────
  // hangarLat/Lng = the pin position on the airport diagram (most precise).
  // airportCoords = airport center, used as the map's fallback center when
  //                 no OSM aerodrome diagram is available (small private fields).
  const [hangarLat, setHangarLat] = useState<number | null>(listing.hangar_lat ?? null)
  const [hangarLng, setHangarLng] = useState<number | null>(listing.hangar_lng ?? null)
  const [airportCoords, setAirportCoords] = useState<AirportCoords | null>(
    listing.latitude != null && listing.longitude != null
      ? { lat: listing.latitude, lng: listing.longitude, icao: listing.airport_code ?? '' }
      : null
  )

  // Resolve the airport's lat/lng if we don't already have it cached. Runs
  // once on mount so the map can center even when the saved listing predates
  // the radius-search feature.
  useEffect(() => {
    if (airportCoords || !airportCode) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(airportCode)}&limit=1`)
        if (!res.ok) return
        const data = await res.json()
        const match = data[0]
        if (match && !cancelled && match.ident.toUpperCase() === airportCode.toUpperCase()) {
          setAirportCoords({ lat: match.latitude_deg, lng: match.longitude_deg, icao: airportCode })
        }
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
    // Only re-run when the user changes the airport code intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportCode])

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setHangarLat(lat)
    setHangarLng(lng)
  }, [])

  const icaoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const boundUpdate = updateListing.bind(null, listing.id)
  const [state2, formAction, isPending] = useActionState<UpdateState, FormData>(boundUpdate, null)

  const isHangar = propertyType === 'hangar'
  const isHome   = propertyType === 'airport_home' || propertyType === 'fly_in_community'
  const isRental = listingType === 'lease' || listingType === 'space'

  // Called when user picks an airport from the autocomplete dropdown
  async function applyAirportSelection(airport: AirportSuggestion) {
    setAirportName(airport.name)
    setAirportCode(airport.ident)
    if (airport.municipality) setCity(airport.municipality)
    const st = stateAbbr(airport.iso_region)
    if (st) setState(st)
    fetchRunwayData(airport.ident)
    // New airport selected — update map center and clear any stale pin.
    setAirportCoords({ lat: airport.latitude_deg, lng: airport.longitude_deg, icao: airport.ident })
    setHangarLat(null)
    setHangarLng(null)
  }

  // Auto-geocode: when code typed manually, try to fill city/state + runway
  async function lookupAirportCode(code: string) {
    if (code.length < 3) return
    try {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(code)}&limit=1`)
      if (!res.ok) return
      const data = await res.json()
      const match = data[0]
      if (match && match.ident.toUpperCase() === code.toUpperCase()) {
        if (airportName === listing.airport_code || !airportName) setAirportName(match.name)
        if (match.municipality) setCity(match.municipality)
        const st = stateAbbr(match.iso_region)
        if (st) setState(st)
        fetchRunwayData(code)
      }
    } catch { /* non-fatal */ }
  }

  async function fetchRunwayData(code: string) {
    setRunwayLoading(true)
    try {
      const res = await fetch(`/api/airports/runways?code=${encodeURIComponent(code)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found) {
          if (data.runway_length_ft != null) setRunwayLength(String(data.runway_length_ft))
          if (data.runway_width_ft  != null) setRunwayWidth(String(data.runway_width_ft))
          if (data.runway_surface   != null) setRunwaySurface(data.runway_surface)
        }
      }
    } catch { /* non-fatal */ }
    finally { setRunwayLoading(false) }
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase()
    setAirportCode(val)
    if (icaoDebounceRef.current) clearTimeout(icaoDebounceRef.current)
    icaoDebounceRef.current = setTimeout(() => lookupAirportCode(val), 700)
  }

  return (
    <>
      <Link href="/broker/dashboard" style={backLink}>← Back to dashboard</Link>
      <h1 style={{ margin: '1rem 0 0.25rem' }}>Edit Listing</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Saving will reset your listing to <strong>pending review</strong> so the admin can approve your changes.
      </p>

      {state2?.error && <div style={errorBox}>{state2.error}</div>}

      <form action={formAction} style={{ display: 'grid', gap: '1.25rem' }}>

        {/* ── Property Type ──────────────────────────────────────────────── */}
        <Section title="Property Type">
          <input type="hidden" name="property_type" value={propertyType} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
            {PROPERTY_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPropertyType(opt.value)}
                style={{
                  padding: '0.7rem 0.5rem',
                  border: `2px solid ${propertyType === opt.value ? '#6366f1' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: propertyType === opt.value ? '#eef2ff' : 'white',
                  color: propertyType === opt.value ? '#4338ca' : '#374151',
                  fontWeight: propertyType === opt.value ? '700' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <Field label="Listing title *">
            <input name="title" defaultValue={listing.title} required style={inputStyle} />
          </Field>
          <TwoCol>
            <Field label="Airport name *">
              {/* Hidden input carries the value into FormData */}
              <input type="hidden" name="airport_name" value={airportName} />
              <AirportAutocomplete
                value={airportName}
                onChange={setAirportName}
                onSelect={applyAirportSelection}
                placeholder="Search airport name…"
                required
                inputStyle={inputStyle}
              />
            </Field>
            <Field label="Airport code *">
              <div style={{ position: 'relative' }}>
                <input
                  name="airport_code"
                  placeholder="KBFI"
                  value={airportCode}
                  onChange={handleCodeChange}
                  required
                  maxLength={6}
                  style={{ ...inputStyle, paddingRight: runwayLoading ? '2.5rem' : undefined }}
                />
                {runwayLoading && (
                  <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#9ca3af' }}>
                    ✦
                  </span>
                )}
              </div>
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="City *">
              <input name="city" value={city} onChange={e => setCity(e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="State *">
              <input name="state" value={state} onChange={e => setState(e.target.value)} required style={inputStyle} maxLength={2} />
            </Field>
          </TwoCol>
          <Field label="Listing type *">
            <select
              name="listing_type"
              value={listingType}
              onChange={e => setListingType(e.target.value)}
              style={inputStyle}
            >
              {isHangar ? (
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
          {isHangar && (
            <>
              <Field label="Ownership type">
                <select
                  name="ownership_type"
                  value={ownershipType}
                  onChange={e => setOwnershipType(e.target.value)}
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
              {ownershipType === 'leasehold' && (
                <Field label="Years remaining on the ground lease *">
                  <input
                    name="leasehold_years_remaining"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 25"
                    defaultValue={listing.leasehold_years_remaining ?? ''}
                    required
                    style={{ ...inputStyle, maxWidth: '200px' }}
                  />
                </Field>
              )}
            </>
          )}
        </Section>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        {/* Same rule as submit: For Sale → asking only, For Lease → monthly only. */}
        <Section title="Pricing">
          {isRental ? (
            <Field label={listingType === 'space' ? 'Monthly rent for the space ($)' : 'Monthly lease ($)'}>
              <input name="monthly_lease" type="number" min="0" defaultValue={listing.monthly_lease ?? ''} style={inputStyle} />
            </Field>
          ) : (
            <Field label="Asking price ($)">
              <input name="asking_price" type="number" min="0" defaultValue={listing.asking_price ?? ''} style={inputStyle} />
            </Field>
          )}
        </Section>

        {/* ── Recurring costs ──────────────────────────────────────────── */}
        <Section title="Monthly HOA and annual property tax">
          <TwoCol>
            <Field label="HOA (monthly, $)">
              <input
                name="hoa_monthly"
                type="number"
                min="0"
                step="1"
                defaultValue={listing.hoa_monthly ?? ''}
                placeholder="0"
                style={inputStyle}
              />
            </Field>
            <Field label="Annual property tax ($)">
              <input
                name="annual_property_tax"
                type="number"
                min="0"
                step="1"
                defaultValue={listing.annual_property_tax ?? ''}
                placeholder="0"
                style={inputStyle}
              />
            </Field>
          </TwoCol>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>
            Enter 0 if neither applies. Leave blank if unknown.
          </p>
        </Section>

        {/* ── Amenities ────────────────────────────────────────────────── */}
        <Section title="Amenities">
          {/* Hidden field carries the JSON-encoded array to the server action. */}
          <input type="hidden" name="amenities" value={JSON.stringify(amenities)} />
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>
            Check every feature that&apos;s included or easily available.
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

        {/* ── Hangar Dimensions ──────────────────────────────────────────── */}
        {isHangar && (
          <Section title="Dimensions">
            <TwoCol>
              <Field label="Square feet">
                <input name="square_feet" type="number" min="0" defaultValue={listing.square_feet ?? ''} style={inputStyle} />
              </Field>
              <Field label=""><span /></Field>
            </TwoCol>
            <TwoCol>
              <Field label="Door width">
                <FeetInchesInput name="door_width" defaultValue={listing.door_width} style={inputStyle} />
              </Field>
              <Field label="Door height">
                <FeetInchesInput name="door_height" defaultValue={listing.door_height} style={inputStyle} />
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Hangar depth">
                <FeetInchesInput name="hangar_depth" defaultValue={listing.hangar_depth} style={inputStyle} />
              </Field>
              <Field label=""><span /></Field>
            </TwoCol>
          </Section>
        )}

        {/* ── Property Details (home / land / fly-in) ────────────────────── */}
        {!isHangar && (
          <Section title="Property Details">
            <Field label="Street address">
              <input name="address" defaultValue={listing.address ?? ''} placeholder="123 Runway Drive" style={inputStyle} />
            </Field>
            <Field label="ZIP code">
              <input name="zip_code" defaultValue={listing.zip_code ?? ''} placeholder="98101" maxLength={10}
                style={{ ...inputStyle, maxWidth: '160px' }} />
            </Field>
            {isHome && (
              <>
                <TwoCol>
                  <Field label="Bedrooms">
                    <input name="bedrooms" type="number" min="0" defaultValue={listing.bedrooms ?? ''} style={inputStyle} />
                  </Field>
                  <Field label="Bathrooms">
                    <input name="bathrooms" type="number" min="0" step="0.5" defaultValue={listing.bathrooms ?? ''} style={inputStyle} />
                  </Field>
                </TwoCol>
                <Field label="Home square footage">
                  <input name="home_sqft" type="number" min="0" step="any" defaultValue={listing.home_sqft ?? ''} style={inputStyle} />
                </Field>
              </>
            )}
            <Field label="Lot size (acres)">
              <input name="lot_acres" type="number" min="0" step="any" defaultValue={listing.lot_acres ?? ''} style={inputStyle} />
            </Field>
            <Field label="Airpark / community name">
              <input name="airpark_name" defaultValue={listing.airpark_name ?? ''} placeholder="e.g. Spruce Creek Fly-In" style={inputStyle} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', color: '#374151' }}>
              <input
                type="checkbox"
                name="has_runway_access"
                defaultChecked={listing.has_runway_access ?? false}
                style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
              />
              Direct runway / taxiway access from property
            </label>
          </Section>
        )}

        {/* ── Runway Info ────────────────────────────────────────────────── */}
        <Section title={`Runway Info${runwayLoading ? ' (loading…)' : ''}`}>
          <TwoCol>
            <Field label="Runway length (ft)">
              <input name="runway_length_ft" type="number" min="0"
                value={runwayLength} onChange={e => setRunwayLength(e.target.value)}
                placeholder="e.g. 5000" style={inputStyle} />
            </Field>
            <Field label="Runway width (ft)">
              <input name="runway_width_ft" type="number" min="0"
                value={runwayWidth} onChange={e => setRunwayWidth(e.target.value)}
                placeholder="e.g. 75" style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Runway surface">
            <select name="runway_surface" value={runwaySurface} onChange={e => setRunwaySurface(e.target.value)} style={inputStyle}>
              <option value="">Select surface type…</option>
              {SURFACE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Section>

        {/* ── Location on Airport ──────────────────────────────────────────── */}
        {/* Hidden inputs carry the pin coords into the formData; the visible map */}
        {/* lets brokers drag the marker to update them.                          */}
        <input type="hidden" name="hangar_lat" value={hangarLat ?? ''} />
        <input type="hidden" name="hangar_lng" value={hangarLng ?? ''} />
        <Section title={isHangar ? 'Hangar Location (optional)' : 'Property Location on Airport (optional)'}>
          <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Drop or drag a pin to mark exactly where the property sits on the field. Buyers see this on
            the airport diagram, and the location is used for the 50-mile alert radius.
          </p>
          {airportCode ? (
            <>
              <AirportMap
                icao={airportCode}
                savedLat={hangarLat}
                savedLng={hangarLng}
                centerLat={airportCoords?.lat}
                centerLng={airportCoords?.lng}
                editable
                onLocationSelect={handleLocationSelect}
                height="380px"
              />
              {hangarLat != null && hangarLng != null && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>
                    ✓ Pin placed at {hangarLat.toFixed(5)}, {hangarLng.toFixed(5)}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setHangarLat(null); setHangarLng(null) }}
                    style={{
                      background: 'none', border: 'none', color: '#6b7280',
                      fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    Clear pin
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{
              minHeight: '160px', borderRadius: '10px', border: '1px dashed #d1d5db',
              backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem', padding: '1rem',
              textAlign: 'center',
            }}>
              Add an airport code above to load the map.
            </div>
          )}
        </Section>

        {/* ── Description ────────────────────────────────────────────────── */}
        <Section title="Description">
          <Field label={`About this ${isHangar ? 'hangar' : propertyType === 'land' ? 'land' : 'property'}`}>
            <textarea
              name="description"
              rows={5}
              defaultValue={listing.description ?? ''}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
        </Section>

        {/* ── Contact ────────────────────────────────────────────────────── */}
        <Section title="Contact Info">
          <Field label="Your name *">
            <input name="contact_name" defaultValue={listing.contact_name} required style={inputStyle} />
          </Field>
          <TwoCol>
            <Field label="Email *">
              <input name="contact_email" type="email" defaultValue={listing.contact_email} required style={inputStyle} />
            </Field>
            <Field label="Phone">
              <input name="contact_phone" type="tel" defaultValue={listing.contact_phone ?? ''} style={inputStyle} />
            </Field>
          </TwoCol>
        </Section>

        {/* ── Actions ────────────────────────────────────────────────── */}
        {/* Draft listings offer Save as Draft + Publish. Everything else just */}
        {/* has a single Save changes button (which resets to pending review). */}
        {isDraft ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingBottom: '0.5rem' }}>
            <button
              type="submit"
              name="save_mode"
              value="draft"
              disabled={isPending}
              style={draftBtn}
            >
              {isPending ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              name="save_mode"
              value="publish"
              disabled={isPending}
              style={saveBtn}
            >
              {isPending ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '2rem' }}>
            <button type="submit" disabled={isPending} style={saveBtn}>
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
            <Link href="/broker/dashboard" style={cancelLink}>Cancel</Link>
          </div>
        )}
        {isDraft && (
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', paddingBottom: '2rem' }}>
            Drafts stay private. Publishing sends your listing to review (or live instantly if you&apos;re a verified broker).
          </p>
        )}
      </form>
    </>
  )
}

// ── Layout helpers ─────────────────────────────────────────────────────────

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
      {label && <label style={labelStyle}>{label}</label>}
      {children}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const backLink: React.CSSProperties = {
  color: '#6366f1', textDecoration: 'none', fontSize: '0.875rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#fafafa',
  color: '#111827',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: '600', color: '#6b7280',
}

const saveBtn: React.CSSProperties = {
  padding: '0.75rem 1.75rem',
  backgroundColor: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: '700',
  cursor: 'pointer',
}

const draftBtn: React.CSSProperties = {
  padding: '0.75rem 1.75rem',
  backgroundColor: 'white',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
}

const cancelLink: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.95rem',
  color: '#6b7280',
  textDecoration: 'none',
  display: 'inline-block',
}

const errorBox: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  color: '#dc2626',
  fontSize: '0.875rem',
}
