# TopFarms pre-launch readiness audit — 2026-08-20

**Score: 46 / 100. Do not launch this week.**

Every number below was measured against live production in this session, not recalled. Where
something is unverified, it says so.

---

## The one-sentence verdict

**TopFarms is a well-engineered product that nobody can currently sign up to, selling to a
market nobody has contacted yet.** The build quality is genuinely high — the score is not low
because the code is bad. It is low because two independent gates are shut: a total signup
failure, and a demand side that has never once run.

---

## Score by dimension

| # | Dimension | Weight | Score | Weighted |
|---|---|---|---|---|
| 1 | Core journey works end to end | 25 | **5** / 25 | 5 |
| 2 | Data layer & security | 15 | 12 / 15 | 12 |
| 3 | Engineering discipline | 15 | 14 / 15 | 14 |
| 4 | Observability & failure visibility | 10 | 7 / 10 | 7 |
| 5 | Email deliverability | 10 | **2** / 10 | 2 |
| 6 | Marketing surface | 10 | 4 / 10 | 4 |
| 7 | Demand-side readiness | 10 | 1 / 10 | 1 |
| 8 | Revenue path proven | 5 | 1 / 5 | 1 |
| | **Total** | **100** | | **46** |

---

## 1. Core journey — 5/25 🔴

**Nobody can complete signup. This is a hard gate and it caps every other number on the page.**

Walked on live prod 2026-08-19. Supabase generates confirmation token `46b4eaf…`; the email
delivers `Fb4eaf…`; the link returns `400 validation_failed`. Pasting the database token into
the same URL verifies instantly — so auth, the token and the template are all fine. Only the
delivered copy is broken.

Mechanism: the message is quoted-printable **decoded twice**. `token=` is transmitted as
`token=3D46b4…`; a second decode reads `=46` as byte `0x46` = `F`. This reproduces the
received string character for character including its length. **Deterministic, not
intermittent** — a hex token always begins with two hex digits, so `=` + 2 hex is always a
valid escape. It hits signup confirmation, password reset, magic link and email change alike.

Everything *past* that gate was walked and works: all 8 onboarding steps, the resume-mid-wizard
path, job publishing, match scoring firing on publish, and the listing visible to an anonymous
visitor. So the product behind the door is sound. The door is locked.

**5/25 rather than 0** because the journey is proven functional once the door opens.

## 2. Data layer & security — 12/15 🟡

Genuinely strong. 113 migrations, 44 RLS policies, column-level grants on the sensitive table,
`_admin_gate()` on admin RPCs, a state machine on application status, storage-path ownership
triggers, and a migration ledger with per-migration verification notes.

Three findings from the live advisor sweep (99 lints total):

- 🟠 **1 ERROR — `marketplace_employer_profiles` is `security_invoker=false`.** Migration 059
  explicitly intended `true`; the live view disagrees, so **the migration's stated intent was
  never achieved**. Blast radius is bounded — I read the view definition: it projects 10
  marketing columns plus a computed boolean, filtered to employers who already have a public
  listing. No `stripe_customer_id`, no `user_id`, no contact details. So this is a **missing
  defence-in-depth layer, not an active leak**. Fix is one `ALTER VIEW`.
- 🟡 **12 tables with RLS enabled and zero policies** — `leads`, `lead_staging`, `placements`,
  `admin_audit_log`, `notification_sends` and others. Deny-by-default is the safe failure mode
  and these are service-role/admin tables, so this is *probably* intentional. **Unverified** —
  nobody has written down that it is intentional, which is how a real gap hides among twelve
  deliberate ones.
- 🟡 **86 WARN: security-definer functions executable by `authenticated`/`anon`.** Expected for
  this architecture (admin RPCs gate internally), but the count means a genuinely
  over-exposed function would not stand out.

## 3. Engineering discipline — 14/15 🟢

The strongest dimension, and it is not close.

**1,013 tests across 123 files**, `tsc -b` clean, `npm run lint` 0 errors at a ratcheted
52-warning pin, `npm run build` clean, CI + E2E on every push, a no-phantom-coverage ratchet,
and live model-ID pinning. Migrations are proven in rolled-back transactions before applying
and verified through `pg_catalog` rather than a success banner.

The culture is visible in the defects it catches: this session alone the discipline surfaced a
grant gap that would have broken the first employer, two dead model IDs hidden inside a
swallowing catch, an unpinned SDK, and a timer that cried wolf on every page load.

Docked 1 point: gate discipline slipped once here — `npx eslint src tests` reported 0 errors on
a tree CI then failed. The project's own command is the gate.

## 4. Observability — 7/10 🟡

Sentry is live in production with PII scrubbing, and it earned its keep immediately: it is how
the onboarding grant bug was found. 27 error sites moved from `console.error` to structured
reporting today, and `reportError` now lifts Postgres `code`/`details`/`hint` so alerts name
their own cause.

Gaps: no Sentry MCP or CLI, so issues must be screenshotted to be read. No `Sentry.setUser`, so
you cannot tell which employer hit an error. And ~59 `console.error` sites remain outside the
employer path.

## 5. Email deliverability — 2/10 🔴

Beyond the corruption bug in §1:

- **~30% bounce rate** (11 of 36 sends). Providers throttle above ~5%; Resend suspends accounts
  that sustain 30%. Still untriaged — operator-owned, two minutes.
- **Auth emails are unbranded Supabase defaults** — *"Follow this link to confirm your user"*.
  To a first employer that reads like phishing.
- Auth email and outreach share one sending reputation, so damage to one damages the other.

Credit where due: SPF, DKIM and DMARC are correctly configured and verified. **Authentication
is not the problem; the message path and list quality are.**

## 6. Marketing surface — 4/10 🟠

- The v12 landing page is built and committed but **not deployed** — prod still serves the old
  design.
- **Artwork is unresolved after two rounds** and the operator has rejected it twice. Current
  state is crops from a 1024px concept PNG, upscaled 2× — as good as those pixels get. Needs a
  higher-resolution source or commissioned art.
- `/for-employers` and `/pricing` are still on the previous design system, so clicking "See
  pricing" from the new page lands in the old world.
- Positives: `/jobs` renders well with an honest empty state, `?role=employer` deep-links work,
  and the accessibility floor is met.

## 7. Demand-side readiness — 1/10 🔴

**0 employers · 0 jobs · 0 applications · 1 seeker · 0 leads contacted.** 132 staged leads, of
which ~51 carry an email address.

Nothing has ever run. The outreach lane is built, the drafting prompt is populated and
CI-guarded, and not one message has been sent. Every feature shipped in the last month serves
an employer who does not exist.

Also: no seeker row has ever been staged, so that fork is a **first run, not a regression
check**, whenever it is exercised.

## 8. Revenue path — 1/5 🔴

The placement-fee model is coded, priced and explained on-screen ($200/$400/$800 bands, free
listings). Stripe is wired with webhook idempotency and a paid-fee-cannot-be-written-off
constraint. **It has never processed a real transaction**, because there has never been a real
listing or hire.

---

## What moves the score fastest

| Action | Owner | Effort | Score impact |
|---|---|---|---|
| Fix the verification link (path-based token) | dev | half a day | **+18** |
| Triage the 11 bounces, suppress them | operator | 2 min | +3 |
| Brand the auth email templates | dev | 1 hour | +3 |
| `ALTER VIEW … security_invoker = true` | dev | 5 min | +2 |
| Document the 12 intentional no-policy tables | dev | 30 min | +1 |
| Deploy the landing page + resolve artwork | both | days | +5 |
| Send the first 10 outreach emails | operator | 1 hour | +6 |
| First real employer posts a real job | operator | — | +8 |

**Realistic ceiling within two weeks: 82–88.** The last 12 points cannot be engineered — they
require a real employer, a real hire and a real invoice.

---

## Confidence statement

**Confidence that the platform works once someone is inside it: high (~85%).** It has been
walked end to end on production and the failures found were fixed and verified.

**Confidence that it is ready to launch today: very low (~10%).** Launching now means sending
outreach to 51 farmers, some fraction of whom click, and *every one of them* hits a broken
verification link and silently leaves. You would burn the list and learn nothing.

**The single highest-value action in the entire project right now is fixing the verification
link.** Nothing else on this page competes.
