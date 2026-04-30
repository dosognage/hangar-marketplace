import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import SpecialtyStepForm from './SpecialtyStepForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Coverage — Broker Setup | Hangar Marketplace',
}

export default async function SpecialtyStepPage() {
  const { profile, completedIds } = await loadSetupContext()
  return (
    <SetupShell currentId="specialty" completedIds={completedIds}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={EYEBROW}>Step 4 — Optional</p>
        <h1 style={H1}>Specialty airports</h1>
        <p style={P}>
          Mark up to 10 airports you primarily work at. Buyers searching those airports will see your verified-broker badge in results, and you\'ll get email alerts when pilots post hangar requests within your alert radius of these airports.
        </p>
      </div>
      <SpecialtyStepForm
        defaultAirports={profile.specialty_airports ?? []}
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
