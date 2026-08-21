import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveEnvironment, scrubEvent } from '@/lib/observability'
import type { ErrorEvent } from '@sentry/react'

// Test intent — UPLIFT-95 Phase 4, the two observability gaps that only matter BEFORE the
// first real employer arrives.
//
// 1. No Sentry.setUser meant every production error was anonymous: "someone hit an error"
//    could never become "WHICH employer hit what". Phase 6 step 4 (shadow the first employer
//    via Sentry + DB) is unbuildable without it.
// 2. `environment` was `import.meta.env.MODE`, which is 'production' for every vite build —
//    including per-PR preview deploys. If the DSN reaches a preview build at all, preview
//    noise lands in the production environment and dilutes the signal. Deriving from the
//    HOST is true regardless of how the env var is scoped in a Vercel dashboard this code
//    cannot see.

describe('resolveEnvironment — preview must never report as production', () => {
  it('maps the real production hosts to production', () => {
    expect(resolveEnvironment('www.topfarms.co.nz')).toBe('production')
    // The apex 308s to www, but a direct hit must still classify correctly.
    expect(resolveEnvironment('topfarms.co.nz')).toBe('production')
  })

  it('maps Vercel preview deploys to preview, not production', () => {
    expect(resolveEnvironment('top-farms-git-somebranch.vercel.app')).toBe('preview')
    expect(resolveEnvironment('top-farms-abc123.vercel.app')).toBe('preview')
  })

  it('maps local development to development', () => {
    expect(resolveEnvironment('localhost')).toBe('development')
    expect(resolveEnvironment('127.0.0.1')).toBe('development')
  })

  it('does not treat a lookalike host as production', () => {
    // A subdomain or a typosquat must not inherit the production label.
    expect(resolveEnvironment('staging.topfarms.co.nz')).toBe('preview')
    expect(resolveEnvironment('topfarms.co.nz.evil.test')).toBe('preview')
  })
})

describe('the user tag carries an opaque id and nothing else', () => {
  it('scrubEvent reduces user to id only', () => {
    const event = {
      user: { id: 'uuid-1', email: 'farmer@example.com', username: 'farmer' },
    } as unknown as ErrorEvent
    const out = scrubEvent(event)
    expect(out.user).toEqual({ id: 'uuid-1' })
    expect(JSON.stringify(out)).not.toContain('farmer@example.com')
  })
})

describe('setUser is wired into both session entry points', () => {
  // Source guard: the defect is a missing CALL, which no unit test of the module can see.
  // Both paths matter — getSession() covers a restored session (the common case on a return
  // visit), onAuthStateChange covers sign-in and sign-out within a session.
  const AUTH = readFileSync(join(process.cwd(), 'src/contexts/AuthContext.tsx'), 'utf-8')
  const OBS = readFileSync(join(process.cwd(), 'src/lib/observability.ts'), 'utf-8')

  it('AuthContext imports and calls setUser', () => {
    expect(AUTH).toContain("from '@/lib/observability'")
    expect(AUTH).toContain('setUser(')
  })

  it('sets the user on the restored session AND on every auth state change', () => {
    expect(AUTH).toContain('setUser(initialSession?.user?.id ?? null)')
    expect(AUTH).toContain('setUser(newSession?.user?.id ?? null)')
  })

  it('applies a pending id when the lazy Sentry chunk lands late', () => {
    // Without the latch, a session that resolves before the import does is silently
    // unidentified — intermittent, and it looks like a Sentry bug rather than a race.
    expect(OBS).toContain('pendingUserId')
    expect(OBS).toContain('if (pendingUserId) Sentry.setUser({ id: pendingUserId })')
  })

  it('sends the id alone, never the email', () => {
    expect(OBS).toContain('sentry.setUser(userId ? { id: userId } : null)')
  })
})

describe('the seeker path reports errors instead of only logging them', () => {
  const FILES = [
    'src/pages/dashboard/seeker/MyApplications.tsx',
    'src/pages/dashboard/seeker/SeekerDocuments.tsx',
    'src/pages/dashboard/seeker/SeekerProfile.tsx',
    'src/pages/onboarding/SeekerOnboarding.tsx',
    'src/pages/onboarding/steps/SeekerStep1FarmType.tsx',
    'src/pages/onboarding/steps/SeekerStep4Skills.tsx',
  ]

  it.each(FILES)('%s uses reportError, not a bare console.error', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf-8')
    expect(src).not.toContain('console.error')
    expect(src).toContain('reportError(')
  })
})
