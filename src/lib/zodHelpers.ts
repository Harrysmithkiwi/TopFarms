import { z } from 'zod'

/**
 * An optional number field that stays EMPTY when the user leaves it empty.
 *
 * `z.coerce.number().optional()` does not do this. `.optional()` only lets `undefined`
 * through, and an untouched `<input type="number">` registered with plain `register()`
 * submits `''` — not `undefined`. `Number('')` is `0`, so the empty box silently becomes a
 * real zero and is written to a nullable column as `0`.
 *
 * That is not merely wrong data. The match engine (093) branches on `IS NULL` to mean
 * "unknown, score neutrally", so a zero takes the wrong branch in both directions:
 *
 *   seeker leaves min_salary blank       -> 0 -> `salary_max >= 0` is always true
 *                                             -> full 8/8 salary against EVERY job (inflated)
 *   employer leaves salary_max blank     -> 0 -> not null, falls to the penalty branch
 *                                             -> 0/8 against every seeker (deflated)
 *   seeker leaves years_experience blank -> 0 -> scored a rank beginner, not as unknown
 *
 * No crash, no Sentry event, no failing test — it surfaces only as bad matches, which is
 * the one thing the product sells. Verified empirically before the fix: `parse({n:''})`
 * returned `{n:0}`.
 *
 * An explicit `'0'` still parses as `0`. A real zero is a real answer.
 *
 * ponytail: the declared type stays `number | undefined` — identical to what these call
 * sites already assumed — so this is a runtime correction with no type ripple through
 * JobPostingData or the onboarding profile interfaces. The cast is needed because
 * `z.preprocess` widens its INPUT type to `unknown`, which react-hook-form's resolver
 * then refuses to line up with the form's field types.
 *
 * KNOWN CEILING: `''` becomes `undefined`, and supabase-js drops undefined keys from an
 * upsert payload — so clearing a value that was already saved leaves the OLD value in
 * place rather than nulling the column. That is the pre-existing shape for every optional
 * field here, and it is strictly better than writing `0`; a new profile (the case that
 * matters for the first real employer) has no old value, so the column stays NULL.
 * Upgrade path if clearing must persist: emit `null` instead and widen `JobPostingData`
 * plus the onboarding profile types to `number | null | undefined`.
 */
export function optionalNumber(inner: z.ZodNumber = z.coerce.number()) {
  return z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    inner.optional(),
  ) as unknown as z.ZodOptional<z.ZodNumber>
}
