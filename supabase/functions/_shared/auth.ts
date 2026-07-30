// Shared caller-authorization for Edge Functions — Phase 1 Task 1.1.
//
// WHY THIS EXISTS
// Five Edge Functions hold the service-role key, which bypasses RLS entirely. Using
// service-role is legitimate; using it WITHOUT re-implementing the ownership check RLS
// would have applied is the defect the 2026-07-30 audit found (P0-2, P0-3, F-A4). Four
// functions took `employer_id` / `application_id` / `seeker_id` straight from the request
// body and never checked the caller against any of them, so any signed-up user could read
// and write another tenant's data — including `visa_status`.
//
// The codebase already contained a correct implementation, in
// get-applicant-document-url/index.ts (:82-94 decode, :104-108 role, :161-179 profile,
// :199-211 ownership). It was simply never made reusable, so each new function re-derived
// the problem and four of them got it wrong. This module is that implementation extracted,
// so correctness becomes the default rather than a per-function judgement call.
//
// GATEWAY-TRUST (CLAUDE.md §5)
// For verify_jwt = true functions the Supabase gateway has ALREADY validated the JWT
// signature upstream. Do NOT re-validate with adminClient.auth.getUser(token) — on a
// service-role-keyed client that call routes /auth/v1/user differently and rejects valid
// ES256 tokens (BFIX-05). Decode locally, check `aud`, trust the gateway.
//
// For verify_jwt = false functions the gateway validated NOTHING, so a bearer token
// reaching the handler is unverified. Those functions must do a real JWKS verification
// (see lead-intake/index.ts:285-310) or use an in-function shared secret — NOT this module.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Authorization failure carrying the HTTP status the handler should return. */
export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export type CallerRole = 'employer' | 'seeker' | 'admin'

/**
 * Decode the caller's user id from a gateway-validated JWT.
 *
 * ONLY valid for functions deployed `verify_jwt = true` — it trusts the signature because
 * the gateway already checked it. Never call this from a verify_jwt=false function.
 *
 * @throws AuthError 401
 */
export function requireCaller(req: Request): string {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '')
  if (!token) throw new AuthError(401, 'Missing Authorization header')

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.aud !== 'authenticated') throw new Error('Token audience is not user-scoped')
    const sub = payload.sub
    if (!sub || typeof sub !== 'string') throw new Error('Missing or invalid sub claim')
    return sub
  } catch {
    // Deliberately opaque to the caller: a decode failure and a bad audience are the same
    // 401, so probing cannot distinguish them.
    throw new AuthError(401, 'Invalid auth token')
  }
}

/** Look up the caller's role. Returns null when they have no role row. */
export async function getCallerRole(
  admin: SupabaseClient,
  userId: string,
): Promise<CallerRole | null> {
  const { data, error } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('auth: user_roles lookup failed', error)
    throw new AuthError(500, 'Internal error')
  }
  return (data?.role as CallerRole | undefined) ?? null
}

/** @throws AuthError 403 unless the caller holds one of `allowed`. */
export async function requireRole(
  admin: SupabaseClient,
  userId: string,
  allowed: CallerRole[],
): Promise<CallerRole> {
  const role = await getCallerRole(admin, userId)
  if (!role || !allowed.includes(role)) {
    throw new AuthError(403, 'Caller is not authorised for this action')
  }
  return role
}

/**
 * Resolve the caller's `employer_profiles.id` — the FK every ownership check keys on.
 * NOTE this is deliberately NOT `auth.uid()`: `jobs.employer_id` references
 * `employer_profiles.id`, and conflating the two is a known source of bugs here.
 *
 * @throws AuthError 403
 */
export async function requireEmployerProfileId(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  await requireRole(admin, userId, ['employer'])

  const { data, error } = await admin
    .from('employer_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('auth: employer_profiles lookup failed', error)
    throw new AuthError(500, 'Internal error')
  }
  if (!data?.id) {
    // role=employer with no profile row is a data-integrity problem. 403 rather than
    // surfacing the inconsistency to the caller.
    console.warn('auth: caller has role=employer but no employer_profiles row', { userId })
    throw new AuthError(403, 'Employer profile missing')
  }
  return data.id
}

/**
 * Assert the caller owns `jobId`, and return their employer profile id.
 * @throws AuthError 403/404
 */
export async function requireEmployerOwnsJob(
  admin: SupabaseClient,
  userId: string,
  jobId: string,
): Promise<{ employerId: string }> {
  const employerId = await requireEmployerProfileId(admin, userId)

  const { data, error } = await admin
    .from('jobs')
    .select('id, employer_id')
    .eq('id', jobId)
    .maybeSingle()
  if (error) {
    console.error('auth: jobs lookup failed', error)
    throw new AuthError(500, 'Internal error')
  }
  if (!data) throw new AuthError(404, 'Job not found')
  if (data.employer_id !== employerId) {
    throw new AuthError(403, 'Job does not belong to you')
  }
  return { employerId }
}

/**
 * Assert the caller owns the job this application was made to.
 *
 * Returns the application's own `job_id` and `seeker_id` so callers use the SERVER's values
 * rather than trusting ids from the request body — that substitution is the actual fix for
 * the audit's cross-tenant findings, not the 403 alone.
 *
 * @throws AuthError 403/404
 */
export async function requireEmployerOwnsApplication(
  admin: SupabaseClient,
  userId: string,
  applicationId: string,
): Promise<{ employerId: string; jobId: string; seekerId: string }> {
  const employerId = await requireEmployerProfileId(admin, userId)

  const { data, error } = await admin
    .from('applications')
    .select('id, job_id, seeker_id, jobs!inner ( id, employer_id )')
    .eq('id', applicationId)
    .maybeSingle()
  if (error) {
    console.error('auth: applications lookup failed', error)
    throw new AuthError(500, 'Internal error')
  }
  if (!data) throw new AuthError(404, 'Application not found')

  const job = data.jobs as unknown as { id: string; employer_id: string } | null
  if (job?.employer_id !== employerId) {
    throw new AuthError(403, 'Application does not belong to a job you own')
  }
  return { employerId, jobId: data.job_id, seekerId: data.seeker_id }
}

/**
 * Assert the caller IS the seeker identified by `seekerProfileId`.
 *
 * Used by seeker-initiated functions (e.g. a seeker asking why they match a job). Note the
 * argument is a `seeker_profiles.id`, not a user id — the client holds the profile id, and
 * conflating the two is the schema gotcha that caused LAUNCH.md O8.
 *
 * @throws AuthError 403/404
 */
export async function requireSeekerOwnsProfile(
  admin: SupabaseClient,
  userId: string,
  seekerProfileId: string,
): Promise<{ seekerUserId: string }> {
  const { data, error } = await admin
    .from('seeker_profiles')
    .select('id, user_id')
    .eq('id', seekerProfileId)
    .maybeSingle()
  if (error) {
    console.error('auth: seeker_profiles lookup failed', error)
    throw new AuthError(500, 'Internal error')
  }
  if (!data) throw new AuthError(404, 'Seeker profile not found')
  if (data.user_id !== userId) {
    throw new AuthError(403, 'That profile does not belong to you')
  }
  return { seekerUserId: data.user_id }
}

/**
 * Wrap a handler so AuthError becomes the right HTTP response and anything else becomes a
 * 500 without leaking internals.
 */
export function toAuthErrorResponse(e: unknown, corsHeaders: Record<string, string>): Response {
  const isAuth = e instanceof AuthError
  if (!isAuth) console.error('auth: unexpected error', e)
  return new Response(JSON.stringify({ error: isAuth ? e.message : 'Internal error' }), {
    status: isAuth ? e.status : 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
