import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import ProfileStepForm from './ProfileStepForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profile | Broker Setup',
}

export default async function ProfileStepPage() {
  const { profile, completedIds } = await loadSetupContext()
  return (
    <SetupShell currentId="profile" completedIds={completedIds}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={EYEBROW}>Step 2 · Required</p>
        <h1 style={H1}>Your profile</h1>
        <p style={P}>
          This info shows on your public broker profile and on every listing you post. Make sure buyers can find you and reach you.
        </p>
      </div>
      <ProfileStepForm
        defaultBrokerage={profile.brokerage ?? ''}
        defaultPhone={profile.phone ?? ''}
        defaultEmail={profile.contact_email ?? ''}
        defaultBio={profile.bio ?? ''}
        defaultWebsite={profile.website ?? ''}
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
