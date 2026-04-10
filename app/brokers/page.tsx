export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Find a Verified Hangar Broker | Hangar Marketplace',
  description: 'Browse verified aviation real estate brokers on Hangar Marketplace. Filter by state to find a licensed broker near you.',
}

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type BrokerProfile = {
  id: string
  full_name: string
  brokerage: string
  license_state: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  listings: { id: string; status: string }[]
}

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

export default async function BrokersPage({ searchParams }: PageProps) {
  const { q, state } = await searchParams
  const qVal     = (Array.isArray(q)     ? q[0]     : q     ?? '').trim()
  const stateVal = (Array.isArray(state) ? state[0] : state ?? '').trim().toUpperCase()

  // Fetch all broker profiles with their listings (for active count)
  let query = supabase
    .from('broker_profiles')
    .select('id, full_name, brokerage, license_state, avatar_url, bio, created_at, listings(id, status)')
    .order('created_at', { ascending: false })

  if (stateVal) {
    query = query.eq('license_state', stateVal)
  }

  const { data } = await query
  let brokers = (data ?? []) as BrokerProfile[]

  // Text filter client-side (name or brokerage)
  if (qVal) {
    const lower = qVal.toLowerCase()
    brokers = brokers.filter(b =>
      b.full_name.toLowerCase().includes(lower) ||
      b.brokerage.toLowerCase().includes(lower)
    )
  }

  const totalCount = brokers.length

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.75rem' }}>Find a Verified Broker</h1>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
          Every broker listed here has been verified by Hangar Marketplace. Filter by state
          to find a licensed aviation real estate broker near you.
        </p>
      </div>

      {/* Search + filter bar */}
      <form method="GET" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <input
          name="q"
          defaultValue={qVal}
          placeholder="Search by name or brokerage…"
          style={{
            flex: '1 1 240px', padding: '0.6rem 0.9rem',
            border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '0.9rem', backgroundColor: 'white',
            outline: 'none',
          }}
        />
        <select
          name="state"
          defaultValue={stateVal}
          style={{
            padding: '0.6rem 0.9rem', border: '1px solid #d1d5db',
            borderRadius: '8px', fontSize: '0.9rem',
            backgroundColor: 'white', color: stateVal ? '#111827' : '#6b7280',
            minWidth: '160px',
          }}
        >
          <option value="">All states</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{
            padding: '0.6rem 1.25rem', backgroundColor: '#111827',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
          }}
        >
          Search
        </button>
        {(qVal || stateVal) && (
          <a href="/brokers" style={{
            padding: '0.6rem 1rem', color: '#6b7280',
            border: '1px solid #e5e7eb', borderRadius: '8px',
            fontSize: '0.875rem', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
          }}>
            Clear
          </a>
        )}
      </form>

      {/* Result count */}
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
        {totalCount === 0
          ? 'No verified brokers found.'
          : `${totalCount} verified broker${totalCount !== 1 ? 's' : ''}${stateVal ? ` in ${stateVal}` : ''}`}
      </p>

      {/* Broker grid */}
      {brokers.length === 0 ? (
        <div style={{
          backgroundColor: 'white', border: '1px dashed #d1d5db',
          borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: '700', color: '#111827' }}>
            No brokers found
          </p>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Try a different state or clear the search.
          </p>
          <a href="/brokers" style={{
            display: 'inline-block', padding: '0.55rem 1.25rem',
            backgroundColor: '#111827', color: 'white',
            borderRadius: '6px', textDecoration: 'none',
            fontWeight: '600', fontSize: '0.875rem',
          }}>
            See all brokers
          </a>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: '1.25rem',
        }}>
          {brokers.map(broker => {
            const activeCount = broker.listings.filter(l => l.status === 'approved').length
            return (
              <Link
                key={broker.id}
                href={`/broker/${broker.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="hover-card"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    height: '100%',
                    boxSizing: 'border-box',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {/* Top row: avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      flexShrink: 0, overflow: 'hidden',
                      backgroundColor: '#1a3a5c',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '1.3rem', fontWeight: '700',
                      border: '2px solid #e5e7eb',
                    }}>
                      {broker.avatar_url ? (
                        <img
                          src={broker.avatar_url}
                          alt={broker.full_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        broker.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: '700', fontSize: '0.95rem',
                          color: '#111827', lineHeight: 1.3,
                        }}>
                          {broker.full_name}
                        </span>
                        {/* Verified badge */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                          padding: '0.1rem 0.45rem', borderRadius: '999px',
                          fontSize: '0.62rem', fontWeight: '700',
                          backgroundColor: '#dbeafe', color: '#1e40af',
                          border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
                        }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          Verified
                        </span>
                      </div>
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.3 }}>
                        {broker.brokerage}
                      </p>
                    </div>
                  </div>

                  {/* Bio snippet */}
                  {broker.bio && (
                    <p style={{
                      margin: 0, fontSize: '0.82rem', color: '#4b5563',
                      lineHeight: 1.6, flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {broker.bio}
                    </p>
                  )}

                  {/* Footer: state + listing count */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', paddingTop: '0.75rem',
                    borderTop: '1px solid #f3f4f6',
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.78rem', color: '#6b7280',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Licensed in {broker.license_state}
                    </span>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: '600',
                      color: activeCount > 0 ? '#1e40af' : '#9ca3af',
                    }}>
                      {activeCount > 0
                        ? `${activeCount} active listing${activeCount !== 1 ? 's' : ''}`
                        : 'No active listings'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* CTA for brokers */}
      <div style={{
        marginTop: '3rem', backgroundColor: '#f8fafc',
        border: '1px solid #e5e7eb', borderRadius: '12px',
        padding: '1.75rem 2rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <p style={{ margin: '0 0 0.2rem', fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>
            Are you a licensed aviation real estate broker?
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
            Apply for verification to get your profile listed here and a verified badge on all your listings.
          </p>
        </div>
        <Link href="/apply-broker" style={{
          display: 'inline-block', padding: '0.6rem 1.25rem',
          backgroundColor: '#111827', color: 'white',
          borderRadius: '8px', textDecoration: 'none',
          fontWeight: '700', fontSize: '0.875rem', whiteSpace: 'nowrap',
        }}>
          Apply for verification
        </Link>
      </div>
    </div>
  )
}
