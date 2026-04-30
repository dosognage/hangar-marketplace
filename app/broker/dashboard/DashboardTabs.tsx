'use client'

/**
 * DashboardTabs — segmented pill toggle between "Listings" and "Analytics".
 *
 * Tab state lives in the URL (?tab=listings | analytics) so that:
 *   1. Browser back/forward preserves which tab the broker was on
 *   2. Coming back from a listing detail page can land on the right tab
 *      (the listing detail's back-link reads ?tab from the original href)
 *   3. The page can be deep-linked / bookmarked into a specific view
 */

import Link from 'next/link'

type Props = {
  activeTab: 'listings' | 'analytics'
  listingsCount: number
}

export default function DashboardTabs({ activeTab, listingsCount }: Props) {
  return (
    <div style={{
      display: 'inline-flex',
      backgroundColor: '#f3f4f6',
      borderRadius: '10px',
      padding: '4px',
      gap: '4px',
      marginBottom: '1.25rem',
    }}>
      <TabPill
        href="/broker/dashboard?tab=listings"
        active={activeTab === 'listings'}
        label="Your Listings"
        count={listingsCount}
      />
      <TabPill
        href="/broker/dashboard?tab=analytics"
        active={activeTab === 'analytics'}
        label="Analytics"
      />
    </div>
  )
}

function TabPill({ href, active, label, count }: {
  href: string; active: boolean; label: string; count?: number
}) {
  return (
    <Link
      href={href}
      // Default scrolling-to-top behaviour can feel jumpy when toggling tabs
      // — these views live in the same scroll position. Disable scroll reset.
      scroll={false}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1.1rem',
        borderRadius: '8px',
        backgroundColor: active ? 'white' : 'transparent',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
        color: active ? '#0f172a' : '#64748b',
        fontWeight: active ? 700 : 500,
        fontSize: '0.875rem',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
      {typeof count === 'number' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: '20px', height: '20px',
          padding: '0 0.4rem',
          borderRadius: '999px',
          backgroundColor: active ? '#1d4ed8' : '#cbd5e1',
          color: 'white',
          fontSize: '0.7rem', fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </Link>
  )
}
