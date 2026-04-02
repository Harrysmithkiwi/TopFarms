import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/domain'

interface AuthHookReturn {
  session: Session | null
  role: UserRole | null
  loading: boolean
  signUpWithRole: (email: string, password: string, role: 'employer' | 'seeker') => Promise<ReturnType<typeof supabase.auth.signUp>>
  signIn: (email: string, password: string) => Promise<ReturnType<typeof supabase.auth.signInWithPassword>>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<ReturnType<typeof supabase.auth.resetPasswordForEmail>>
  updatePassword: (newPassword: string) => Promise<ReturnType<typeof supabase.auth.updateUser>>
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

export function useAuth(): AuthHookReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession)
      if (initialSession?.user) {
        const userRole = await loadRole(initialSession.user.id)
        setRole(userRole)
      }
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        const userRole = await loadRole(newSession.user.id)
        setRole(userRole)
      } else {
        setRole(null)
      }
      if (event !== 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUpWithRole = async (email: string, password: string, userRole: 'employer' | 'seeker') => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: userRole },
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      },
    })
  }

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setRole(null)
  }

  const resetPassword = async (email: string) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
  }

  const updatePassword = async (newPassword: string) => {
    return supabase.auth.updateUser({ password: newPassword })
  }

  const signInWithOAuth = async (provider: 'google' | 'facebook') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/select-role`,
        scopes: provider === 'facebook' ? 'email' : undefined,
      },
    })
    if (error) throw error
  }

  const refreshRole = async () => {
    if (session?.user) {
      const userRole = await loadRole(session.user.id)
      setRole(userRole)
      return userRole
    }
    return null
  }

  return {
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
}
