'use client'

/**
 * MarkSoldPanel — small inline pointer on the edit page.
 *
 * The full "Congratulations on the sale" capture lives at
 * /listing/[id]/mark-sold. We keep this panel here because the edit page is
 * where a busy seller is most likely to look for a "this is no longer for
 * sale" toggle. Hides itself once the listing is already in a closed state.
 */

import Link from 'next/link'
import { CheckCircle2, ChevronRight } from 'lucide-react'

type Props = {
  listingId:    string
  listingType:  string
  status:       string
  soldAt?:      string | null
  salePrice?:   number | null
  soldVia?:     string | null
}

export default function MarkSoldPanel(props: Props) {
  const isLease = props.listingType === 'lease' || props.listingType === 'space'
  const verb    = isLease ? 'leased' : 'sold'
  const closed  = ['sold', 'closed'].includes(props.status)

  if (closed) {
    return (
      <section style={cardClosed}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <CheckCircle2 size={20} color="#16a34a" />
          <div>
            <p style={cardTitle}>This listing is marked as {verb}.</p>
            {props.soldAt && (
              <p style={cardHint}>
                Recorded {new Date(props.soldAt).toLocaleDateString()}
                {props.salePrice ? ` · $${props.salePrice.toLocaleString()}` : ''}
                {props.soldVia ? ` · ${props.soldVia.replace(/_/g, ' ')}` : ''}
              </p>
            )}
            <Link href={`/listing/${props.listingId}/mark-sold`} style={viewLink}>
              View sale recap →
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={cardTitle}>Did this property {verb === 'sold' ? 'sell' : 'lease'}?</p>
          <p style={cardHint}>
            Mark it {verb} so it stops showing in active inventory and feeds our quarterly market intelligence reports.
          </p>
        </div>
        <Link href={`/listing/${props.listingId}/mark-sold`} style={primaryBtn}>
          Mark as {verb} <ChevronRight size={16} />
        </Link>
      </div>
    </section>
  )
}

const card: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '1.25rem',
}
const cardClosed: React.CSSProperties = {
  ...card,
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
}
const cardTitle: React.CSSProperties = {
  margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a',
}
const cardHint: React.CSSProperties = {
  margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5,
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
  padding: '0.6rem 1.1rem',
  background: 'linear-gradient(135deg, #15803d, #16a34a)',
  color: 'white', fontWeight: 700, fontSize: '0.88rem',
  borderRadius: '8px', textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
}
const viewLink: React.CSSProperties = {
  display: 'inline-block', marginTop: '0.4rem',
  fontSize: '0.85rem', fontWeight: 600,
  color: '#1d4ed8', textDecoration: 'none',
}
