'use client'

/**
 * Success view shown after a successful submit, or whenever someone returns
 * to the mark-sold page on an already-closed listing. Acts as a recap +
 * a "what happens next" pointer.
 */

import Link from 'next/link'
import { CheckCircle2, BarChart3, Mail, ChevronRight } from 'lucide-react'

type Outcome = {
  buyer_type:               string | null
  buyer_state:              string | null
  offer_count:              number | null
  received_multiple_offers: boolean | null
  selection_reasons:        string[] | null
  asking_at_sale:           number | null
  days_on_market:           number | null
  notes:                    string | null
}

type Props = {
  listingId:    string
  listingTitle: string
  airportCode:  string
  verb:         string                      // "sold" | "leased"
  salePrice:    number | null
  soldAt:       string | null
  soldVia:      string | null
  outcome:      Outcome | null
}

export default function SoldSuccessCard(props: Props) {
  const dateStr = props.soldAt
    ? new Date(props.soldAt).toLocaleDateString(undefined, { dateStyle: 'long' })
    : null

  return (
    <>
      <div style={hero}>
        <div style={heroIcon}>
          <CheckCircle2 size={32} />
        </div>
        <p style={heroEyebrow}>You did it</p>
        <h1 style={heroTitle}>
          <em style={{ fontStyle: 'normal', color: '#fbbf24' }}>{props.listingTitle}</em> is officially {props.verb}.
        </h1>
        <p style={heroSub}>
          Thanks for closing the loop with us — every captured sale makes the next quarterly market
          intelligence report sharper for everyone in {props.airportCode}.
        </p>
      </div>

      {/* Recap card */}
      <section style={card}>
        <p style={cardTitle}>What we recorded</p>
        <dl style={dl}>
          <Row label={`${props.verb === 'sold' ? 'Sale' : 'Lease'} price`}>
            {props.salePrice ? `$${props.salePrice.toLocaleString()}` : <Skip />}
          </Row>
          {dateStr && <Row label="Closing date">{dateStr}</Row>}
          {props.soldVia && <Row label="Channel">{prettify(props.soldVia)}</Row>}
          {props.outcome?.asking_at_sale && (
            <Row label="Final asking">${props.outcome.asking_at_sale.toLocaleString()}</Row>
          )}
          {props.outcome?.days_on_market != null && (
            <Row label="Days on market">{props.outcome.days_on_market}</Row>
          )}
          {props.outcome?.buyer_type && (
            <Row label="Buyer type">{prettify(props.outcome.buyer_type)}</Row>
          )}
          {props.outcome?.buyer_state && (
            <Row label="Buyer state">{props.outcome.buyer_state}</Row>
          )}
          {props.outcome?.received_multiple_offers && (
            <Row label="Multiple offers">
              Yes{props.outcome.offer_count ? ` (${props.outcome.offer_count} total)` : ''}
            </Row>
          )}
          {props.outcome?.selection_reasons && props.outcome.selection_reasons.length > 0 && (
            <Row label="Why this buyer">
              {props.outcome.selection_reasons.map(prettify).join(', ')}
            </Row>
          )}
          {props.outcome?.notes && (
            <Row label="Notes" full>
              <span style={{ fontStyle: 'italic', color: '#475569' }}>“{props.outcome.notes}”</span>
            </Row>
          )}
        </dl>
      </section>

      {/* What happens next */}
      <section style={{ ...card, marginTop: '1.25rem' }}>
        <p style={cardTitle}>What happens next</p>
        <NextStep
          icon={<BarChart3 size={18} color="#1d4ed8" />}
          title="Your sale feeds the next quarterly report"
          body="Aggregated, never attributed. Your numbers show up as part of the airport-level median, not as a line item."
        />
        <NextStep
          icon={<Mail size={18} color="#1d4ed8" />}
          title="You'll see it land in the newsletter"
          body="Subscribers get a private link to the full quarterly. We'll spotlight any market where movement was notable."
        />
        <NextStep
          icon={<CheckCircle2 size={18} color="#1d4ed8" />}
          title="Your listing is now hidden from browse"
          body="It won't appear in search results anymore. You can still view it from your dashboard."
        />
      </section>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.75rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard" style={primaryBtn}>
          Back to dashboard <ChevronRight size={16} />
        </Link>
        <Link href={`/listing/${props.listingId}`} style={secondaryBtn}>
          View listing
        </Link>
      </div>
    </>
  )
}

function Row({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: full ? '1fr' : '160px 1fr',
      gap: full ? '0.25rem' : '1rem',
      padding: '0.55rem 0',
      borderBottom: '1px solid #f1f5f9',
    }}>
      <dt style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a' }}>{children}</dd>
    </div>
  )
}
function Skip() {
  return <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>not shared</span>
}
function NextStep({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.6rem 0' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '34px', height: '34px', borderRadius: '8px',
        backgroundColor: '#eff6ff', border: '1px solid #dbeafe', flexShrink: 0,
      }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{title}</p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  )
}

function prettify(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const hero: React.CSSProperties = {
  padding: '2.5rem 1.5rem 2.25rem',
  marginBottom: '1.5rem',
  background: 'linear-gradient(135deg, #14532d 0%, #16a34a 65%, #22c55e 100%)',
  borderRadius: '16px',
  color: 'white',
  textAlign: 'center',
  boxShadow: '0 10px 40px -12px rgba(22,163,74,0.45)',
}
const heroIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '60px', height: '60px', borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.2)',
  marginBottom: '0.85rem',
  color: '#fbbf24',
}
const heroEyebrow: React.CSSProperties = {
  margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.14em',
  color: '#bbf7d0',
}
const heroTitle: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 800,
  letterSpacing: '-0.01em', lineHeight: 1.3,
}
const heroSub: React.CSSProperties = {
  margin: '0 auto', maxWidth: '540px',
  fontSize: '0.88rem', color: '#dcfce7', lineHeight: 1.55,
}
const card: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '1.25rem 1.4rem',
}
const cardTitle: React.CSSProperties = {
  margin: '0 0 0.85rem', fontSize: '0.7rem', fontWeight: 700,
  color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.1em',
}
const dl: React.CSSProperties = {
  margin: 0, padding: 0,
  display: 'flex', flexDirection: 'column',
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  padding: '0.7rem 1.4rem',
  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  color: 'white', fontWeight: 700, fontSize: '0.9rem',
  borderRadius: '10px', textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
}
const secondaryBtn: React.CSSProperties = {
  padding: '0.7rem 1.4rem',
  backgroundColor: 'white', color: '#1d4ed8',
  border: '1px solid #c7d2fe', borderRadius: '10px',
  fontSize: '0.9rem', fontWeight: 600,
  textDecoration: 'none',
}
