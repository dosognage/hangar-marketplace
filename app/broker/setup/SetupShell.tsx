/**
 * SetupShell — visual frame each step page renders inside.
 *
 * Composition:
 *   <SetupShell currentId="profile" completedIds={...}>
 *     <h1>Profile</h1>
 *     <p>Subtitle</p>
 *     <YourForm />
 *     <SetupNav backTo="/broker/setup" />
 *   </SetupShell>
 *
 * Renders the progress bar at the top + a card body. The page is responsible
 * for its own headings/forms/nav buttons.
 */

import SetupProgress from './SetupProgress'
import { SETUP_STEPS, type SetupStepId } from './steps'

type Props = {
  currentId:    SetupStepId
  completedIds: Set<SetupStepId>
  children:     React.ReactNode
}

export default function SetupShell({ currentId, completedIds, children }: Props) {
  return (
    <>
      <SetupProgress
        steps={SETUP_STEPS}
        currentId={currentId}
        completedIds={completedIds}
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
