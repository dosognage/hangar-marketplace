'use client'

import { useState } from 'react'
import { decimalToFtIn, ftInToDecimal } from '@/lib/dimensions'

interface FeetInchesInputProps {
  name: string
  placeholder?: string
  style?: React.CSSProperties
  /** Controlled mode — pass alongside onChange */
  value?: string | number | null
  onChange?: (e: { target: { name: string; value: string } }) => void
  /** Uncontrolled mode — used by native form actions (edit form) */
  defaultValue?: number | string | null
}

/**
 * Dual ft/in input that stores as decimal feet.
 *
 * Controlled mode  (value + onChange): fires onChange with decimal feet string.
 * Uncontrolled mode (defaultValue):    renders a hidden <input name={name}> for form submission.
 */
export default function FeetInchesInput({
  name,
  placeholder = '0',
  style,
  value,
  onChange,
  defaultValue,
}: FeetInchesInputProps) {
  const isControlled = value !== undefined

  const initial = isControlled ? decimalToFtIn(value) : decimalToFtIn(defaultValue)
  const [ft, setFt] = useState(initial.ft)
  const [ins, setIns] = useState(initial.ins)
  const [hiddenVal, setHiddenVal] = useState(
    isControlled
      ? String(value ?? '')
      : ftInToDecimal(initial.ft, initial.ins)
  )

  function update(newFt: string, newIns: string) {
    const decimal = ftInToDecimal(newFt, newIns)
    setHiddenVal(decimal)
    if (onChange) onChange({ target: { name, value: decimal } })
  }

  const halfStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    flex: '1 1 0',
    minWidth: 0,
  }

  const unitStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: '#6b7280',
    flexShrink: 0,
    userSelect: 'none',
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {/* Hidden field for uncontrolled / native form submission */}
      {!isControlled && (
        <input type="hidden" name={name} value={hiddenVal} />
      )}

      {/* Feet */}
      <div style={halfStyle}>
        <input
          type="number"
          min="0"
          placeholder={placeholder}
          value={ft}
          onChange={e => { setFt(e.target.value); update(e.target.value, ins) }}
          style={{ ...style, flex: 1, minWidth: 0 }}
        />
        <span style={unitStyle}>ft</span>
      </div>

      {/* Inches */}
      <div style={halfStyle}>
        <input
          type="number"
          min="0"
          max="11"
          placeholder="0"
          value={ins}
          onChange={e => { setIns(e.target.value); update(ft, e.target.value) }}
          style={{ ...style, flex: 1, minWidth: 0 }}
        />
        <span style={unitStyle}>in</span>
      </div>
    </div>
  )
}
