'use client'

/**
 * Post-signup welcome tour for non-broker users.
 *
 * Five-card carousel covering: home airport + browse, aircraft fit,
 * save listings + saved-search alerts, posting buyer requests, and
 * listing your own property. Each card has a real deep link so the user
 * can jump straight to the feature if they want, plus a tiny mock that
 * mirrors the actual UI they'll see.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plane, MapPin, Heart, Bell, Search, FileText, MessageSquare,
  ChevronLeft, ChevronRight, Check, Eye,
} from 'lucide-react'
import { markWelcomeSeen } from './actions'

type Slide = {
  key:        string
  eyebrow:    string
  title:      string
  body:       string
  icon:       React.ReactNode
  accent:     string
  mock:       React.ReactNode
  tryHref:    string
  tryLabel:   string
}

type Props = {
  firstName:       string
  hasHomeAirport:  boolean
  hasAircraft:     boolean
}

export default function WelcomeTourClient(props: Props) {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const SLIDES: Slide[] = [
    {
      key:      'browse',
      eyebrow:  'Step 1 · Find your home airport',
      title:    'Set your home airport, see what\'s flying nearby.',
      body:     'Type your home airport once and we anchor every search to it. Browse hangars, airport homes, fly-in communities, and land all listed by airport code, distance, and price.',
      icon:     <MapPin size={24} />,
      accent:   '#1d4ed8',
      mock:     <BrowseMock />,
      tryHref:  '/browse',
      tryLabel: 'Open browse',
    },
    {
      key:      'aircraft-fit',
      eyebrow:  'Step 2 · Tell us what you fly',
      title:    'We filter listings to ones that physically fit your plane.',
      body:     'Pick from 150+ aircraft (or enter your own dimensions). We compare wingspan, length, and tail height against every hangar listing so you only see ones that work.',
      icon:     <Plane size={24} />,
      accent:   '#0e7490',
      mock:     <AircraftFitMock />,
      tryHref:  '/settings#aircraft',
      tryLabel: 'Set my default aircraft',
    },
    {
      key:      'save-and-alert',
      eyebrow:  'Step 3 · Save what you like',
      title:    'Save listings and get pinged when new matches hit.',
      body:     'Heart any listing to keep it in your saved list. Set up a saved search and we\'ll email you the moment a new listing matches your criteria — no scrolling required.',
      icon:     <Heart size={24} />,
      accent:   '#dc2626',
      mock:     <SavedMock />,
      tryHref:  '/saved',
      tryLabel: 'See your saved list',
    },
    {
      key:      'buyer-request',
      eyebrow:  'Step 4 · Tell brokers what you need',
      title:    'Post a request, brokers come to you.',
      body:     'Don\'t see what you want listed? Post a buyer request — your aircraft, budget, target airports — and verified brokers in those areas get notified instantly. They reach out to you, not the other way around.',
      icon:     <MessageSquare size={24} />,
      accent:   '#7c3aed',
      mock:     <RequestMock />,
      tryHref:  '/requests/new',
      tryLabel: 'Post a buyer request',
    },
    {
      key:      'sell',
      eyebrow:  'Step 5 · Selling? List it yourself.',
      title:    'You can list your own hangar, home, or land.',
      body:     'Hit the Submit Listing button anywhere on the site. Fill in the details, add photos, set a price. Free trial through June 19; after that, posting is a one-time fee per listing.',
      icon:     <FileText size={24} />,
      accent:   '#16a34a',
      mock:     <SellMock />,
      tryHref:  '/submit',
      tryLabel: 'Start a listing',
    },
  ]

  const slide = SLIDES[idx]
  const last  = idx === SLIDES.length - 1
  const first = idx === 0

  async function finishTour(target: string = '/dashboard') {
    setFinishing(true)
    try {
      await markWelcomeSeen()
    } finally {
      router.push(target)
    }
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={hero}>
        <div style={heroIcon}>
          <Plane size={28} strokeWidth={1.75} />
        </div>
        <p style={heroEyebrow}>Welcome aboard</p>
        <h1 style={heroTitle}>
          Hangar Marketplace works best when you set it up, {props.firstName}.
        </h1>
        <p style={heroSub}>
          Five quick cards to show you the proprietary tools you just unlocked. Skim through —
          you can jump to anything from your dashboard later.
        </p>
      </div>

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
          marginBottom: '-1rem',
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
          <button
            type="button"
            onClick={() => finishTour('/dashboard')}
            disabled={finishing}
            style={primaryBtn(finishing)}
          >
            {finishing ? 'Saving…' : 'Take me to my dashboard'} <ChevronRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIdx(i => Math.min(SLIDES.length - 1, i + 1))}
            style={primaryBtn(false)}
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>

      <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => finishTour('/dashboard')}
          disabled={finishing}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: '#94a3b8', textDecoration: 'underline',
            cursor: finishing ? 'not-allowed' : 'pointer',
            fontSize: '0.78rem',
          }}
        >
          Skip the tour
        </button>
        {' · '}You can revisit it from your account menu later.
      </p>
    </>
  )
}

// ── Mocks ─────────────────────────────────────────────────────────────────

function BrowseMock() {
  return (
    <div>
      <p style={mockEyebrow}>Browse · sorted by distance from KAPA</p>
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <BrowseRow code="KAPA" title="Heated 60×60 hangar with corporate office" miles="0 mi"  price="$1,250,000" />
        <BrowseRow code="KBJC" title="Box hangar — cold storage" miles="22 mi" price="$425,000" />
        <BrowseRow code="KCFO" title="50×50 with apartment + bath" miles="38 mi" price="$695,000" />
      </div>
    </div>
  )
}

function AircraftFitMock() {
  return (
    <div>
      <p style={mockEyebrow}>Filter · only listings that fit my Cessna 172</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
        <FitChip label="Wingspan 36'1&quot;"  ok />
        <FitChip label="Length 27'2&quot;"    ok />
        <FitChip label="Tail height 8'11&quot;" ok />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.55rem 0.7rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px' }}>
        <Check size={16} color="#16a34a" />
        <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
          18 of 23 listings near you fit this plane
        </span>
      </div>
    </div>
  )
}

function SavedMock() {
  return (
    <div>
      <p style={mockEyebrow}>Saved listings + alerts</p>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <SavedRow title="Heated hangar at KAPA" subtitle="$1,250,000" />
        <SavedRow title="Fly-in lot at K81F"     subtitle="$185,000" />
      </div>
      <div style={{
        marginTop: '0.75rem', padding: '0.55rem 0.7rem',
        backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '7px',
        display: 'flex', gap: '0.5rem', alignItems: 'center',
      }}>
        <Bell size={14} color="#d97706" />
        <span style={{ fontSize: '0.78rem', color: '#92400e' }}>
          Saved search: <strong>KAPA hangars under $1.5M</strong> · 2 new this week
        </span>
      </div>
    </div>
  )
}

function RequestMock() {
  return (
    <div>
      <p style={mockEyebrow}>Your buyer request — broker matches</p>
      <div style={{ padding: '0.7rem 0.9rem', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#581c87' }}>
          Looking for a 50×50 hangar near KAPA
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#7c3aed' }}>
          Budget: $800K · Cessna 172 · Posted 3h ago
        </p>
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
        <strong style={{ color: '#16a34a' }}>2 brokers</strong> in your area got the alert. Replies usually arrive within 24 hours.
      </p>
    </div>
  )
}

function SellMock() {
  return (
    <div>
      <p style={mockEyebrow}>Submit listing · 5 minute form</p>
      <div style={{ display: 'grid', gap: '0.4rem' }}>
        <SellLine label="Type"          value="Hangar" />
        <SellLine label="Airport"       value="KAPA · Centennial" />
        <SellLine label="Asking"        value="$485,000" />
        <SellLine label="Photos"        value="3 uploaded" />
      </div>
      <p style={{ margin: '0.65rem 0 0', fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
        <Check size={12} style={{ verticalAlign: '-2px' }} /> Free during the launch trial · live within minutes
      </p>
    </div>
  )
}

// ── Mock primitives ───────────────────────────────────────────────────────

function BrowseRow({ code, title, miles, price }: { code: string; title: string; miles: string; price: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '0.6rem',
      alignItems: 'center', padding: '0.5rem 0',
      borderBottom: '1px dashed #f1f5f9',
    }}>
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem',
        backgroundColor: '#eff6ff', color: '#1d4ed8',
        padding: '0.2rem 0.4rem', borderRadius: '4px',
        fontWeight: 700, textAlign: 'center',
      }}>{code}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>{miles} from home</p>
      </div>
      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{price}</span>
    </div>
  )
}
function FitChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.3rem 0.65rem', borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600,
      backgroundColor: ok ? '#f0fdf4' : '#fee2e2',
      color: ok ? '#166534' : '#991b1b',
      border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {ok ? <Check size={11} /> : null} {label}
    </span>
  )
}
function SavedRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.5rem 0.65rem',
      backgroundColor: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: '7px',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>{subtitle}</p>
      </div>
      <Heart size={14} color="#dc2626" fill="#dc2626" />
    </div>
  )
}
function SellLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '0.3rem 0',
      borderBottom: '1px dashed #f1f5f9',
      fontSize: '0.82rem',
    }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <strong style={{ color: '#0f172a' }}>{value}</strong>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const hero: React.CSSProperties = {
  padding: '2rem 1.5rem 1.75rem',
  marginBottom: '1.5rem',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 70%, #1d4ed8 100%)',
  borderRadius: '16px',
  color: 'white',
  textAlign: 'center',
  boxShadow: '0 10px 40px -12px rgba(15,23,42,0.5)',
}
const heroIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '54px', height: '54px', borderRadius: '14px',
  backgroundColor: 'rgba(255,255,255,0.18)',
  marginBottom: '0.85rem',
  color: '#fbbf24',
}
const heroEyebrow: React.CSSProperties = {
  margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.14em',
  color: '#bfdbfe',
}
const heroTitle: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800,
  letterSpacing: '-0.02em', lineHeight: 1.3,
}
const heroSub: React.CSSProperties = {
  margin: '0 auto', maxWidth: '540px',
  fontSize: '0.9rem', color: '#dbeafe', lineHeight: 1.55,
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
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.6rem 1.2rem',
    background: disabled ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
    color: 'white', fontWeight: 700, fontSize: '0.85rem',
    border: 'none', borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(29,78,216,0.25)',
  }
}
