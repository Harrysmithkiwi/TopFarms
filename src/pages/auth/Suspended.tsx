import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

/**
 * Phase 21 Track B — gate page for suspended users.
 *
 * Routed at /suspended (registered in main.tsx OUTSIDE ProtectedRoute). The redirect
 * target for ProtectedRoute's isActive=false guard (Phase 21 plan 21-04). Without
 * this page, a suspended user navigating into a dashboard would loop on the
 * ProtectedRoute redirect.
 *
 * Locked message per Phase 21 CONTEXT.md "Gate page message" decision. NO links
 * into authenticated app surfaces — only Sign Out (clears the session so user can
 * sign back in if reactivated by admin via ProfileDrawer).
 */
export function Suspended() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('[Suspended] signOut failed', err)
      toast.error('Sign out failed — please refresh the page.')
      setSigningOut(false)
    }
  }

  return (
    <AuthLayout title="Account suspended">
      <div className="space-y-6">
        <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
          Your account has been suspended. If you think this is an error, contact{' '}
          <a
            href="mailto:hello@topfarms.co.nz"
            className="underline"
            style={{ color: 'var(--color-brand-900)' }}
          >
            hello@topfarms.co.nz
          </a>
          .
        </p>

        <Button
          type="button"
          variant="primary"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </AuthLayout>
  )
}
