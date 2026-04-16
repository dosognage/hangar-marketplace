import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  id:          string
  number:      number
  title:       string
  description: string
  tip:         string
  isComplete:  boolean
  href:        string
  actionLabel: string
}

function buildSteps(profile: Record<string, unknown>, listingCount: number): Step[] {
  const airports = (profile.specialty_airports as string[] | null) ?? []
  const bio      = (profile.bio as string | null) ?? ''
  const radius   = (profile.alert_radius_miles as number | null) ?? 0

  return [
    {
      id:          'photo',
      number:      1,
      title:       'Upload a profile photo',
      description: 'A real headshot builds trust with buyers instantly. Profiles with photos get significantly more contact requests.',
      tip:         'Use a clear, professional photo. No logos or group shots.',
      isComplete:  !!(profile.avatar_url),
      href:        '/broker/dashboard',
      actionLabel: 'Upload photo',
    },
    {
      id:          'basics',
      number:      2,
      title:       'Add your company & contact info',
      description: 'Fill in your brokerage name, phone number, and contact email so buyers know exactly who to reach.',
      tip:         'Use a direct phone number — buyers prefer calling over emailing for showings.',
      isComplete:  !!(profile.brokerage && profile.phone && profile.contact_email),
      href:        '/broker/dashboard',
      actionLabel: 'Edit profile',
    },
    {
      id:          'bio',
      number:      3,
      title:       'Write your broker bio',
      description: "Tell pilots about your background, experience, and what makes you the right person to help them find or sell aviation property.",
      tip:         'Mention any aviation credentials, years of experience, or notable airports you work at. Pilots relate to pilots.',
      isComplete:  bio.trim().length > 10,
      href:        '/broker/dashboard',
      actionLabel: 'Write bio',
    },
    {
      id:          'airports',
      number:      4,
      title:       'Add your specialty airports',
      description: 'Enter the ICAO codes for the airports in your primary market. This powers your radius-based alerts and shows buyers your coverage area.',
      tip:         'Add up to 10 airports. Use ICAO codes (e.g. KBFI, KPAE, KSEA). Your listings and alerts are tied to these.',
      isComplete:  airports.length > 0,
      href:        '/broker/dashboard',
      actionLabel: 'Add airports',
    },
    {
      id:          'notifications',
      number:      5,
      title:       'Set your notification radius',
      description: "Choose how far out you want to be alerted when a pilot posts a hangar request. You'll get an email and a notification bell ping for every match.",
      tip:         'Start with 100 miles and adjust from there. You can always narrow it down once you see the volume.',
      isComplete:  radius > 0,
      href:        '/broker/dashboard',
      actionLabel: 'Set radius',
    },
    {
      id:          'listing',
      number:      6,
      title:       'Create your first listing',
      description: 'Post a hangar, airpark home, or aviation property. Listings go live immediately — no waiting for approval.',
      tip:         'Add at least 5 photos. Listings with more photos get 3× more views.',
      isComplete:  listingCount > 0,
      href:        '/submit',
      actionLabel: 'Create listing',
    },
  ]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BrokerSetupPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isBroker = user.user_metadata?.is_broker === true
  if (!isBroker) redirect('/broker/dashboard')

  const brokerProfileId = user.user_metadata?.broker_profile_id as string | undefined
  if (!brokerProfileId) redirect('/broker/dashboard')

  const { data: profile } = await supabaseAdmin
    .from('broker_profiles')
    .select('*')
    .eq('id', brokerProfileId)
    .single()

  if (!profile) redirect('/broker/dashboard')

  const { count: listingCount } = await supabaseAdmin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('broker_profile_id', brokerProfileId)

  const steps = buildSteps(profile as Record<string, unknown>, listingCount ?? 0)
  const completedCount = steps.filter(s => s.isComplete).length
  const totalCount     = steps.length
  const progressPct    = Math.round((completedCount / totalCount) * 100)
  const allDone        = completedCount === totalCount

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1e40af 100%)',
        padding: '2.5rem 2rem 3.5rem',
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <Link href="/broker/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            color: '#93c5fd', fontSize: '0.8rem', textDecoration: 'none',
            marginBottom: '1.25rem',
          }}>
            ← Back to dashboard
          </Link>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', fontWeight: '700', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Broker Setup
          </p>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em' }}>
            {allDone ? 'Your profile is complete 🎉' : `${completedCount} of ${totalCount} steps complete`}
          </h1>
          <p style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', color: '#bfdbfe' }}>
            {allDone
              ? 'Everything is set up. Buyers can find you and you\'ll be notified of matching requests.'
              : 'Complete these steps to get the most out of your Hangar Marketplace broker profile.'}
          </p>

          {/* Progress bar */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: allDone ? '#34d399' : '#60a5fa',
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#93c5fd' }}>
            {progressPct}% complete
          </p>
        </div>
      </div>

      {/* ── Steps ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '760px', margin: '-1.25rem auto 3rem', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {steps.map((step, i) => {
            const isNext = !step.isComplete && steps.slice(0, i).every(s => s.isComplete)
            return (
              <StepCard key={step.id} step={step} isNext={isNext} />
            )
          })}
        </div>

        {/* Footer CTA */}
        {allDone && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: '700', color: '#166534' }}>
              You\'re all set up!
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#166534' }}>
              Your profile is live and you\'ll be notified when pilots post requests in your area.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/broker/${brokerProfileId}`} style={{
                padding: '0.55rem 1.25rem',
                backgroundColor: '#166534',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '7px',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}>
                View public profile →
              </Link>
              <Link href="/submit" style={{
                padding: '0.55rem 1.25rem',
                backgroundColor: 'white',
                color: '#166534',
                border: '1px solid #bbf7d0',
                textDecoration: 'none',
                borderRadius: '7px',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}>
                + New listing
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step card component ──────────────────────────────────────────────────────

function StepCard({ step, isNext }: { step: Step; isNext: boolean }) {
  const { isComplete } = step

  return (
    <div style={{
      backgroundColor: 'white',
      border: isNext
        ? '2px solid #3b82f6'
        : isComplete
          ? '1px solid #d1fae5'
          : '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      boxShadow: isNext ? '0 4px 16px rgba(59,130,246,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Completion stripe */}
      {isComplete && (
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: '4px',
          backgroundColor: '#34d399',
          borderRadius: '12px 0 0 12px',
        }} />
      )}

      {/* Step number / check */}
      <div style={{
        flexShrink: 0,
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isComplete ? '#d1fae5' : isNext ? '#eff6ff' : '#f3f4f6',
        border: isComplete
          ? '2px solid #34d399'
          : isNext
            ? '2px solid #3b82f6'
            : '2px solid #e5e7eb',
        fontSize: '0.875rem',
        fontWeight: '700',
        color: isComplete ? '#065f46' : isNext ? '#1d4ed8' : '#9ca3af',
      }}>
        {isComplete ? '✓' : step.number}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: '700', color: isComplete ? '#6b7280' : '#111827' }}>
            {step.title}
          </p>
          {isNext && (
            <span style={{
              fontSize: '0.65rem', fontWeight: '700', color: '#1d4ed8',
              backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
              padding: '1px 7px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Up next
            </span>
          )}
          {isComplete && (
            <span style={{
              fontSize: '0.65rem', fontWeight: '700', color: '#065f46',
              backgroundColor: '#d1fae5', border: '1px solid #a7f3d0',
              padding: '1px 7px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Complete
            </span>
          )}
        </div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: isComplete ? '#9ca3af' : '#6b7280', lineHeight: 1.5 }}>
          {step.description}
        </p>
        {!isComplete && (
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#6366f1', lineHeight: 1.5 }}>
            💡 {step.tip}
          </p>
        )}
        {!isComplete && (
          <Link href={step.href} style={{
            display: 'inline-block',
            padding: '0.4rem 1rem',
            backgroundColor: isNext ? '#1a3a5c' : '#f3f4f6',
            color: isNext ? 'white' : '#374151',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: '600',
          }}>
            {step.actionLabel} →
          </Link>
        )}
      </div>
    </div>
  )
}
