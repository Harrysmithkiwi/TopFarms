import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

/**
 * Phase 5.0e — a recovery link that lands anywhere must still reset a password.
 *
 * Supabase puts `type=recovery` in the URL fragment (and `?type=recovery` on the
 * PKCE/code path). Where that URL points is decided by whichever of these wins:
 *
 *   - `redirectTo` passed to resetPasswordForEmail — our app sends /auth/reset,
 *     which is correct;
 *   - the project Site URL — used whenever redirectTo is absent or is not in the
 *     redirect allowlist. Every mail sent from the Supabase dashboard takes this
 *     path, and so does the app's own mail if the allowlist entry lacks a `/**`
 *     wildcard.
 *
 * In the second case the token lands on `/`, `detectSessionInUrl: true` consumes
 * it there, and the user is silently signed in with no way to set a password —
 * observed in production 2026-07-31. The token is single-use, so each attempt
 * burns one and the user cannot tell why nothing happened.
 *
 * This forwards to /auth/reset before any of that matters. It is a guard against
 * a class of misconfiguration, not a substitute for configuring it: the redirect
 * allowlist should still carry `https://topfarms.co.nz/**`.
 *
 * ponytail: no token parsing here — supabase-js owns that. This only routes.
 */
export function RecoveryRedirect() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/auth/reset') return
    const isRecovery =
      /(^|[#&?])type=recovery(&|$)/.test(window.location.hash) ||
      new URLSearchParams(window.location.search).get('type') === 'recovery'
    if (!isRecovery) return
    // Carry the fragment across: supabase-js may not have consumed it yet, and
    // /auth/reset works either way — live event or already-exchanged session.
    navigate(`/auth/reset${window.location.hash}`, { replace: true })
  }, [location.pathname, navigate])

  return null
}
