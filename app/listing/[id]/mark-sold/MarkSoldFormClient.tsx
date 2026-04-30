'use client'

/**
 * "Congratulations on the sale" capture form.
 *
 * Hosts the rich data fields that feed our market intelligence pipeline.
 * Everything except the celebration is optional — sellers shouldn't feel
 * gatekept from completing the action just because they don't want to share
 * a buyer state.
 */

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PartyPopper, MapPin, DollarSign, Users, Clock, Award, ChevronRight,
} from 'lucide-react'
import { markListingSold, type MarkSoldState } from '@/app/actions/listings'

type Props = {
  listingId:           string
  listingTitle:        string
  airportCode:         string
  airportName:         string | null
  listingType:         string
  currentAskingPrice:  number | null
  createdAt:           string
}

const SOLD_VIA_OPTIONS = [
  { value: 'platform',     label: 'Through Hangar Marketplace' },
  { value: 'off_platform', label: 'Buyer found elsewhere' },
  { value: 'lease_signed', label: 'Lease signed' },
  { value: 'other',        label: 'Other' },
]

const BUYER_TYPE_OPTIONS = [
  { value: 'cash',           label: 'Cash buyer' },
  { value: 'financed',       label: 'Financed' },
  { value: 'business',       label: 'Business / corporate' },
  { value: 'investor',       label: 'Investor / non-occupant' },
  { value: 'owner_occupant', label: 'Owner-occupant' },
  { value: 'other',          label: 'Other' },
]

const SELECTION_REASONS = [
  { value: 'best_price',          label: 'Best price' },
  { value: 'best_terms',          label: 'Best terms' },
  { value: 'faster_close',        label: 'Faster close' },
  { value: 'all_cash',            label: 'All-cash offer' },
  { value: 'fewer_contingencies', label: 'Fewer contingencies' },
  { value: 'broker_connection',   label: 'Broker relationship' },
  { value: 'only_offer',          label: 'Only offer received' },
  { value: 'other',               label: 'Other' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
  'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
  'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
  'WI','WY','DC','PR',
]

export default function MarkSoldFormClient(props: Props) {
  const router = useRouter()
  const isLease = props.listingType === 'lease' || props.listingType === 'space'
  const verb    = isLease ? 'leased' : 'sold'
  const verbing = isLease ? 'leasing' : 'selling'

  const action = markListingSold.bind(null, props.listingId)
  const [state, formAction, pending] = useActionState<MarkSoldState, FormData>(action, null)

  // Local state for chips + numeric helpers
  const [reasons, setReasons] = useState<string[]>([])
  const [hasMultiple, setHasMultiple] = useState(false)

  function toggleReason(value: string) {
    setReasons(curr => curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value])
  }

  // Days on market preview (purely cosmetic — backend recomputes).
  const daysOnMarket = Math.max(
    0,
    Math.floor((Date.now() - new Date(props.createdAt).getTime()) / 86_400_000),
  )

  // On success, navigate forward to the celebratory recap.
  useEffect(() => {
    if (state?.success && state.redirectTo) {
      router.push(state.redirectTo)
    }
  }, [state?.success, state?.redirectTo, router])

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={hero}>
        <div style={heroIcon}>
          <PartyPopper size={28} strokeWidth={1.75} />
        </div>
        <p style={heroEyebrow}>Congratulations on the sale</p>
        <h1 style={heroTitle}>
          You&apos;re about to mark <em style={{ fontStyle: 'normal', color: '#fbbf24' }}>{props.listingTitle}</em> as {verb}.
        </h1>
        <p style={heroSub}>
          A handful of optional questions help us power the quarterly market intelligence reports.
          Your individual answers stay private — we only ever publish anonymized, airport-level aggregates.
        </p>
      </div>

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* ── Sale price + closing date ─────────────────────────────────── */}
        <Card>
          <SectionHead
            icon={<DollarSign size={16} />}
            title={isLease ? 'Final terms' : 'Sale terms'}
            hint={isLease
              ? 'Helps us track how lease rates compare to asking. Optional but high-impact.'
              : 'The single most useful data point we collect — drives our median-price comps.'}
          />
          <Grid cols={2}>
            <Field label={isLease ? 'Final monthly lease rate' : 'Sale price'}>
              <PrefixInput
                prefix="$"
                name="sale_price"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder={props.currentAskingPrice ? String(props.currentAskingPrice) : '125000'}
              />
            </Field>
            <Field label="Final asking at close">
              <PrefixInput
                prefix="$"
                name="asking_at_sale"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder={props.currentAskingPrice ? String(props.currentAskingPrice) : ''}
              />
              <p style={hint}>
                If you reduced the price along the way, this is the asking price the day you signed.
              </p>
            </Field>
          </Grid>
          <Grid cols={2}>
            <Field label="Closing date">
              <input name="sold_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
            </Field>
            <Field label={`How did the deal happen?`}>
              <select name="sold_via" defaultValue="" style={inputStyle}>
                <option value="">— Select —</option>
                {SOLD_VIA_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </Grid>
          <p style={daysBadge}>
            <Clock size={14} /> Listed {daysOnMarket} day{daysOnMarket === 1 ? '' : 's'} ago
          </p>
        </Card>

        {/* ── Buyer profile ──────────────────────────────────────────────── */}
        <Card>
          <SectionHead
            icon={<Users size={16} />}
            title="The buyer"
            hint="Aggregate buyer mix tells brokers who's actually closing — cash vs. financed, owner-occupant vs. investor."
          />
          <Grid cols={2}>
            <Field label="Buyer type">
              <select name="buyer_type" defaultValue="" style={inputStyle}>
                <option value="">— Skip —</option>
                {BUYER_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Buyer's home state">
              <select name="buyer_state" defaultValue="" style={inputStyle}>
                <option value="">— Skip —</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p style={hint}>
                Where the buyer is based. Helps us track migration patterns across airports.
              </p>
            </Field>
          </Grid>
        </Card>

        {/* ── Offer dynamics ────────────────────────────────────────────── */}
        <Card>
          <SectionHead
            icon={<Award size={16} />}
            title="Offer dynamics"
            hint="Multi-offer markets vs. single-offer markets behave very differently — this is the input that makes the report meaningful."
          />

          <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', cursor: 'pointer', padding: '0.5rem 0' }}>
            <input
              type="checkbox"
              name="received_multiple_offers"
              checked={hasMultiple}
              onChange={e => setHasMultiple(e.target.checked)}
              style={{ marginTop: '0.2rem', width: '17px', height: '17px', accentColor: '#1d4ed8' }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>I received multiple offers on this listing</p>
              <p style={hint}>Even a yes/no here is huge for our reporting.</p>
            </div>
          </label>

          {hasMultiple && (
            <Field label="Total offers received (optional)">
              <input
                name="offer_count"
                type="number"
                inputMode="numeric"
                min={2}
                max={50}
                placeholder="3"
                style={{ ...inputStyle, maxWidth: '180px' }}
              />
            </Field>
          )}

          <p style={{ ...hint, margin: '0.85rem 0 0.4rem', fontWeight: 600, color: '#334155' }}>
            Why did you pick this buyer? <span style={{ color: '#94a3b8', fontWeight: 400 }}>(select any that apply)</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {SELECTION_REASONS.map(r => {
              const active = reasons.includes(r.value)
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => toggleReason(r.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: active ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                    borderRadius: '999px',
                    backgroundColor: active ? '#eff6ff' : 'white',
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
          {/* Hidden inputs ferry the chip selection into the FormData */}
          {reasons.map(r => (
            <input key={r} type="hidden" name="selection_reasons" value={r} />
          ))}
        </Card>

        {/* ── Free-form notes ───────────────────────────────────────────── */}
        <Card>
          <SectionHead
            icon={<MapPin size={16} />}
            title="Anything else?"
            hint="Optional reflections — what would you do differently? Anything notable about the buyer or process?"
          />
          <textarea
            name="notes"
            placeholder="e.g. Buyer was relocating from CA, paid cash, closed in 11 days. Listing photos were the key; my second showing turned into the offer."
            rows={4}
            maxLength={2000}
            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          />
        </Card>

        {state?.error && <div style={errorBox}>{state.error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link href={`/listing/${props.listingId}/edit`} style={backLink}>
            ← Back to edit
          </Link>
          <button type="submit" disabled={pending} style={primaryBtn(pending)}>
            {pending ? 'Saving…' : `Confirm ${verb}`} <ChevronRight size={16} />
          </button>
        </div>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
          You can leave any field blank. Just confirming the sale is enough — the rest is gravy for our quarterly reports.
        </p>
      </form>
    </>
  )
}

// ── Layout primitives ─────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '1.25rem 1.4rem',
      display: 'flex', flexDirection: 'column', gap: '0.85rem',
    }}>
      {children}
    </section>
  )
}

function SectionHead({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
      <span style={iconBadge}>{icon}</span>
      <div>
        <p style={sectionTitle}>{title}</p>
        <p style={sectionHint}>{hint}</p>
      </div>
    </div>
  )
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '0.85rem' }}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

type PrefixInputProps = React.InputHTMLAttributes<HTMLInputElement> & { prefix: string }
function PrefixInput({ prefix, ...rest }: PrefixInputProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      border: '1px solid #cbd5e1', borderRadius: '6px',
      backgroundColor: 'white',
    }}>
      <span style={{
        padding: '0.55rem 0.6rem 0.55rem 0.75rem',
        color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem',
      }}>{prefix}</span>
      <input
        {...rest}
        style={{
          flex: 1,
          padding: '0.55rem 0.7rem 0.55rem 0',
          border: 'none', outline: 'none',
          fontSize: '0.9rem', backgroundColor: 'transparent',
        }}
      />
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const hero: React.CSSProperties = {
  padding: '2.25rem 1.5rem 2rem',
  marginBottom: '1.5rem',
  background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)',
  borderRadius: '16px',
  color: 'white',
  textAlign: 'center',
  boxShadow: '0 10px 40px -12px rgba(29,78,216,0.5)',
}
const heroIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '54px', height: '54px', borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.18)',
  marginBottom: '0.75rem',
  color: '#fbbf24',
}
const heroEyebrow: React.CSSProperties = {
  margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.12em',
  color: '#bfdbfe',
}
const heroTitle: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 800,
  letterSpacing: '-0.01em', lineHeight: 1.3,
}
const heroSub: React.CSSProperties = {
  margin: '0 auto', maxWidth: '520px',
  fontSize: '0.88rem', color: '#dbeafe', lineHeight: 1.55,
}

const iconBadge: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '32px', height: '32px', borderRadius: '8px',
  backgroundColor: '#eff6ff', color: '#1d4ed8',
  border: '1px solid #dbeafe',
  flexShrink: 0,
}
const sectionTitle: React.CSSProperties = {
  margin: '0 0 0.15rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a',
}
const sectionHint: React.CSSProperties = {
  margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5,
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.78rem', fontWeight: 600, color: '#475569',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.55rem 0.7rem',
  border: '1px solid #cbd5e1', borderRadius: '6px',
  fontSize: '0.9rem',
}
const hint: React.CSSProperties = {
  margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#94a3b8',
}
const daysBadge: React.CSSProperties = {
  margin: '0.25rem 0 0',
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  fontSize: '0.78rem', color: '#64748b',
  padding: '0.3rem 0.7rem',
  backgroundColor: '#f1f5f9', borderRadius: '999px',
  alignSelf: 'flex-start',
}
const errorBox: React.CSSProperties = {
  padding: '0.7rem 0.9rem',
  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem',
}
const backLink: React.CSSProperties = {
  fontSize: '0.875rem', color: '#64748b', textDecoration: 'none',
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.75rem 1.5rem',
    background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    color: 'white', fontWeight: 700, fontSize: '0.92rem',
    border: 'none', borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(29,78,216,0.3)',
  }
}
