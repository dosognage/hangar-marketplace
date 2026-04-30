'use client'

/**
 * Broker tour — interactive carousel showing the proprietary features that
 * come with verified broker status. The goal isn't a polished landing-page
 * pitch; it's "here's literally where each tool lives, what data it shows,
 * and why brokers care about it."
 *
 * Each card renders a tiny live-feeling mock of the actual UI so brokers
 * recognise it the first time they hit it for real.
 */

import Link from 'next/link'
import { useState } from 'react'
import {
  BarChart3, Mail, Sparkles, Trophy, Bell,
  ChevronLeft, ChevronRight, Check, TrendingUp, Eye, MessageSquare,
} from 'lucide-react'

type Slide = {
  key:        string
  eyebrow:    string
  title:      string
  body:       string
  icon:       React.ReactNode
  accent:     string                     // gradient end color
  mock:       React.ReactNode
  tryHref:    string
  tryLabel:   string
}

const SLIDES: Slide[] = [
  {
    key:      'analytics',
    eyebrow:  'Per-listing analytics',
    title:    'See exactly which listings are working — and why.',
    body:     'Every listing gets a health score, view trends, inquiry conversion, photo performance, and benchmarks against comparable listings at the same airport. We tell you what to fix, not just what\'s wrong.',
    icon:     <BarChart3 size={24} />,
    accent:   '#1d4ed8',
    mock:     <AnalyticsMock />,
    tryHref:  '/broker/dashboard?tab=analytics',
    tryLabel: 'Open analytics dashboard',
  },
  {
    key:      'newsletter',
    eyebrow:  'Weekly market intelligence',
    title:    'A weekly newsletter your competitors do not get.',
    body:     'Every Monday morning: new airpark sales, FAA news, market shifts, and the deals that closed in your specialty airports. Subscribers-only, no public archive.',
    icon:     <Mail size={24} />,
    accent:   '#0e7490',
    mock:     <NewsletterMock />,
    tryHref:  '/newsletter/sample',
    tryLabel: 'Read this month\'s newsletter',
  },
  {
    key:      'sponsored',
    eyebrow:  'Sponsored placement',
    title:    'Promote your hottest listings to the top of search.',
    body:     'Sponsor a listing and it pins to the top of browse, search results, and the monthly newsletter. Three tiers: $29 for 7 days, $79 for 30 days, $149 for 90 days. One-time charge, no auto-renew.',
    icon:     <Sparkles size={24} />,
    accent:   '#7c3aed',
    mock:     <SponsoredMock />,
    tryHref:  '/sponsor',
    tryLabel: 'See the sponsorship tiers',
  },
  {
    key:      'sold-data',
    eyebrow:  'Sale outcome capture',
    title:    'Mark a listing sold and we close the loop on the market.',
    body:     'When a listing closes, you get a one-page form to record price, days on market, buyer type, and offer dynamics. Your individual data stays private. We publish only anonymised airport-level aggregates.',
    icon:     <Trophy size={24} />,
    accent:   '#16a34a',
    mock:     <SoldMock />,
    tryHref:  '/broker/dashboard',
    tryLabel: 'Mark as sold sits next to Edit on every listing',
  },
  {
    key:      'alerts',
    eyebrow:  'Specialty airport alerts',
    title:    'Get pinged the moment a buyer posts in your airports.',
    body:     'Pilots posting hangar requests within your alert radius of any specialty airport you marked land in your inbox immediately. No scrolling required, no searches to save.',
    icon:     <Bell size={24} />,
    accent:   '#d97706',
    mock:     <AlertsMock />,
    tryHref:  '/broker/dashboard',
    tryLabel: 'Tune alerts in preferences',
  },
]

export default function TourClient() {
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]
  const last  = idx === SLIDES.length - 1
  const first = idx === 0

  return (
    <div>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Go to ${s.eyebrow}`}
            style={{
              width: i === idx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === idx ? slide.accent : '#cbd5e1',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Slide */}
      <div style={{
        background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}cc)`,
        borderRadius: '14px',
        padding: '1.5rem 1.5rem 0.5rem',
        color: 'white',
        boxShadow: '0 12px 32px -10px rgba(15,23,42,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '46px', height: '46px', borderRadius: '11px',
            backgroundColor: 'rgba(255,255,255,0.18)',
            color: '#fbbf24',
          }}>
            {slide.icon}
          </span>
          <p style={{
            margin: 0, fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.85)',
          }}>
            {slide.eyebrow}
          </p>
        </div>
        <h2 style={{
          margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800,
          letterSpacing: '-0.01em', lineHeight: 1.3,
        }}>
          {slide.title}
        </h2>
        <p style={{
          margin: '0 0 1.1rem', fontSize: '0.88rem',
          color: 'rgba(255,255,255,0.92)', lineHeight: 1.55,
        }}>
          {slide.body}
        </p>

        {/* Mock preview floats slightly out of the gradient panel */}
        <div style={{
          marginTop: '1rem',
          marginBottom: '-1rem',                 // extends past the bottom of the gradient
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '1rem 1.1rem',
          boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
          color: '#0f172a',
        }}>
          {slide.mock}
        </div>
      </div>

      {/* Try-it link below the card */}
      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <Link href={slide.tryHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.83rem', fontWeight: 600,
          color: slide.accent, textDecoration: 'none',
          padding: '0.5rem 0.9rem',
          backgroundColor: `${slide.accent}10`,
          border: `1px solid ${slide.accent}30`,
          borderRadius: '8px',
        }}>
          <Eye size={14} /> {slide.tryLabel}
        </Link>
      </div>

      {/* Nav */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <button
          type="button"
          disabled={first}
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          style={navBtn(first)}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          {idx + 1} of {SLIDES.length}
        </span>

        {last ? (
          <Link href="/broker/setup/preferences" style={primaryBtn}>
            Continue to preferences <ChevronRight size={16} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIdx(i => Math.min(SLIDES.length - 1, i + 1))}
            style={primaryBtn}
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>

      <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
        <Link href="/broker/setup/preferences" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
          Skip the tour
        </Link>
        {' · '}You can revisit any of these from your dashboard.
      </p>
    </div>
  )
}

// ── Mocks ─────────────────────────────────────────────────────────────────
// Tiny static UI snippets that mirror the look of the real surfaces.

function AnalyticsMock() {
  return (
    <div>
      <p style={mockEyebrow}>Listing health · KAPA hangar</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.65rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'conic-gradient(#16a34a 0 73%, #e5e7eb 73%)',
          fontSize: '0.95rem', fontWeight: 800, color: '#0f172a',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white',
          }}>73</span>
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Performing well</p>
          <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>+18% vs comparable listings</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
        <Stat icon={<Eye size={13} />}        label="Views"     value="284"  delta="+12%" />
        <Stat icon={<MessageSquare size={13} />} label="Inquiries" value="9"    delta="+3"   />
        <Stat icon={<TrendingUp size={13} />}  label="Conv."    value="3.2%" delta="+0.8" />
      </div>
    </div>
  )
}

function NewsletterMock() {
  return (
    <div>
      <p style={mockEyebrow}>Monday market intelligence · Apr 26</p>
      <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
        Three new airpark sales hit Tennessee
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.4rem' }}>
        <NewsLine code="KMQY" line="Smyrna airpark median up 9% QoQ" />
        <NewsLine code="K81N" line="FAA grant expands ramp capacity 40%" />
        <NewsLine code="KAPA" line="Hangar inventory at 6-month low" />
      </ul>
    </div>
  )
}

function SponsoredMock() {
  return (
    <div>
      <p style={mockEyebrow}>Top of browse · KAPA</p>
      <div style={{
        display: 'flex', gap: '0.65rem', alignItems: 'center',
        padding: '0.65rem',
        border: '1px solid #fde68a', borderRadius: '8px',
        background: 'linear-gradient(90deg, #fffbeb, #ffffff)',
      }}>
        <div style={{
          width: '60px', height: '40px',
          background: 'linear-gradient(135deg, #d1d5db, #9ca3af)',
          borderRadius: '4px',
        }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            Premium hangar with corporate office
          </p>
          <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>$1,250,000 · KAPA</p>
        </div>
        <span style={{
          fontSize: '0.65rem', fontWeight: 700,
          color: '#92400e', background: '#fef3c7',
          padding: '0.15rem 0.4rem', borderRadius: '4px',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Sponsored</span>
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
        From $29 for 7 days. One-time charge, no auto-renew.
      </p>
    </div>
  )
}

function SoldMock() {
  return (
    <div>
      <p style={mockEyebrow}>Closing the loop · sale outcome capture</p>
      <div style={{ display: 'grid', gap: '0.45rem' }}>
        <SoldLine label="Sale price" value="$485,000" />
        <SoldLine label="Days on market" value="42" />
        <SoldLine label="Buyer type" value="Cash buyer" />
        <SoldLine label="Multiple offers" value="Yes (3 total)" />
      </div>
      <p style={{ margin: '0.65rem 0 0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
        <Check size={12} style={{ verticalAlign: '-2px' }} /> Feeds the next quarterly report
      </p>
    </div>
  )
}

function AlertsMock() {
  return (
    <div>
      <p style={mockEyebrow}>New buyer alert · 9 minutes ago</p>
      <div style={{
        padding: '0.65rem 0.85rem',
        borderLeft: '3px solid #d97706',
        background: '#fffbeb',
        borderRadius: '0 8px 8px 0',
      }}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
          Pilot looking for hangar near KAPA
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#78350f' }}>
          Cessna 172, $1,200/mo budget, 25-mile radius. Posted 9 min ago.
        </p>
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
        Land in your inbox before the listing-side noise. Average response time matters.
      </p>
    </div>
  )
}

// ── Mock primitives ───────────────────────────────────────────────────────

function Stat({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  return (
    <div style={{
      padding: '0.5rem 0.65rem', borderRadius: '7px',
      backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    }}>
      <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
        {icon} {label}
      </p>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
        {value} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a' }}>{delta}</span>
      </p>
    </div>
  )
}

function NewsLine({ code, line }: { code: string; line: string }) {
  return (
    <li style={{ display: 'flex', gap: '0.55rem', alignItems: 'baseline', fontSize: '0.82rem' }}>
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem',
        backgroundColor: '#eff6ff', color: '#1d4ed8',
        padding: '0.15rem 0.4rem', borderRadius: '4px',
        fontWeight: 700,
      }}>{code}</span>
      <span style={{ color: '#334155' }}>{line}</span>
    </li>
  )
}

function SoldLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '0.35rem 0',
      borderBottom: '1px dashed #f1f5f9',
      fontSize: '0.82rem',
    }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <strong style={{ color: '#0f172a' }}>{value}</strong>
    </div>
  )
}

const mockEyebrow: React.CSSProperties = {
  margin: '0 0 0.6rem', fontSize: '0.65rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b',
}
function navBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.55rem 1rem',
    backgroundColor: 'white',
    color: disabled ? '#cbd5e1' : '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.85rem', fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
  padding: '0.6rem 1.2rem',
  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  color: 'white', fontWeight: 700, fontSize: '0.85rem',
  border: 'none', borderRadius: '8px',
  cursor: 'pointer',
  textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
}
