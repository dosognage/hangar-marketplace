import { supabaseAdmin } from '@/lib/supabase-admin'
import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import PreferencesStepForm from './PreferencesStepForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Preferences | Broker Setup',
}

export default async function PreferencesStepPage() {
  const { profile, completedIds, userEmail } = await loadSetupContext()

  // Pre-fill the newsletter checkbox if they're already subscribed (e.g. from
  // a previous setup attempt or an opt-in elsewhere).
  const { data: existingSub } = await supabaseAdmin
    .from('email_subscribers')
    .select('marketing_consent, unsubscribed_at')
    .eq('email', userEmail.toLowerCase())
    .maybeSingle()
  const alreadySubscribed = !!(existingSub?.marketing_consent && !existingSub.unsubscribed_at)

  return (
    <SetupShell currentId="preferences" completedIds={completedIds}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={EYEBROW}>Step 6 · Required</p>
        <h1 style={H1}>Preferences</h1>
        <p style={P}>
          Two quick toggles plus our weekly market intelligence newsletter. All changeable later.
        </p>
      </div>
      <PreferencesStepForm
        defaultAlertRadius={profile.alert_radius_miles ?? 100}
        defaultHideEmail={false /* reading from profile would need an extra select; default to off */}
        defaultSubscribe={!alreadySubscribed /* if they're not already subscribed, default-checked to encourage opt-in */}
      />
    </SetupShell>
  )
}

const EYEBROW: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700,
  color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em',
}
const H1: React.CSSProperties = { margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }
const P:  React.CSSProperties = { margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }
