import Link from 'next/link'
import { Sparkles, TrendingUp, Mail, Crown, Check } from 'lucide-react'
import { SPONSOR_TIERS } from '@/lib/stripe'

export const metadata = {
  title: 'Sponsored placement | Hangar Marketplace',
  description: 'Pin your hangar listing to the top of search and the monthly newsletter.',
}

export default function SponsorPricingPage() {
  // Order tiers shortest to longest, mark the middle one as the recommended pick.
  const tiers = [...SPONSOR_TIERS].sort((a, b) => a.days - b.days)
  const recommendedDays = 30

  return (
    <main style={page}>
      {/* Hero */}
      <section style={hero}>
        <div style={heroIcon}>
          <Sparkles size={26} strokeWidth={1.75} />
        </div>
        <p style={heroEyebrow}>Sponsored placement</p>
        <h1 style={heroTitle}>Pin your hottest listing to the top.</h1>
        <p style={heroSub}>
          Sponsored listings appear above organic results on browse, search, and the monthly market
          intelligence newsletter. No long-term commitment. Cancel any time through your customer portal.
        </p>
      </section>

      {/* Tiers */}
      <section style={tiersWrap}>
        {tiers.map(t => {
          const recommended = t.days === recommendedDays
          return (
            <article key={t.days} style={recommended ? tierCardHero : tierCard}>
              {recommended && <span style={badge}>Most popular</span>}
              <p style={tierEyebrow}>{t.days === 7 ? 'Quick boost' : t.days === 30 ? 'Standard run' : 'Long campaign'}</p>
              <p style={tierPrice}>{t.price}</p>
              <p style={tierDays}>for {t.label}</p>
              <p style={tierMath}>
                ${(t.cents / 100 / t.days).toFixed(2)} per day
              </p>
              <ul style={featureList}>
                <Feature>Top of browse + search results</Feature>
                <Feature>Highlighted in monthly newsletter</Feature>
                <Feature>“Sponsored” badge in your area</Feature>
                {t.days >= 30 && <Feature>Verified-broker badge bumps trust</Feature>}
                {t.days === 90 && <Feature>Best for harder-to-move listings</Feature>}
              </ul>
              <p style={tierFootnote}>
                Charged once via Stripe. Stops automatically when the term ends — no auto-renew.
              </p>
            </article>
          )
        })}
      </section>

      {/* What you actually get */}
      <section style={benefits}>
        <h2 style={h2}>What sponsorship actually does</h2>
        <div style={benefitGrid}>
          <Benefit icon={<TrendingUp size={20} color="#1d4ed8" />} title="Top of search results">
            Sponsored listings sort above organic results in browse, search, and your area pages. The badge
            stays subtle so it still looks like a real listing.
          </Benefit>
          <Benefit icon={<Mail size={20} color="#1d4ed8" />} title="Monthly newsletter spotlight">
            Every Monday morning the newsletter goes to verified brokers and subscribed pilots. Sponsored
            listings are pinned at the top of the listings section.
          </Benefit>
          <Benefit icon={<Crown size={20} color="#1d4ed8" />} title="Verified-broker badge">
            Combined with your verified broker status, sponsored listings get a visual treatment that
            signals to buyers this is a real, vetted property from a real broker.
          </Benefit>
        </div>
      </section>

      {/* CTA */}
      <section style={cta}>
        <h2 style={{ ...h2, color: 'white', textAlign: 'center' }}>Ready to sponsor?</h2>
        <p style={{ margin: '0.5rem auto 1.5rem', maxWidth: '500px', textAlign: 'center', color: '#dbeafe', fontSize: '0.92rem', lineHeight: 1.6 }}>
          Sponsorship is set on individual listings. Open any listing you own and look for the
          sponsorship picker — pick a duration, run through Stripe checkout, and you&apos;re live within minutes.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/broker/dashboard" style={primaryBtn}>Go to my listings →</Link>
          <Link href="/" style={secondaryBtn}>Back to home</Link>
        </div>
      </section>
    </main>
  )
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.86rem', color: '#334155', padding: '0.3rem 0' }}>
      <Check size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
      <span>{children}</span>
    </li>
  )
}

function Benefit({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={benefitCard}>
      <span style={benefitIcon}>{icon}</span>
      <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>{children}</p>
    </div>
  )
}

const page: React.CSSProperties = { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }
const hero: React.CSSProperties = {
  textAlign: 'center', padding: '2.25rem 1rem 1.5rem',
}
const heroIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '54px', height: '54px', borderRadius: '14px',
  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  color: 'white', marginBottom: '1rem',
  boxShadow: '0 10px 24px rgba(124,58,237,0.3)',
}
const heroEyebrow: React.CSSProperties = {
  margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700,
  color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.12em',
}
const heroTitle: React.CSSProperties = {
  margin: '0 0 0.75rem', fontSize: '1.85rem', fontWeight: 800,
  letterSpacing: '-0.02em', color: '#0f172a',
}
const heroSub: React.CSSProperties = {
  margin: '0 auto', maxWidth: '600px',
  fontSize: '0.95rem', color: '#475569', lineHeight: 1.65,
}

const tiersWrap: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1rem', margin: '2rem 0',
}
const tierCard: React.CSSProperties = {
  position: 'relative',
  backgroundColor: 'white', border: '1px solid #e5e7eb',
  borderRadius: '14px', padding: '1.5rem 1.4rem',
  display: 'flex', flexDirection: 'column', gap: '0.4rem',
}
const tierCardHero: React.CSSProperties = {
  ...tierCard,
  border: '2px solid #1d4ed8',
  boxShadow: '0 12px 32px -10px rgba(29,78,216,0.3)',
  transform: 'scale(1.02)',
}
const badge: React.CSSProperties = {
  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
  padding: '0.25rem 0.75rem', backgroundColor: '#1d4ed8', color: 'white',
  fontSize: '0.7rem', fontWeight: 700, borderRadius: '999px',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}
const tierEyebrow: React.CSSProperties = {
  margin: 0, fontSize: '0.7rem', fontWeight: 700,
  color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em',
}
const tierPrice: React.CSSProperties = {
  margin: '0.25rem 0 0', fontSize: '2.2rem', fontWeight: 800,
  color: '#0f172a', letterSpacing: '-0.03em',
}
const tierDays: React.CSSProperties = {
  margin: 0, fontSize: '0.9rem', color: '#475569', fontWeight: 600,
}
const tierMath: React.CSSProperties = {
  margin: '0.25rem 0 0.85rem', fontSize: '0.78rem', color: '#94a3b8',
}
const featureList: React.CSSProperties = {
  margin: 0, padding: 0, listStyle: 'none',
  borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem',
}
const tierFootnote: React.CSSProperties = {
  margin: '0.85rem 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5,
}

const benefits: React.CSSProperties = {
  marginTop: '2.5rem', padding: '1.5rem 1.25rem',
  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: '14px',
}
const h2: React.CSSProperties = {
  margin: 0, fontSize: '1.25rem', fontWeight: 800,
  color: '#0f172a', letterSpacing: '-0.01em',
}
const benefitGrid: React.CSSProperties = {
  marginTop: '1.25rem',
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem',
}
const benefitCard: React.CSSProperties = {
  backgroundColor: 'white', border: '1px solid #e5e7eb',
  borderRadius: '10px', padding: '1.1rem 1.2rem',
}
const benefitIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '38px', height: '38px', borderRadius: '9px',
  backgroundColor: '#eff6ff', border: '1px solid #dbeafe',
  marginBottom: '0.65rem',
}
const cta: React.CSSProperties = {
  marginTop: '2.5rem', padding: '2.25rem 1.5rem',
  background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
  borderRadius: '16px',
}
const primaryBtn: React.CSSProperties = {
  display: 'inline-block', padding: '0.8rem 1.6rem',
  backgroundColor: 'white', color: '#1d4ed8',
  fontWeight: 700, fontSize: '0.92rem',
  borderRadius: '10px', textDecoration: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
}
const secondaryBtn: React.CSSProperties = {
  display: 'inline-block', padding: '0.8rem 1.6rem',
  backgroundColor: 'transparent', color: 'white',
  fontWeight: 600, fontSize: '0.92rem',
  border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: '10px', textDecoration: 'none',
}
