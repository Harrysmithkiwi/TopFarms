import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
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

// v13 stage 3b: sessionStorage is now read through useSyncExternalStore rather
// than a useState initialiser. /jobs and /jobs/:id server-render, and a state
// initialiser that reads sessionStorage runs on the CLIENT's hydration render
// but not on the server's — a returning seeker-lens visitor would hydrate
// data-aud="seeker" against server HTML saying "employer", which React 19
// treats as a hydration error (and the e2e suite's no-console-errors guard
// treats as a failure). getServerSnapshot pins the server and the hydration
// render to the employer default, which is also what the No-JS nav gate
// requires, and the real lens applies on the commit straight after.
const listeners = new Set<() => void>()

// Set ONLY when a write to sessionStorage threw (private mode, embeds), so the
// toggle still works for the page lifetime there — as it did before this hook
// change. It is not a mirror of the stored value: an absent key still means
// employer, or clearing storage would not reset the lens.
let memory: Audience | null = null

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function readStored(): Audience {
  try {
    return sessionStorage.getItem(KEY) === 'seeker' ? 'seeker' : 'employer'
  } catch {
    return memory ?? 'employer' // storage unavailable: directive 1.9's default
  }
}

// Employer during SSR and hydration, per directive 1.9's default.
function readDefault(): Audience {
  return 'employer'
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const { session, role } = useAuth()
  const stored = useSyncExternalStore(subscribe, readStored, readDefault)

  const setAudience = useCallback((a: Audience) => {
    try {
      sessionStorage.setItem(KEY, a)
    } catch {
      memory = a // storage unavailable: carry the choice for this page lifetime
    }
    listeners.forEach((fn) => fn())
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
