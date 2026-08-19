// Edge Function authorization guard — Phase 1 Task 1.1/1.2 (audit P0-2, P0-3, F-A4).
//
// THE FAILURE THIS PREVENTS
// The service-role key bypasses RLS entirely. Using it is legitimate; using it without
// re-implementing the ownership check RLS would have applied is not. Four functions took
// employer_id / application_id / seeker_id straight from the request body and never checked
// the caller, so any signed-up user could read and write another tenant's data — including
// visa_status — and unlock paywalled seeker contact details for free.
//
// The root cause was not ignorance: get-applicant-document-url had the check right all
// along. It was never made reusable, so each new function re-derived the problem and four
// got it wrong. This suite enforces the reusable version, so function #15 inherits
// correctness instead of re-litigating it.
//
// Static-source guard: these handlers are Deno and cannot be imported into vitest. Same
// idiom as tests/webhook-secret-presence.test.ts and tests/stripe-webhook.test.ts.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const FN_DIR = resolve(__dirname, '..', 'supabase/functions')

const functionNames = readdirSync(FN_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name)
  .filter((n) => existsSync(resolve(FN_DIR, n, 'index.ts')))
  .sort()

const sourceOf = (fn: string) => readFileSync(resolve(FN_DIR, fn, 'index.ts'), 'utf8')

/**
 * Functions that hold the service-role key but are NOT user-invoked, so the shared
 * caller-authorization helper does not apply. Each needs its alternative mechanism named —
 * an entry here is an assertion that the function is gated some other way, not a pass.
 */
const NON_USER_INVOKED: Record<string, { mechanism: RegExp; why: string }> = {
  'stripe-webhook': {
    mechanism: /constructEventAsync\(/,
    why: 'Stripe sends no Authorization header; auth is the stripe-signature check',
  },
  'notify-job-filled': {
    mechanism: /x-webhook-secret/i,
    why: 'invoked by the on_job_filled DB trigger via pg_net with a Vault secret',
  },
  'notify-job-matches': {
    mechanism: /x-webhook-secret/i,
    why: 'invoked by the on_job_activated_notify_matches DB trigger via pg_net with a Vault secret',
  },
  'send-followup-emails': {
    mechanism: /x-webhook-secret/i,
    why: 'cron-invoked; no user context',
  },
  'get-resend-stats': {
    mechanism: /x-webhook-secret/i,
    why: 'cron-invoked poller; no user context',
  },
  'lead-harvest': {
    mechanism: /x-webhook-secret/i,
    why: 'cron-invoked via pg_net; no user context',
  },
  'lead-intake': {
    mechanism: /jwtVerify|createRemoteJWKSet/,
    why: 'verify_jwt=false, so it does a real JWKS verification itself — not gateway-trust',
  },
  'lead-draft-email': {
    mechanism: /jwtVerify|createRemoteJWKSet/,
    why: 'does its own JWKS verification + admin role check',
  },
  'get-applicant-document-url': {
    mechanism: /payload\.aud !== 'authenticated'/,
    why: 'the original reference implementation; inlines the same chain the helper extracts',
  },
  'send-document-status-email': {
    mechanism: /payload\.aud !== 'authenticated'/,
    why: 'inlines the gateway-trust decode plus an admin role gate',
  },
}

describe('every service-role Edge Function authorizes its caller', () => {
  const serviceRoleFns = functionNames.filter((fn) =>
    /SUPABASE_SERVICE_ROLE_KEY/.test(sourceOf(fn)),
  )

  it('finds the service-role functions (guards against a vacuous pass)', () => {
    expect(serviceRoleFns.length).toBeGreaterThan(5)
  })

  it.each(serviceRoleFns)('%s checks the caller', (fn) => {
    const src = sourceOf(fn)
    const exception = NON_USER_INVOKED[fn]

    if (exception) {
      expect(
        src,
        `${fn} is allowlisted as non-user-invoked (${exception.why}) but its stated auth ` +
          `mechanism is missing. Either restore it or remove the allowlist entry.`,
      ).toMatch(exception.mechanism)
      return
    }

    expect(
      src,
      `${fn} uses the service-role key (RLS bypassed) but does not import the shared caller ` +
        `authorization helper. Import from '../_shared/auth.ts' and call requireCaller() plus ` +
        `the appropriate ownership check — or, if it is genuinely not user-invoked, add it to ` +
        `NON_USER_INVOKED with the mechanism that gates it.`,
    ).toMatch(/from '\.\.\/_shared\/auth\.ts'/)
    expect(src).toMatch(/requireCaller\(/)
  })
})

describe('the four audited functions use the correct ownership check', () => {
  // Each entry is the check appropriate to that function's ACTUAL caller. Getting this
  // wrong is not a no-op: the Phase 1 plan originally specified requireEmployerOwnsJob for
  // generate-match-explanation, which is seeker-invoked — that would have 403'd every
  // seeker on the job-detail page.
  const EXPECTED: Record<string, RegExp> = {
    'generate-candidate-summary': /requireEmployerOwnsApplication\(/,
    'generate-match-explanation': /requireSeekerOwnsProfile\(/,
    'acknowledge-placement-fee': /requireEmployerOwnsApplication\(/,
    'create-payment-intent': /requireEmployerOwnsJob\(/,
    // Fifth function — not on the audit's remediation list; this suite found it.
    'create-placement-invoice': /requireEmployerOwnsApplication\(/,
  }

  it.each(Object.entries(EXPECTED))('%s', (fn, check) => {
    expect(sourceOf(fn)).toMatch(check)
  })

  it.each(Object.keys(EXPECTED))('%s authorizes before reading any data', (fn) => {
    const src = sourceOf(fn)
    const authAt = src.search(/require(Caller|EmployerOwns|SeekerOwns)/)
    const firstRead = src.search(/\.from\(\s*'(applications|seeker_profiles|match_scores|jobs)'/)
    expect(authAt).toBeGreaterThan(0)
    if (firstRead > 0) {
      expect(
        authAt,
        `${fn} reads tenant data before authorizing the caller — the service-role client ` +
          `bypasses RLS, so ordering is a security property here, not style.`,
      ).toBeLessThan(firstRead)
    }
  })
})

describe('tenant ids are derived server-side, not trusted from the request body', () => {
  // The 403 alone is not the fix. Substituting the SERVER's job_id/employer_id/seeker_id for
  // the client's is what actually closes the cross-tenant read.
  it('acknowledge-placement-fee derives employer/job/seeker from the application', () => {
    const src = sourceOf('acknowledge-placement-fee')
    expect(src).toMatch(/employer_id = owned\.employerId/)
    expect(src).toMatch(/job_id = owned\.jobId/)
    expect(src).toMatch(/seeker_id = owned\.seekerId/)
  })

  it('create-payment-intent derives employer_id from the caller', () => {
    expect(sourceOf('create-payment-intent')).toMatch(/employer_id = owned\.employerId/)
  })

  it('generate-candidate-summary derives job/seeker from the application', () => {
    const src = sourceOf('generate-candidate-summary')
    expect(src).toMatch(/job_id = owned\.jobId/)
    expect(src).toMatch(/seeker_id = owned\.seekerId/)
  })
})

describe('the shared helper keeps its safety properties', () => {
  const auth = readFileSync(resolve(FN_DIR, '_shared/auth.ts'), 'utf8')

  it('validates the token audience, not just its presence', () => {
    expect(auth).toMatch(/payload\.aud !== 'authenticated'/)
  })

  it('never calls auth.getUser on a service-role client (BFIX-05 / CLAUDE.md §5)', () => {
    // Strip comments first — the module's own header documents WHY that call must not be
    // made, and matching the warning would be a false positive.
    const code = auth
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n')
    expect(code).not.toMatch(/auth\.getUser\(/)
  })

  it('resolves employer identity via employer_profiles, not auth.uid directly', () => {
    // jobs.employer_id references employer_profiles.id — conflating it with a user id is a
    // known recurring bug in this codebase.
    expect(auth).toMatch(/from\('employer_profiles'\)/)
  })

  it('returns opaque failures so probing cannot distinguish causes', () => {
    expect(auth).toMatch(/Invalid auth token/)
  })
})

// Every remote import carries a version.
//
// `generate-candidate-summary` and `generate-match-explanation` imported
// 'https://esm.sh/@anthropic-ai/sdk' with NO version at all, while every other esm.sh import in
// the tree was pinned. A deployed function therefore tracked whatever esm.sh resolved on the day
// it was deployed, so its behaviour could change without a commit. Those are also the two
// functions that spent weeks calling a model that returned 404, inside a catch that swallowed it
// into a null — silent drift here has form, which is why this is a gate and not a convention.
describe('remote imports are pinned', () => {
  const allSources = readdirSync(FN_DIR, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.ts'))
    .map((d) => ({
      path: `${d.parentPath ?? d.path}/${d.name}`.slice(FN_DIR.length + 1),
      src: readFileSync(resolve(`${d.parentPath ?? d.path}`, d.name), 'utf8'),
    }))

  it('finds sources to check', () => {
    expect(allSources.length).toBeGreaterThan(0)
  })

  it.each(allSources.map((f) => f.path))('%s pins every remote import', (path) => {
    const src = allSources.find((f) => f.path === path)!.src
    // A pinned specifier has an @version after the package name: esm.sh/pkg@1, esm.sh/@scope/pkg@2.
    const unpinned = [...src.matchAll(/https:\/\/esm\.sh\/(@?[^'"\s]+)/g)]
      .map((m) => m[1])
      .filter((spec) => {
        const withoutScope = spec.startsWith('@') ? spec.slice(1) : spec
        return !withoutScope.includes('@')
      })
    expect(unpinned).toEqual([])
  })
})

