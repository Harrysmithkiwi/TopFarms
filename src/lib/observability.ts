import type * as SentryTypes from '@sentry/react'

// Observability — audit finding F-A2 (P1): before this, TopFarms had NO error tracking of
// any kind. ~59 console.error calls wrote to a console nobody reads in production, so a
// launch-day regression could run for days undetected.
//
// Gated on VITE_SENTRY_DSN: with no DSN this module is a complete no-op, so it is safe to
// ship before the Sentry project exists. Same idiom as the Vercel Analytics host-gate.
//
// LOADED LAZILY, deliberately. Measured 2026-07-30: statically importing @sentry/react
// costs +32 kB gzip on the main chunk (204.29 → 236.55). Vite dead-code-eliminates it when
// the DSN is unset, which means CI's bundle budget measures the *unconfigured* build and
// would never see that cost — the budget gate would stay green while real users paid it.
// This audience is on rural connections (audit D2), so the landing chunk stays lean and
// Sentry arrives a few ms later out-of-band.
//
// Accepted tradeoff: errors thrown in the window before the chunk resolves are missed.
// Almost all real errors are interaction-driven, well after that window.

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

/** Resolved Sentry module once loaded; null until then (or forever, with no DSN). */
let sentry: typeof SentryTypes | null = null

/**
 * PII scrubbing. TopFarms holds seeker phone/email, visa status, and identity documents;
 * the whole privacy posture depends on not shipping any of it to a third party by accident.
 * Deny-by-default: drop request bodies wholesale, then redact anything that looks like a
 * seeker identifier from the remaining strings.
 */
const SENSITIVE_KEYS =
  /email|phone|visa|passport|first_name|last_name|contact|address|dob|date_of_birth|nzbn|document_url|storage_path/i

function scrub(value: unknown, depth = 0): unknown {
  // Depth 10, not 6: a console breadcrumb nests breadcrumbs → item → data → arguments →
  // arg object → string, and the old limit returned the remainder UNSCRUBBED — a
  // fail-open exactly where the deepest payloads live.
  if (depth > 10 || value == null) return value
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? '[redacted]' : scrub(v, depth + 1)
    }
    return out
  }
  if (typeof value === 'string') {
    return value
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
      .replace(/\b(?:\+?64|0)[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}\b/g, '[phone]')
  }
  return value
}

/**
 * Redact an outgoing event in place.
 *
 * Exported for tests. Verified against a REAL captured envelope from prod on 2026-08-16
 * (a deliberate probe error carrying a fake email and phone), which is how the gap below
 * was found: `beforeSend` scrubbed only `extra` and `contexts`, so the same email and
 * phone travelled unredacted in THREE other places — the exception message, the console
 * breadcrumb, and the breadcrumb's raw arguments. ~59 console.error calls feed that path,
 * all shaped `console.error('context', err)`, so any error whose message quotes a seeker's
 * details was shipping them to a third party.
 *
 * Scrub every free-text carrier, not a list of the ones we happened to think of.
 */
export function scrubEvent(event: SentryTypes.ErrorEvent): SentryTypes.ErrorEvent {
  // Request bodies can contain an entire seeker profile — never send them.
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
    if (event.request.query_string) event.request.query_string = '[redacted]'
    // The path itself can carry an identifier even with the query string gone.
    if (event.request.url) event.request.url = scrub(event.request.url) as string
  }

  // Identify the user by opaque id only.
  if (event.user) event.user = { id: event.user.id }

  // The exception's own message. This is the one that mattered most: it is the headline
  // Sentry shows for the issue, so unredacted PII would be the first thing on screen.
  if (event.exception?.values) {
    for (const value of event.exception.values) {
      if (value.value) value.value = scrub(value.value) as string
    }
  }

  if (event.message) event.message = scrub(event.message) as string

  // Breadcrumbs carry every console.* call and every fetch URL leading up to the error.
  if (event.breadcrumbs) {
    event.breadcrumbs = scrub(event.breadcrumbs) as typeof event.breadcrumbs
  }

  if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>
  if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts

  return event
}

/**
 * Which environment an event came from, derived from the HOST rather than the build mode.
 *
 * `import.meta.env.MODE` is 'production' for every `vite build` — including the preview
 * deploy Vercel makes for each pull request. So if the DSN reaches a preview build at all,
 * preview noise lands in the production environment and dilutes exactly the signal the
 * first real employer will generate. Reading the host is true regardless of how the env var
 * happens to be scoped in Vercel, which is the point: it cannot silently regress when
 * somebody re-scopes a variable in a dashboard this code cannot see.
 *
 * Exported for tests.
 */
export function resolveEnvironment(hostname?: string): string {
  const host = hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname)
  if (host === 'www.topfarms.co.nz' || host === 'topfarms.co.nz') return 'production'
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return 'development'
  return 'preview'
}

export function initObservability(): void {
  if (!DSN) return // no DSN configured — stay inert rather than half-initialised

  void import('@sentry/react')
    .then((Sentry) => {
      sentry = Sentry
      initSentry(Sentry)
    })
    .catch(() => {
      // Never let the reporter break the app it is reporting on.
    })
}

function initSentry(Sentry: typeof SentryTypes): void {
  Sentry.init({
    dsn: DSN,
    environment: resolveEnvironment(),
    // Errors only. No session replay, no profiling: both capture DOM/network content and
    // would defeat the scrubbing above. Revisit only with a deliberate privacy review.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    integrations: [
      // The codebase already logs ~59 console.error calls in fetch/mutation failure paths,
      // all shaped `console.error('context', err)`. Capturing them here closes the finding
      // in one line rather than mechanically rewriting 30 files — and, unlike a one-off
      // migration, it also catches every console.error written from now on. reportError()
      // below stays available for new code that wants tags and structured extra.
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],
    beforeSend: scrubEvent,
  })

  // A session that resolved before this chunk landed set an id we could not apply yet.
  if (pendingUserId) Sentry.setUser({ id: pendingUserId })
}

/**
 * Lift the diagnostic fields a Supabase error carries beside its message.
 *
 * A PostgrestError is `{ message, code, details, hint }` — and `code` is usually the fastest
 * route to the cause (42501 is a missing grant, 42703 a dropped column, PGRST116 no rows). Only
 * `message` survives into the Sentry title, so without this every call site would have to pass
 * the rest by hand and most would forget. Errors proper are left alone: their `code` means
 * something else entirely.
 *
 * Exported for tests.
 */
export function errorMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || value instanceof Error) return {}
  const { code, details, hint } = value as Record<string, unknown>
  return Object.fromEntries(Object.entries({ code, details, hint }).filter(([, v]) => v != null))
}

/**
 * Coerce anything throwable into an Error with a readable message.
 *
 * `String(value)` on a plain object yields '[object Object]', and a Supabase PostgrestError IS a
 * plain object — which is how Sentry TOPFARMS-WEB-7 arrived as "Error loading profile: [object
 * Object]" and named its symptom while destroying its cause. Fixed here rather than at the call
 * site so the next caller that hands us a rejected fetch or a Postgrest error gets a title too.
 *
 * Exported for tests.
 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  const message = (value as { message?: unknown } | null)?.message
  return new Error(typeof message === 'string' && message ? message : String(value))
}

/**
 * Report a handled error. Use instead of a bare console.error so failures are visible in
 * production, not just in a devtools console nobody has open.
 *
 * @param context short, non-PII description of where this happened ('applicant fetch')
 */
export function reportError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  if (import.meta.env.DEV) console.error(`[${context}]`, error, extra ?? '')
  // Not loaded (no DSN, still resolving, or the chunk failed) — the console.error above
  // is still captured by the console integration once Sentry is up.
  if (!sentry) return
  const merged = { ...errorMeta(error), ...extra }
  sentry.captureException(toError(error), {
    tags: { context },
    extra: Object.keys(merged).length ? (scrub(merged) as Record<string, unknown>) : undefined,
  })
}

/**
 * Tag subsequent events with the signed-in user's opaque id, or clear it on sign-out.
 *
 * Id ONLY. No email, no name, no role — `sendDefaultPii` is false and `scrubEvent` already
 * reduces `event.user` to `{ id }`, so anything else passed here would be dropped anyway;
 * not sending it in the first place is the point (PRODUCT.md privacy posture).
 *
 * Why it matters: without it every production error is anonymous, so "the first employer hit
 * something" cannot be turned into "WHICH employer hit what". That is the difference between
 * an alert and a diagnosis on the day the first real employer arrives.
 *
 * The pending-id dance is load-bearing. Sentry is imported lazily, so on a fast session
 * restore this is called BEFORE the module resolves; without the latch the id would be
 * dropped silently and only sessions slower than the chunk fetch would be identified —
 * an intermittent gap that looks like a Sentry bug rather than a race.
 */
let pendingUserId: string | null = null

export function setUser(userId: string | null): void {
  if (!DSN) return
  pendingUserId = userId
  if (!sentry) return // applied by initSentry once the chunk lands
  sentry.setUser(userId ? { id: userId } : null)
}

/** True when error reporting is actually wired — used by diagnostics, not control flow. */
export const observabilityEnabled = Boolean(DSN)
