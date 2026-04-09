'use client'

import { logout } from '@/app/actions/auth'

export default function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      style={{
        background: 'none',
        border: '1px solid rgba(255,255,255,0.3)',
        color: 'white',
        padding: '0.3rem 0.75rem',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.875rem',
      }}
    >
      Log out
    </button>
  )
}
