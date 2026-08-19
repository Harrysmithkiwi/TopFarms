// Observability guards — Phase 0 Task 0.3 (audit F-A2).
//
// Two things must stay true, and both are the kind of thing a future refactor breaks
// silently:
//   1. Errors are reported at all (before this phase, nothing was).
//   2. Nothing reported carries seeker PII. TopFarms holds phone/email/visa status and
//      identity documents; shipping any of it to a third party by accident would be a
//      worse outcome than having no error tracking.

import { describe, it, expect } from 'vitest'
import { toError, errorMeta } from '../src/lib/observability'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8')

describe('observability wiring', () => {
  const src = read('src/lib/observability.ts')

  it('stays inert without a DSN so it is safe to ship unconfigured', () => {
    expect(src).toMatch(/if\s*\(\s*!DSN\s*\)\s*return/)
  })

  it('captures existing console.error call sites', () => {
    // ~59 of them across the app; the integration is what makes them visible in prod.
    expect(src).toMatch(/captureConsoleIntegration/)
  })

  it('does not enable session replay or tracing', () => {
    // Both capture DOM and network content, defeating the scrubbing below.
    expect(src).not.toMatch(/replayIntegration|browserTracingIntegration/)
    expect(src).toMatch(/tracesSampleRate:\s*0/)
  })
})

describe('PII scrubbing', () => {
  const src = read('src/lib/observability.ts')

  it('disables Sentry default PII collection', () => {
    expect(src).toMatch(/sendDefaultPii:\s*false/)
  })

  it('strips request bodies, cookies and headers', () => {
    for (const field of ['data', 'cookies', 'headers']) {
      expect(src).toMatch(new RegExp(`delete event\\.request\\.${field}`))
    }
  })

  it('redacts the seeker identifiers this product actually holds', () => {
    for (const key of ['email', 'phone', 'visa', 'passport', 'document_url']) {
      expect(src).toContain(key)
    }
  })

  it('reduces the user object to an opaque id', () => {
    expect(src).toMatch(/event\.user\s*=\s*\{\s*id:\s*event\.user\.id\s*\}/)
  })
})

describe('router error handling', () => {
  const boundary = read('src/components/layout/AppErrorBoundary.tsx')
  // v13 stage 3b: the entry moved from main.tsx (createBrowserRouter's
  // errorElement) to root.tsx's exported ErrorBoundary. Same contract, same
  // component — only who mounts it changed.
  const root = read('src/root.tsx')

  it('root.tsx routes errors to AppErrorBoundary, not NotFound', () => {
    // The original bug: errorElement rendered <NotFound /> for every error, so a crash
    // was shown to the user as a 404 — unreported by them, untracked by us.
    expect(root).toMatch(/export function ErrorBoundary\(\)/)
    expect(root).toMatch(/<AppErrorBoundary\s*\/>/)
  })

  it('still renders NotFound for genuine 404s', () => {
    expect(boundary).toMatch(/isRouteErrorResponse\(error\)\s*&&\s*error\.status\s*===\s*404/)
    // v13 stage 3b: NotFound takes the error as a prop now — useRouteError
    // throws inside the catch-all's descendant route table, which is where every
    // 404 on the site is rendered.
    expect(boundary).toMatch(/if\s*\(isNotFound\)\s*return\s*<NotFound error=\{error\}\s*\/>/)
  })

  it('reports non-404 errors', () => {
    expect(boundary).toMatch(/reportError\(\s*'router'/)
  })

  it('does not report 404s as faults', () => {
    expect(boundary).toMatch(/if\s*\(isNotFound\)\s*return/)
  })

  it('gives the user a recovery path and a contact address', () => {
    expect(boundary).toMatch(/Try again/)
    expect(boundary).toContain('hello@topfarms.co.nz')
  })
})

describe('error coercion', () => {
  // Sentry TOPFARMS-WEB-7 (2026-08-18) arrived titled '[object Object]': a Supabase
  // PostgrestError is a plain object, so String() on it says nothing. The alert fired and
  // withheld the one detail that identified the cause.
  it('reads message off a plain object rather than stringifying it', () => {
    const postgrest = { message: 'permission denied for table employer_profiles', code: '42501' }
    expect(toError(postgrest).message).toBe('permission denied for table employer_profiles')
  })

  it('passes a real Error through untouched so its stack survives', () => {
    const original = new Error('boom')
    expect(toError(original)).toBe(original)
  })

  it('still produces something for values with no message', () => {
    expect(toError('plain string').message).toBe('plain string')
    expect(toError(null).message).toBe('null')
    expect(toError({ message: '' }).message).toBe('[object Object]')
  })
})

describe('Supabase error metadata', () => {
  // `code` is usually the fastest route to the cause and only `message` reaches the Sentry title.
  // Lifted in reportError so no call site has to remember — 27 of them would not have.
  it('lifts code, details and hint off a PostgrestError', () => {
    expect(
      errorMeta({
        message: 'permission denied for table employer_profiles',
        code: '42501',
        details: null,
        hint: 'grant it',
      }),
    ).toEqual({ code: '42501', hint: 'grant it' })
  })

  it('leaves a real Error alone — its code means something else', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    expect(errorMeta(err)).toEqual({})
  })

  it('returns nothing for primitives and null', () => {
    expect(errorMeta('boom')).toEqual({})
    expect(errorMeta(null)).toEqual({})
  })
})

