import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/domain'

export interface AuthHookReturn {
  session: Session | null
  role: UserRole | null
  loading: boolean
  signUpWithRole: (
    email: string,
    password: string,
    role: 'employer' | 'seeker',
  ) => Promise<ReturnType<typeof supabase.auth.signUp>>
  signIn: (
    email: string,
    password: string,
  ) => Promise<ReturnType<typeof supabase.auth.signInWithPassword>>
  signOut: () => Promise<void>
  resetPassword: (
    email: string,
  ) => Promise<ReturnType<typeof supabase.auth.resetPasswordForEmail>>
  updatePassword: (
    newPassword: string,
  ) => Promise<ReturnType<typeof supabase.auth.updateUser>>
  signInWithOAuth: (provider: 'google' | 'facebook') => Promise<void>
  refreshRole: () => Promise<UserRole | null>
}

async function loadRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.role as UserRole
}

// Outcome distinguishes a *successful* loadRole (which may legitimately return
// null for an OAuth user pre-SelectRole) from a *timeout* (where we don't know
// the role and must NOT clobber a known-good cached value). The bug we're
// fixing: previously the timeout returned null too, and the handler treated
// that null as "user has no role" — bouncing logged-in tabs to /auth/select-role
// during multi-tab token refresh.
type LoadRoleOutcome =
  | { ok: true; role: UserRole | null }
  | { ok: false; reason: 'timeout' }

// Defence-in-depth (originally added in c6066ea as the band-aid before AUTH-FIX):
// race loadRole against a 3s timeout so a hung auth-token Web Lock cannot keep
// loading=true forever. With AuthContext now ensuring ONE subscription per app
// the lock-contention root cause is gone, but multi-tab races and supabase-js
// internals can still hang briefly — kept as cheap insurance.
async function loadRoleWithTimeout(userId: string): Promise<LoadRoleOutcome> {
  return Promise.race<LoadRoleOutcome>([
    loadRole(userId).then((role) => ({ ok: true, role })),
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session — ONE subscription for the whole app.
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        setSession(initialSession)
        if (initialSession?.user) {
          const result = await loadRoleWithTimeout(initialSession.user.id)
          if (result.ok) setRole(result.role)
          // else: timeout — leave role at its initial null. ProtectedRoute will
          // bounce to /auth/select-role; user can retry. No previous value to preserve.
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
        if (result.ok) setRole(result.role)
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

  const signUpWithRole: AuthHookReturn['signUpWithRole'] = async (
    email,
    password,
    userRole,
  ) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: userRole },
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      },
    })
  }

  const signIn: AuthHookReturn['signIn'] = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut: AuthHookReturn['signOut'] = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setRole(null)
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
      const userRole = await loadRole(session.user.id)
      setRole(userRole)
      return userRole
    }
    return null
  }

  const value: AuthHookReturn = {
    session,
    role,
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

export function useAuth(): AuthHookReturn {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
