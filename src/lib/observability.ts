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
  if (depth > 6 || value == null) return value
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
    environment: import.meta.env.MODE,
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
    beforeSend(event) {
      // Request bodies can contain an entire seeker profile — never send them.
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        delete event.request.headers
        if (event.request.query_string) event.request.query_string = '[redacted]'
      }
      // Identify the user by opaque id only.
      if (event.user) event.user = { id: event.user.id }
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts
      return event
    },
  })
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
  sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { context },
    extra: extra ? (scrub(extra) as Record<string, unknown>) : undefined,
  })
}

/** True when error reporting is actually wired — used by diagnostics, not control flow. */
export const observabilityEnabled = Boolean(DSN)
