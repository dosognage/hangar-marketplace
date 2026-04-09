'use client'

/**
 * SavedCountProvider
 *
 * A single source of truth for the number of listings the current user
 * has saved. Initialized from the server-fetched count (SSR-safe), then
 * kept live in React state so any component that saves or unsaves a
 * listing can update the badge in ProfileMenu instantly — no page refresh.
 *
 * Usage:
 *   // Read the count and mutate functions anywhere inside the provider
 *   const { savedCount, incrementSaved, decrementSaved } = useSavedCount()
 *
 * Provider placement: wraps the entire <body> in layout.tsx, so both the
 * header (ProfileMenu) and page content (SplitView, FavoriteButton) share
 * the exact same context instance.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

// ── Context shape ─────────────────────────────────────────────────────────

type SavedCountContextValue = {
  /** Current number of saved listings for the signed-in user. */
  savedCount: number
  /** Call after successfully saving a listing. */
  incrementSaved: () => void
  /** Call after successfully removing a saved listing. */
  decrementSaved: () => void
}

// Sensible no-op defaults so components don't need to null-check.
const SavedCountContext = createContext<SavedCountContextValue>({
  savedCount: 0,
  incrementSaved: () => {},
  decrementSaved: () => {},
})

// ── Hook ─────────────────────────────────────────────────────────────────

export function useSavedCount(): SavedCountContextValue {
  return useContext(SavedCountContext)
}

// ── Provider ──────────────────────────────────────────────────────────────

type Props = {
  /** Count fetched server-side; used to hydrate the initial state. */
  initialCount: number
  children: ReactNode
}

export default function SavedCountProvider({ initialCount, children }: Props) {
  const [savedCount, setSavedCount] = useState<number>(initialCount)

  // Stable references — safe to pass to memoized children
  const incrementSaved = useCallback(
    () => setSavedCount((n) => n + 1),
    []
  )

  const decrementSaved = useCallback(
    () => setSavedCount((n) => Math.max(0, n - 1)),
    []
  )

  return (
    <SavedCountContext.Provider value={{ savedCount, incrementSaved, decrementSaved }}>
      {children}
    </SavedCountContext.Provider>
  )
}
