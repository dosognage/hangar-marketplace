/**
 * SetupShell — visual frame each step page renders inside.
 *
 * Strips the SETUP_STEPS array down to plain JSON-serialisable data before
 * passing it to the client SetupProgress component. The full SetupStep
 * shape contains an isComplete function which Next.js refuses to send
 * across the server-client boundary.
 */

import SetupProgress, { type StepView } from './SetupProgress'
import { SETUP_STEPS, type SetupStepId } from './steps'

type Props = {
  currentId:    SetupStepId
  completedIds: Set<SetupStepId>
  children:     React.ReactNode
}

export default function SetupShell({ currentId, completedIds, children }: Props) {
  // Map to a plain-data view with no functions, and convert the Set to an
  // array (Sets aren't serialisable either).
  const stepViews: StepView[] = SETUP_STEPS.map(s => ({
    id:    s.id,
    index: s.index,
    path:  s.path,
    title: s.title,
  }))
  const completedArray = Array.from(completedIds)

  return (
    <>
      <SetupProgress
        steps={stepViews}
        currentId={currentId}
        completedIds={completedArray}
      />
      <div style={{ flex: 1, padding: '2.5rem 1rem 4rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '2rem 2rem 1.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
