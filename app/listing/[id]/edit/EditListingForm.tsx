'use client'

/**
 * EditListingForm — interactive edit form.
 *
 * Receives a pre-fetched listing from the server component parent,
 * so no client-side auth check or data fetch is needed.
 * Saving resets the listing to "pending" for admin review.
 */

import { useState, useActionState } from 'react'
import Link from 'next/link'
import { updateListing, type UpdateState } from '@/app/actions/listings'

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
}

export default function EditListingForm({ listing }: { listing: Listing }) {
  const [propertyType, setPropertyType] = useState(listing.property_type ?? 'hangar')
  const [listingType, setListingType]   = useState(listing.listing_type  ?? 'sale')

  const boundUpdate = updateListing.bind(null, listing.id)
  const [state, formAction, isPending] = useActionState<UpdateState, FormData>(boundUpdate, null)

  const isHangar = propertyType === 'hangar'
  const isHome   = propertyType === 'airport_home' || propertyType === 'fly_in_community'
  const isRental = listingType === 'lease' || listingType === 'space'

  return (
    <div style={{ maxWidth: '700px' }}>
      <Link href="/broker/dashboard" style={backLink}>← Back to dashboard</Link>
      <h1 style={{ margin: '1rem 0 0.25rem' }}>Edit Listing</h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Saving will reset your listing to <strong>pending review</strong> so the admin can approve your changes.
      </p>

      {state?.error && <div style={errorBox}>{state.error}</div>}

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
              <input name="airport_name" defaultValue={listing.airport_name} required style={inputStyle} />
            </Field>
            <Field label="Airport code *">
              <input name="airport_code" defaultValue={listing.airport_code} required style={inputStyle}
                onChange={e => e.target.value = e.target.value.toUpperCase()} />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="City *">
              <input name="city" defaultValue={listing.city} required style={inputStyle} />
            </Field>
            <Field label="State *">
              <input name="state" defaultValue={listing.state} required style={inputStyle} />
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
            <Field label="Ownership type">
              <select name="ownership_type" defaultValue={listing.ownership_type ?? ''} style={inputStyle}>
                <option value="">Select…</option>
                <option value="fee simple">Fee Simple (own the land)</option>
                <option value="leasehold">Leasehold (lease the land)</option>
                <option value="condo">Hangar Condo</option>
                <option value="T-hangar">T-Hangar</option>
                <option value="Business">Business</option>
              </select>
            </Field>
          )}
        </Section>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        <Section title="Pricing">
          {isRental ? (
            <Field label={listingType === 'space' ? 'Monthly rent for the space ($)' : 'Monthly lease ($)'}>
              <input name="monthly_lease" type="number" min="0" defaultValue={listing.monthly_lease ?? ''} style={inputStyle} />
            </Field>
          ) : (
            <TwoCol>
              <Field label="Asking price ($)">
                <input name="asking_price" type="number" min="0" defaultValue={listing.asking_price ?? ''} style={inputStyle} />
              </Field>
              <Field label="Monthly lease ($)">
                <input name="monthly_lease" type="number" min="0" defaultValue={listing.monthly_lease ?? ''} style={inputStyle} />
              </Field>
            </TwoCol>
          )}
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
              <Field label="Door width (ft)">
                <input name="door_width" type="number" min="0" defaultValue={listing.door_width ?? ''} style={inputStyle} />
              </Field>
              <Field label="Door height (ft)">
                <input name="door_height" type="number" min="0" defaultValue={listing.door_height ?? ''} style={inputStyle} />
              </Field>
            </TwoCol>
            <TwoCol>
              <Field label="Hangar depth (ft)">
                <input name="hangar_depth" type="number" min="0" defaultValue={listing.hangar_depth ?? ''} style={inputStyle} />
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
                  <input name="home_sqft" type="number" min="0" step="100" defaultValue={listing.home_sqft ?? ''} style={inputStyle} />
                </Field>
              </>
            )}
            <Field label="Lot size (acres)">
              <input name="lot_acres" type="number" min="0" step="0.01" defaultValue={listing.lot_acres ?? ''} style={inputStyle} />
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
        <Section title="Runway Info">
          <TwoCol>
            <Field label="Primary runway length (ft)">
              <input name="runway_length_ft" type="number" min="0" defaultValue={listing.runway_length_ft ?? ''} placeholder="e.g. 5000" style={inputStyle} />
            </Field>
            <Field label="Runway width (ft)">
              <input name="runway_width_ft" type="number" min="0" defaultValue={listing.runway_width_ft ?? ''} placeholder="e.g. 75" style={inputStyle} />
            </Field>
          </TwoCol>
          <Field label="Runway surface">
            <select name="runway_surface" defaultValue={listing.runway_surface ?? ''} style={inputStyle}>
              <option value="">Select surface type…</option>
              {SURFACE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
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

        <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '2rem' }}>
          <button type="submit" disabled={isPending} style={saveBtn}>
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
          <Link href="/broker/dashboard" style={cancelLink}>Cancel</Link>
        </div>
      </form>
    </div>
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
