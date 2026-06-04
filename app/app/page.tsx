/**
 * /app — Mobile app landing page
 *
 * A dedicated page for direct linking from marketing emails, social posts,
 * and the eventual App Store / Play Store badges. Today it captures emails
 * for the pre-launch waitlist; once iOS + Android ship, the placeholder
 * "coming soon" block can be swapped for real store badges with no
 * page-level restructure.
 *
 * The email form posts to the same `subscribePreLaunch` server action as
 * the home-page strip.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Smartphone, Calendar, ListChecks, MessageCircle, BellRing } from 'lucide-react'
import PreLaunchSignup from '@/app/components/PreLaunchSignup'

export const metadata: Metadata = {
  title: 'Hangar Marketplace Mobile App — Coming Soon',
  description:
    'Native iOS and Android apps for Hangar Marketplace are coming soon. Drop your email to be notified when they launch.',
  alternates: {
    canonical: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com') + '/app',
  },
  openGraph: {
    title: 'Hangar Marketplace Mobile App — Coming Soon',
    description:
      'Native iOS and Android apps for Hangar Marketplace are on the way.',
    type: 'website',
  },
  // No false urgency — explicitly mark this as a placeholder/coming-soon
  // page so we don't get indexed as if the apps are already live.
  robots: { index: true, follow: true },
}

export default function AppLandingPage() {
  return (
    <div style={{ paddingBottom: '4rem' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '3rem 0 2.5rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          fontSize: '0.72rem',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '0.3rem 0.85rem',
          borderRadius: '9999px',
          marginBottom: '1rem',
        }}>
          <Smartphone size={12} />
          iOS &amp; Android — coming soon
        </span>
        <h1 style={{
          margin: '0 0 0.85rem',
          fontSize: '2.15rem',
          fontWeight: '800',
          color: '#111827',
          lineHeight: 1.15,
          letterSpacing: '-0.015em',
        }}>
          Hangar Marketplace, on the go
        </h1>
        <p style={{
          margin: '0 auto',
          maxWidth: '560px',
          fontSize: '1.05rem',
          color: '#4b5563',
          lineHeight: 1.65,
        }}>
          We&apos;re building native mobile apps so you can browse hangars,
          message hosts, and manage your listings from anywhere — at the
          FBO, on the ramp, or mid-flight planning. They&apos;re not live
          yet, but they will be soon.
        </p>
      </section>

      {/* ── Email capture / coming-soon card ──────────────────────────────── */}
      <section
        aria-labelledby="app-notify-title"
        style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '14px',
          padding: '2rem 2.25rem',
          marginBottom: '3rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: '1.5rem',
        }}>
          <div>
            <h2
              id="app-notify-title"
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
              }}
            >
              Be first to know when the apps launch
            </h2>
            <p style={{ margin: '0 0 1.25rem', color: '#6b7280', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Drop your email below. When the iOS and Android apps go live in
              the App Store and Google Play, we&apos;ll send you a single
              email with download links. That&apos;s it — no other
              messaging, no list-sharing.
            </p>

            <PreLaunchSignup source="web-app-page" variant="prominent" />
          </div>

          {/* App Store / Play Store badge placeholders — visible scaffolding
              for future asset drop-in. Today they communicate "coming soon"
              visually; on launch day they become real <a> + <Image> links. */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '0.5rem',
          }}>
            <BadgePlaceholder
              store="App Store"
              caption="iOS · coming soon"
            />
            <BadgePlaceholder
              store="Google Play"
              caption="Android · coming soon"
            />
          </div>
        </div>
      </section>

      {/* ── What the app does ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{
          margin: '0 0 1.25rem',
          fontSize: '1.15rem',
          fontWeight: '700',
          color: '#111827',
        }}>
          What you&apos;ll be able to do
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}>
          <FeatureCard
            icon={<Calendar size={22} />}
            title="Book on the go"
            body="Find and reserve transient hangar space from your phone — at the FBO, in the run-up, or after a divert."
          />
          <FeatureCard
            icon={<ListChecks size={22} />}
            title="Manage listings from your phone"
            body="Update availability, prices, and photos for the hangars you list — without needing to open a laptop."
          />
          <FeatureCard
            icon={<MessageCircle size={22} />}
            title="Message hosts directly"
            body="Reach hangar owners and brokers in-app, with the same inbox you use on the web."
          />
          <FeatureCard
            icon={<BellRing size={22} />}
            title="Push notifications"
            body="Get a buzz the moment a booking is confirmed, a new message lands, or a saved-search match goes live."
          />
        </div>
      </section>

      {/* ── Honest "what's actually shipping" note ───────────────────────── */}
      <section style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        marginBottom: '3rem',
        fontSize: '0.875rem',
        color: '#4b5563',
        lineHeight: 1.65,
      }}>
        <strong style={{ color: '#111827' }}>A note on timing.</strong>{' '}
        We don&apos;t share specific launch dates because mobile app review
        timelines are unpredictable — and we&apos;d rather ship something
        solid than ship a date. Sign up above and you&apos;ll hear from us
        the moment the apps are actually downloadable.
      </section>

      {/* ── CTA back to the web app ───────────────────────────────────────── */}
      <section style={{
        textAlign: 'center',
        padding: '2.5rem',
        backgroundColor: '#1a3a5c',
        borderRadius: '12px',
        color: 'white',
      }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: '700' }}>
          In the meantime, the full site works great on mobile
        </h2>
        <p style={{
          margin: '0 0 1.5rem',
          color: '#93c5fd',
          fontSize: '0.9rem',
          maxWidth: '480px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6,
        }}>
          Browse hangars, message brokers, and manage your listings right from
          your phone&apos;s browser — same data, no install required.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            padding: '0.7rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: '700',
          }}>
            Browse hangars →
          </Link>
          <Link href="/submit" style={{
            padding: '0.7rem 1.5rem',
            backgroundColor: 'rgba(255,255,255,0.12)',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: '600',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            List a property
          </Link>
        </div>
      </section>

    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FeatureCard({
  icon, title, body,
}: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      padding: '1.25rem',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '8px',
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        marginBottom: '0.75rem',
      }}>
        {icon}
      </div>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', fontWeight: '700', color: '#111827' }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.55 }}>
        {body}
      </p>
    </div>
  )
}

/**
 * Placeholder for an App Store / Play Store download badge.
 * Once we have the real badge assets + live store URLs, swap this for
 * a real <a><Image /></a> pair. The dimensions / layout below are
 * already sized to a standard "Get it on the App Store" badge so the
 * swap is purely a visual/asset change.
 */
function BadgePlaceholder({ store, caption }: { store: string; caption: string }) {
  return (
    <div
      aria-label={`${store}: coming soon`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: '160px',
        padding: '0.7rem 1rem',
        backgroundColor: '#111827',
        borderRadius: '8px',
        color: 'white',
        opacity: 0.55,
        cursor: 'not-allowed',
      }}
    >
      <span style={{
        fontSize: '0.65rem',
        color: '#9ca3af',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontWeight: '600',
      }}>
        {caption}
      </span>
      <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>{store}</span>
    </div>
  )
}
