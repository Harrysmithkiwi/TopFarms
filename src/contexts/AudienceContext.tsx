import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

// v13 (directive 1.14): the audience toggle is a pre-auth browsing lens.
// The value lives in sessionStorage ('tf-aud', matching the v12 comp), read once
// at mount. Precedence: SESSION ROLE BEATS TOGGLE whenever a session exists with
// an employer/seeker role -- the toggle only speaks for visitors who haven't
// told us who they are yet. Admin sessions fall back to the stored lens (an
// admin previewing the site is a visitor, not an audience).
// Rejected alternatives (URL segment, per-link query param, cookie) are recorded
// in the directive so they are not re-litigated here.

export type Audience = 'employer' | 'seeker'

const KEY = 'tf-aud'

interface AudienceContextValue {
  /** The effective audience: session role when signed in, else the toggle. */
  audience: Audience
  /** True when the audience comes from a session role and the toggle should not render. */
  lockedByRole: boolean
  setAudience: (a: Audience) => void
}

const AudienceContext = createContext<AudienceContextValue | null>(null)

function readStored(): Audience {
  try {
    return sessionStorage.getItem(KEY) === 'seeker' ? 'seeker' : 'employer'
  } catch {
    return 'employer' // storage unavailable (private mode, embeds): employer default, directive 1.9
  }
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const { session, role } = useAuth()
  const [stored, setStored] = useState<Audience>(readStored)

  const setAudience = useCallback((a: Audience) => {
    setStored(a)
    try {
      sessionStorage.setItem(KEY, a)
    } catch {
      // storage unavailable: state still updates for this page lifetime
    }
  }, [])

  const roleAudience: Audience | null =
    session && (role === 'employer' || role === 'seeker') ? role : null

  const value = useMemo(
    () => ({
      audience: roleAudience ?? stored,
      lockedByRole: roleAudience !== null,
      setAudience,
    }),
    [roleAudience, stored, setAudience],
  )

  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- deliberate: the hook belongs beside its context; HMR full-reload on a context file is fine
export function useAudience(): AudienceContextValue {
  const ctx = useContext(AudienceContext)
  if (!ctx) throw new Error('useAudience must be used inside <AudienceProvider>')
  return ctx
}
