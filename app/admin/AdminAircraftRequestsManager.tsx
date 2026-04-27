'use client'

/**
 * Admin queue for inbound aircraft requests. Each row can be expanded into a
 * compact form prefilled with the manufacturer + model from the request; the
 * admin fills in the remaining dimensions and clicks Approve. On approve we
 * insert the row into aircraft_specs, close the request, and email the
 * requester a "your aircraft is now in the list" note.
 */

import { useState, useTransition } from 'react'
import {
  approveAircraftRequest,
  closeAircraftRequest,
  type AircraftRequest,
} from '@/app/actions/aircraft'

const CATEGORIES = [
  'light_single',
  'mid_single',
  'hp_single',
  'light_twin',
  'turboprop',
  'light_jet',
  'mid_jet',
  'large_jet',
  'helicopter',
] as const

export default function AdminAircraftRequestsManager({
  initialOpen,
  initialClosed,
}: {
  initialOpen:   AircraftRequest[]
  initialClosed: AircraftRequest[]
}) {
  const [open, setOpen]     = useState<AircraftRequest[]>(initialOpen)
  const [closed, setClosed] = useState<AircraftRequest[]>(initialClosed)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleAfterAction(removedId: string, request: AircraftRequest) {
    setOpen(prev => prev.filter(r => r.id !== removedId))
    setClosed(prev => [{ ...request, status: 'closed' }, ...prev].slice(0, 20))
    setExpandedId(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem' }}>Aircraft Requests</h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
          Pilots asking us to add their aircraft to the dataset. Approve to insert
          a new row in aircraft_specs and email them.
        </p>
      </div>

      {open.length === 0 ? (
        <div style={emptyStyle}>
          No open requests right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {open.map(req => (
            <RequestRow
              key={req.id}
              request={req}
              expanded={expandedId === req.id}
              onToggleExpand={() => setExpandedId(expandedId === req.id ? null : req.id)}
              onResolved={() => handleAfterAction(req.id, req)}
            />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
              Recently closed ({closed.length})
            </summary>
            <ul style={{ marginTop: '0.5rem', padding: '0 0 0 1.25rem', fontSize: '0.82rem', color: '#6b7280' }}>
              {closed.map(c => (
                <li key={c.id} style={{ padding: '0.2rem 0' }}>
                  {c.manufacturer ? `${c.manufacturer} ` : ''}{c.model}
                  {c.user_email && <span style={{ color: '#9ca3af' }}> · {c.user_email}</span>}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  )
}

function RequestRow({
  request,
  expanded,
  onToggleExpand,
  onResolved,
}: {
  request:        AircraftRequest
  expanded:       boolean
  onToggleExpand: () => void
  onResolved:     () => void
}) {
  return (
    <div style={rowOuterStyle}>
      <div style={rowHeaderStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
            {request.manufacturer ? `${request.manufacturer} ` : ''}{request.model}
          </p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            {request.user_email ?? '(no email on record)'} ·{' '}
            {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {request.notes && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>
              {request.notes}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button onClick={onToggleExpand} style={primaryBtnStyle}>
            {expanded ? 'Cancel' : 'Approve & add'}
          </button>
          <CloseWithoutAddButton requestId={request.id} onDone={onResolved} />
        </div>
      </div>

      {expanded && (
        <ApproveForm
          request={request}
          onDone={onResolved}
        />
      )}
    </div>
  )
}

function ApproveForm({
  request,
  onDone,
}: {
  request: AircraftRequest
  onDone:  () => void
}) {
  const [manufacturer, setManufacturer] = useState(request.manufacturer ?? '')
  const [model, setModel]               = useState(request.model)
  const [commonName, setCommonName]     = useState(
    [request.manufacturer ?? '', request.model].filter(Boolean).join(' ').trim()
  )
  const [category, setCategory]         = useState<typeof CATEGORIES[number]>('mid_single')
  const [wingspan, setWingspan]         = useState('')
  const [length, setLength]             = useState('')
  const [height, setHeight]             = useState('')
  const [mtow, setMtow]                 = useState('')
  const [isTd, setIsTd]                 = useState(false)
  const [isPending, startTransition]    = useTransition()
  const [error, setError]               = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await approveAircraftRequest({
        request_id:     request.id,
        manufacturer,
        model,
        common_name:    commonName,
        category,
        wingspan_ft:    parseFloat(wingspan),
        length_ft:      parseFloat(length),
        height_ft:      parseFloat(height),
        mtow_lbs:       mtow ? parseFloat(mtow) : null,
        is_taildragger: isTd,
      })
      if (res.error) {
        setError(res.error)
      } else {
        onDone()
      }
    })
  }

  return (
    <form onSubmit={submit} style={formStyle}>
      <div style={twoColStyle}>
        <Field label="Manufacturer">
          <input value={manufacturer} onChange={e => setManufacturer(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Model *">
          <input value={model} onChange={e => setModel(e.target.value)} required style={inputStyle} />
        </Field>
      </div>
      <Field label="Common name (shown in the picker) *">
        <input value={commonName} onChange={e => setCommonName(e.target.value)} required style={inputStyle} />
      </Field>
      <div style={twoColStyle}>
        <Field label="Category *">
          <select value={category} onChange={e => setCategory(e.target.value as typeof CATEGORIES[number])} style={inputStyle}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </Field>
        <Field label="MTOW (lbs)">
          <input type="number" inputMode="decimal" step="any" min="0" value={mtow} onChange={e => setMtow(e.target.value)} placeholder="optional" style={inputStyle} />
        </Field>
      </div>
      <div style={threeColStyle}>
        <Field label="Wingspan (ft) *">
          <input type="number" inputMode="decimal" step="any" min="0" value={wingspan} onChange={e => setWingspan(e.target.value)} required style={inputStyle} />
        </Field>
        <Field label="Length (ft) *">
          <input type="number" inputMode="decimal" step="any" min="0" value={length} onChange={e => setLength(e.target.value)} required style={inputStyle} />
        </Field>
        <Field label="Tail height (ft) *">
          <input type="number" inputMode="decimal" step="any" min="0" value={height} onChange={e => setHeight(e.target.value)} required style={inputStyle} />
        </Field>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
        <input type="checkbox" checked={isTd} onChange={e => setIsTd(e.target.checked)} />
        Taildragger
      </label>
      {error && <p style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626' }}>{error}</p>}
      <div>
        <button type="submit" disabled={isPending} style={primaryBtnStyle}>
          {isPending ? 'Adding…' : 'Add aircraft & email requester'}
        </button>
      </div>
    </form>
  )
}

function CloseWithoutAddButton({
  requestId,
  onDone,
}: {
  requestId: string
  onDone:    () => void
}) {
  const [isPending, startTransition] = useTransition()
  function close() {
    if (!confirm('Mark this request closed without adding the aircraft?')) return
    startTransition(async () => {
      const res = await closeAircraftRequest({ request_id: requestId })
      if (!res.error) onDone()
    })
  }
  return (
    <button type="button" onClick={close} disabled={isPending} style={cancelBtnStyle}>
      {isPending ? '…' : 'Dismiss'}
    </button>
  )
}

// ── Layout helpers + styles ────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280' }}>{label}</label>
      {children}
    </div>
  )
}

const rowOuterStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  backgroundColor: 'white',
  overflow: 'hidden',
}

const rowHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.85rem',
  alignItems: 'flex-start',
  padding: '0.85rem 1rem',
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  padding: '0.85rem 1rem',
  borderTop: '1px solid #f3f4f6',
  backgroundColor: '#fafafa',
}

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.55rem',
}

const threeColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  gap: '0.55rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.85rem',
  backgroundColor: '#0f172a',
  color: 'white',
  border: 'none',
  borderRadius: '7px',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.85rem',
  backgroundColor: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '7px',
  fontSize: '0.82rem',
  fontWeight: 500,
  cursor: 'pointer',
}

const emptyStyle: React.CSSProperties = {
  padding: '1.5rem',
  textAlign: 'center',
  border: '1px dashed #e5e7eb',
  borderRadius: '10px',
  backgroundColor: '#fafafa',
  color: '#9ca3af',
  fontSize: '0.85rem',
}
