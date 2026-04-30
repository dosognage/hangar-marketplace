'use client'

/**
 * SetupProgress — top-of-page wizard indicator.
 *
 * Renders numbered circles (one per step), a progress fill bar showing how
 * far along the user is, and lets the user navigate back to any previously-
 * visited or completed step. Pure CSS animations, no client deps.
 */

import Link from 'next/link'
import type { SetupStep, SetupStepId } from './steps'

type Props = {
  steps:        SetupStep[]
  currentId:    SetupStepId
  completedIds: Set<SetupStepId>
}

export default function SetupProgress({ steps, currentId, completedIds }: Props) {
  const currentIdx = steps.findIndex(s => s.id === currentId)
  const completedCount = steps.filter(s => completedIds.has(s.id)).length
  const progressPct = Math.round((completedCount / steps.length) * 100)

  return (
    <div style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '1.5rem 1rem 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'saturate(180%) blur(8px)',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Top label row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#1d4ed8',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Broker Setup · Step {currentIdx + 1} of {steps.length}
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>
            {progressPct}% complete
          </p>
        </div>

        {/* Stepper — circles + connecting line */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Background line */}
          <div style={{
            position: 'absolute',
            left: '14px', right: '14px', top: '50%',
            height: '2px',
            backgroundColor: '#e5e7eb',
            zIndex: 0,
            transform: 'translateY(-50%)',
          }} />

          {/* Progress fill — width grows with completion */}
          <div style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            height: '2px',
            width: `calc((100% - 28px) * ${progressPct / 100})`,
            background: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 100%)',
            zIndex: 0,
            transform: 'translateY(-50%)',
            transition: 'width 0.4s ease',
          }} />

          {steps.map((step) => {
            const done   = completedIds.has(step.id)
            const active = step.id === currentId
            const visited = done || active // can navigate back

            const circle = (
              <span style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: done ? '#1d4ed8' : active ? 'white' : '#f3f4f6',
                border: done ? '2px solid #1d4ed8' : active ? '2px solid #1d4ed8' : '2px solid #e5e7eb',
                color: done ? 'white' : active ? '#1d4ed8' : '#9ca3af',
                fontSize: '0.78rem', fontWeight: 700,
                position: 'relative', zIndex: 1,
                transition: 'all 0.2s',
              }}>
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7 L6 11 L12 3" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : step.index}
              </span>
            )

            return (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                {visited ? (
                  <Link href={step.path} style={{ textDecoration: 'none' }} aria-label={`Step ${step.index}: ${step.title}`}>
                    {circle}
                  </Link>
                ) : circle}
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#1d4ed8' : done ? '#374151' : '#9ca3af',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '80px',
                }}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
