import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type Role = 'seeker' | 'employer' | 'admin'

// ESM ("type": "module") — no __dirname; derive from import.meta.url.
export const AUTH_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth')

export function statePath(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`)
}

export function creds(role: Role): { email: string; password: string } | null {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`]
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`]
  return email && password ? { email, password } : null
}

/** True when auth.setup.ts produced a storage state for this role this run. */
export function hasState(role: Role): boolean {
  return fs.existsSync(statePath(role))
}

/**
 * Roles this environment PROMISES to cover, as a comma-separated list.
 *
 * Without this, a missing credential makes every role-gated spec `test.skip` and
 * the run reports green over work it never exercised. That is exactly what
 * happened here: both workflows wired six E2E_* secrets, none of them existed,
 * and the suite passed for months without once signing in.
 *
 * CI sets E2E_REQUIRED_ROLES and a missing credential becomes a hard failure.
 * Locally it is unset, so skipping stays convenient. `admin` is deliberately NOT
 * in CI's list — its credential is a live production admin, and that decision is
 * open (see .planning/design-gate/issues/09-e2e-secrets-in-ci.md).
 */
export function requiredRoles(): Role[] {
  return (process.env.E2E_REQUIRED_ROLES ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean) as Role[]
}

export const SKIP_NO_CREDS = (role: Role) =>
  `${role} credentials not provided (E2E_${role.toUpperCase()}_EMAIL/_PASSWORD) — see playwright.config.ts header`

/**
 * Discover a public job id from the marketplace's own REST response.
 *
 * Phase 5.0b. Production legitimately holds zero jobs, so specs that assert a
 * non-empty marketplace cannot simply pass or simply fail — either choice lies.
 * Discover the state first, then assert fully or skip with a stated reason.
 *
 * This replaces the older approach of filtering the empty state by copy
 * (`hasNotText: 'No jobs match'`), which silently stopped guarding: the
 * unfiltered empty state reads "No jobs listed right now", so the filter matched
 * nothing and the RLS-MKT-01 regression test passed on an empty marketplace for
 * months. Ask the data, not the prose.
 *
 * Returns null when the marketplace is genuinely empty or the query failed.
 */
export async function findPublicJobId(page: import('@playwright/test').Page): Promise<string | null> {
  const responsePromise = page
    .waitForResponse((r) => r.url().includes('/rest/v1/jobs') && r.ok(), { timeout: 15_000 })
    .catch(() => null)
  await page.goto('/jobs')
  const response = await responsePromise
  if (!response) return null
  const rows = (await response.json().catch(() => [])) as { id?: string }[]
  return Array.isArray(rows) ? (rows.find((r) => r.id)?.id ?? null) : null
}

/** Reason string for a skip caused by an empty production marketplace. */
export const SKIP_EMPTY_MARKETPLACE =
  'marketplace holds zero active jobs in this environment — the assertion would be vacuous; ' +
  'this test arms itself as soon as one job is published'
