import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { AuthError, type Session, type User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/domain'

export interface AuthHookReturn {
  session: Session | null
  role: UserRole | null
  isActive: boolean
  loading: boolean
  // ReturnType of these supabase.auth methods is already a Promise — wrapping
  // it in another Promise<> made the implementations unassignable (TS2322).
  // signUpWithRole widens AuthResponse: the role-backfill failure branch
  // returns the created user/session alongside an AuthError, which the plain
  // AuthResponse union forbids (its error arm pins data to null/null).
  signUpWithRole: (
    email: string,
    password: string,
    role: 'employer' | 'seeker',
  ) => Promise<
    | Awaited<ReturnType<typeof supabase.auth.signUp>>
    | { data: { user: User | null; session: Session | null }; error: AuthError }
  >
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>
  signOut: () => Promise<void>
  resetPassword: (email: string) => ReturnType<typeof supabase.auth.resetPasswordForEmail>
  updatePassword: (newPassword: string) => ReturnType<typeof supabase.auth.updateUser>
  signInWithOAuth: (provider: 'google' | 'facebook') => Promise<void>
  refreshRole: () => Promise<UserRole | null>
}

async function loadRole(userId: string): Promise<{ role: UserRole | null; isActive: boolean }> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', userId)
    .single()
  // RESEARCH §Pattern 1: default isActive=true on error/null so a transient
  // failure does NOT incorrectly block a valid user. Only an explicit DB
  // is_active=false marks the user as suspended.
  if (error || !data) return { role: null, isActive: true }
  return {
    role: data.role as UserRole,
    isActive: data.is_active ?? true,
  }
}

// Outcome distinguishes a *successful* loadRole (which may legitimately return
// null for an OAuth user pre-SelectRole) from a *timeout* (where we don't know
// the role and must NOT clobber a known-good cached value). The bug we're
// fixing: previously the timeout returned null too, and the handler treated
// that null as "user has no role" — bouncing logged-in tabs to /auth/select-role
// during multi-tab token refresh.
type LoadRoleOutcome =
  | { ok: true; role: UserRole | null; isActive: boolean }
  | { ok: false; reason: 'timeout' }

// Defence-in-depth (originally added in c6066ea as the band-aid before AUTH-FIX):
// race loadRole against a 3s timeout so a hung auth-token Web Lock cannot keep
// loading=true forever. With AuthContext now ensuring ONE subscription per app
// the lock-contention root cause is gone, but multi-tab races and supabase-js
// internals can still hang briefly — kept as cheap insurance.
async function loadRoleWithTimeout(userId: string): Promise<LoadRoleOutcome> {
  return Promise.race<LoadRoleOutcome>([
    loadRole(userId).then(({ role, isActive }) => ({ ok: true, role, isActive })),
    new Promise<LoadRoleOutcome>((resolve) =>
      setTimeout(() => {
        console.warn('[useAuth] loadRole timeout after 3s, keeping previous role')
        resolve({ ok: false, reason: 'timeout' })
      }, 3000),
    ),
  ])
}

const AuthContext = createContext<AuthHookReturn | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  // Pitfall 1: initialise true — never flash /suspended during loadRole resolution.
  const [isActive, setIsActive] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session — ONE subscription for the whole app.
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        setSession(initialSession)
        if (initialSession?.user) {
          const result = await loadRoleWithTimeout(initialSession.user.id)
          if (result.ok) {
            setRole(result.role)
            setIsActive(result.isActive)
          }
          // else: timeout — leave role + isActive at their initial values.
          // ProtectedRoute will bounce to /auth/select-role; user can retry. No previous value to preserve.
        }
        setLoading(false)
      })
      .catch((err) => {
        // Defence-in-depth (c6066ea): unstick loading on any chain rejection
        // so the UI never freezes on a permanent loader.
        console.error('[useAuth] getSession chain failed', err)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)

      if (!newSession?.user) {
        // Genuine sign-out (or no session): clear role.
        setRole(null)
        setIsActive(true) // Pitfall 1 — keep default-true semantics on sign-out
      } else if (
        // Reload role only when there's a real chance the role changed.
        // Critically: skip TOKEN_REFRESHED — that fires on cross-tab token sync
        // and reloading would contend the auth-token Web Lock with the other tab.
        // If the timeout then fires, role would falsely flip to null and bounce
        // the logged-in user to /auth/select-role.
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED'
      ) {
        const result = await loadRoleWithTimeout(newSession.user.id)
        if (result.ok) {
          setRole(result.role)
          setIsActive(result.isActive)
        }
        // else: timeout — keep previous role rather than clobbering it.
      }

      if (event !== 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUpWithRole: AuthHookReturn['signUpWithRole'] = async (email, password, userRole) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: userRole },
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      },
    })

    // Defensive backfill: when signUp returns an immediate session (email
    // confirmation disabled, or auto-confirmed flow), verify the
    // handle_new_user trigger created a user_roles row. If not, backfill
    // via the set_user_role RPC. The email-verification flow is covered
    // separately by SelectRole.tsx if the trigger ever drops a row.
    if (!result.error && result.data.session && result.data.user) {
      const { data: existingRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', result.data.user.id)
        .maybeSingle()

      if (!existingRow) {
        const { error: rpcError } = await supabase.rpc('set_user_role', {
          p_role: userRole,
        })
        if (rpcError) {
          return {
            data: result.data,
            error: new AuthError(
              `Account created but role setup failed: ${rpcError.message}. Please contact support.`,
              500,
              'role_backfill_failed',
            ),
          }
        }
      }
    }

    return result
  }

  const signIn: AuthHookReturn['signIn'] = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut: AuthHookReturn['signOut'] = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setRole(null)
    setIsActive(true)
  }

  const resetPassword: AuthHookReturn['resetPassword'] = async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
  }

  const updatePassword: AuthHookReturn['updatePassword'] = async (newPassword) => {
    return supabase.auth.updateUser({ password: newPassword })
  }

  const signInWithOAuth: AuthHookReturn['signInWithOAuth'] = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/select-role`,
        scopes: provider === 'facebook' ? 'email' : undefined,
      },
    })
    if (error) throw error
  }

  const refreshRole: AuthHookReturn['refreshRole'] = async () => {
    if (session?.user) {
      const { role: userRole, isActive: userIsActive } = await loadRole(session.user.id)
      setRole(userRole)
      setIsActive(userIsActive)
      return userRole
    }
    return null
  }

  const value: AuthHookReturn = {
    session,
    role,
    isActive,
    loading,
    signUpWithRole,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    signInWithOAuth,
    refreshRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Provider + hook intentionally co-located (AUTH-FIX single-subscription
// design); fast refresh falls back to a full reload for this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthHookReturn {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
