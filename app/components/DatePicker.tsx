'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  name: string
  value: string            // YYYY-MM-DD or ''
  onChange: (e: { target: { name: string; value: string } }) => void
  placeholder?: string
  minDate?: string         // YYYY-MM-DD — days before this are dimmed
  style?: React.CSSProperties
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseDate(str: string): Date | null {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return isNaN(dt.getTime()) ? null : dt
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplay(str: string): string {
  const d = parseDate(str)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function DatePicker({
  name,
  value,
  onChange,
  placeholder = 'Select a date',
  minDate,
  style,
}: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selected = parseDate(value)
  const min      = parseDate(minDate ?? '') ?? null

  const initDate = selected ?? today
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [open, setOpen] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const selectDay = useCallback((day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    onChange({ target: { name, value: toYMD(d) } })
    setOpen(false)
  }, [viewYear, viewMonth, name, onChange])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const grid = buildGrid(viewYear, viewMonth)

  const todayYMD    = toYMD(today)
  const selectedYMD = value

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      {/* Trigger input */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.55rem 0.75rem',
          border: `1px solid ${open ? '#6366f1' : '#d1d5db'}`,
          borderRadius: '7px',
          fontSize: '0.875rem',
          color: value ? '#111827' : '#9ca3af',
          backgroundColor: 'white',
          cursor: 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          width: '100%',
          transition: 'border-color 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        }}
      >
        {/* Calendar icon */}
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#9ca3af' }}>
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : placeholder}</span>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9ca3af', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Dropdown calendar */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '1rem',
          minWidth: '280px',
          animation: 'dpFadeIn 0.12s ease',
        }}>
          <style>{`
            @keyframes dpFadeIn {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{
                width: '28px', height: '28px', border: 'none', background: 'none',
                cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#6b7280',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827', letterSpacing: '-0.01em' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              style={{
                width: '28px', height: '28px', border: 'none', background: 'none',
                cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#6b7280',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: '600',
                color: '#9ca3af',
                padding: '2px 0 4px',
                letterSpacing: '0.03em',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {grid.map((day, i) => {
              if (day === null) return <div key={i} />

              const ymd = toYMD(new Date(viewYear, viewMonth, day))
              const isSelected = ymd === selectedYMD
              const isToday    = ymd === todayYMD
              const isPast     = min ? ymd < toYMD(min) : false

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isPast && selectDay(day)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    border: 'none',
                    borderRadius: '7px',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? '700' : isToday ? '600' : '400',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected ? '#111827' : 'transparent',
                    color: isSelected ? 'white' : isPast ? '#d1d5db' : isToday ? '#4f46e5' : '#374151',
                    outline: isToday && !isSelected ? '2px solid #e0e7ff' : 'none',
                    outlineOffset: '-1px',
                    transition: 'background-color 0.1s, color 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected && !isPast) e.currentTarget.style.backgroundColor = '#f3f4f6'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick actions */}
          <div style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            gap: '0.5rem',
          }}>
            <button
              type="button"
              onClick={() => {
                onChange({ target: { name, value: todayYMD } })
                setOpen(false)
              }}
              style={{
                flex: 1,
                padding: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                color: '#4f46e5',
                backgroundColor: '#eef2ff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange({ target: { name, value: '' } })
                  setOpen(false)
                }}
                style={{
                  flex: 1,
                  padding: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
