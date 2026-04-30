import SetupShell from '../SetupShell'
import { loadSetupContext } from '../loadSetupContext'
import TourClient from './TourClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tour | Broker Setup',
}

export default async function TourStepPage() {
  const { completedIds } = await loadSetupContext()

  return (
    <SetupShell currentId="tour" completedIds={completedIds}>
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={EYEBROW}>Step 5 · 2 minute tour</p>
        <h1 style={H1}>What you just unlocked</h1>
        <p style={P}>
          Five proprietary tools you only get with the verified broker badge.
          Skim through. Each one&apos;s a place you can come back to once your listings are live.
        </p>
      </div>
      <TourClient />
    </SetupShell>
  )
}

const EYEBROW: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700,
  color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em',
}
const H1: React.CSSProperties = {
  margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800,
  color: '#0f172a', letterSpacing: '-0.02em',
}
const P: React.CSSProperties = { margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.6 }
