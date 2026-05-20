# Phase 22: Pre-Launch P0 Closure — Research

**Researched:** 2026-05-20
**Domain:** Diagnostic bug-fix phase across 4 subsystems (auth toast plumbing / PostgREST query construction / DB schema-vs-types drift / docs hygiene)
**Confidence:** HIGH

## Summary

This is a diagnostic-grade research pass for 5 P0 launch-blocker bugs surfaced by the 2026-05-19 pre-launch gap analysis, plus 1 docs-hygiene item. The phase is NOT a feature-development phase — it is root-cause investigation + targeted fixes against an existing codebase (TopFarms Vite + React Router v7 SPA on Supabase Postgres).

**Three of the five P0 bugs trace to schema-vs-frontend drift** (HOMEBUG-01, HOMEBUG-02, HOMEBUG-03, UXBUG-01 are all in this family). Two of those four (HOMEBUG-01, UXBUG-01) are already code-side closed per `.planning/STATUS-2026-05-03.md` — production E2E confirmation is the only remaining work. The other two (HOMEBUG-02, HOMEBUG-03) have specific code defects that this research has narrowed to single lines.

**One bug (SIGNUP-01) is auth-flow toast plumbing.** Investigation shows the toast invocation IS being called (`SignUp.tsx:88: toast.error(result.error.message)`); the failure mode is either (a) the Supabase `email_address_invalid` error is not being surfaced as `result.error` (it's swallowed somewhere in `signUpWithRole`), OR (b) Sonner's `richColors` + default `duration: 4000ms` is dismissing the toast before the user reads it. Research has narrowed this to a 2-hypothesis decision tree the planner can split between Wave 0 diagnostic + Wave 1 fix.

**The MAIL-01/02 "flip" item is OBSOLETE.** Phase 15-02 was executed 2026-05-03 evening (NOT deferred as the phase description claims) and REQUIREMENTS.md already shows MAIL-01/02 at `[x]` with full §7 evidence. The 22-05 plan should be reframed from "run plan 15-02 E2E + flip" to "verify the existing flip is sound + check for any docs-state drift" — likely a 10-minute audit, not a re-fire.

**Primary recommendation:** Wave 1 fixes one-line / few-line defects in parallel (3 plans); Wave 2 is a single operator-action prod UAT batch covering all 5 P0 verifications; Wave 3 collapses to a brief MAIL-01/02 audit (the flip is already done). Per CLAUDE §3, every Wave 1 plan must include a pre-fix diagnostic step that empirically confirms root cause before code change.

<user_constraints>
## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 22 yet. The phase description in `.planning/ROADMAP.md:396-426` constrains scope:

### Locked Decisions (from ROADMAP.md Phase 22 §Scope)
- **6 scope items only:** SIGNUP-01, HOMEBUG-02, HOMEBUG-03, HOMEBUG-01, UXBUG-01, MAIL-01/02 flip
- **5 plans only:** Wave 1 (22-01/02/03) + Wave 2 (22-04) + Wave 3 (22-05)
- **Wave structure:** 3 parallel autonomous plans → operator-action prod UAT batch → docs hygiene
- **Phase 22 blocks v2.0 milestone close alongside PEND-01** — both must land before `/gsd:complete-milestone v2.0`
- **Operator priority:** top-of-funnel breakers first (SIGNUP-01, HOMEBUG-02, HOMEBUG-03 over HOMEBUG-01, UXBUG-01)
- **Per CLAUDE §3:** Wave 1 plans MUST investigate root cause before fix
- **Per CLAUDE §4:** Push to main between Wave 1 and Wave 2 requires explicit operator authorization (Wave 2 plan MUST include a STOP gate)
- **Out of scope:** PEND-01 Stripe live-mode swap (operator's separate session); P2/P3 items

### Claude's Discretion
- Diagnostic depth before fix in each Wave 1 plan
- Specific commit / test-scaffolding pattern (precedent: prior phases use Wave 0 vitest stubs + Wave 1 RED→GREEN)
- Whether HOMEBUG-02 fix is a 1-line column-value swap or a wider audit of `listing_tier` usage
- Whether HOMEBUG-03 fix requires a new DB column, a JSONB key rename, or pure FE remapping
- Test-scaffold scope for SIGNUP-01 (RTL on SignUp page is non-trivial because of Sonner Toaster mount + RHF + Zod; may justify a single integration test instead of pure unit)

### Deferred Ideas (OUT OF SCOPE)
- PEND-01 Stripe live-mode swap — operator's separate session
- Any P2/P3 bug items not in the 6-item scope
- Refactoring `listing_tier` column to text (if 22-02 fix is the simpler "pass ints not strings" approach)
- Any further Edge Function / Resend chain work (MAIL-01/02 already empirically closed 2026-05-03)
- Items deferred from Phase 18 (modal applicant picker UX, salary preset chips, etc.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **SIGNUP-01** | Signup form silently swallows `email_address_invalid` from Supabase | §1 SIGNUP-01 diagnosis identifies 2 hypotheses (toast.error wrapped by signUpWithRole non-AuthError path; Sonner default duration) — both falsifiable via Wave 0 diagnostic. Fix candidates: replace `toast.error(...)` with `toast.error(..., { duration: Infinity, closeButton: true })`; ensure `signUpWithRole` propagates Supabase auth errors as AuthError into `result.error`. |
| **HOMEBUG-02** | Home page `jobs?select=...` query returns 400 | §2 HOMEBUG-02 diagnosis isolates the bug to `FeaturedListings.tsx:133` `.in('listing_tier', ['featured', 'premium'])` — `listing_tier` is `int NOT NULL DEFAULT 1` in 001_initial_schema.sql:129. Postgres rejects string→int cast (22P02). Fix: pass integers (`[2, 3]`) OR introduce a text listing_tier (out of scope per Claude discretion). |
| **HOMEBUG-03** | FilterSidebar Couples + Accommodation filters trigger backend errors on `/jobs` | §3 HOMEBUG-03 diagnosis traces a 3-layer mismatch: FilterSidebar emits `accommodation_type` URL param values `['couples', 'family', ...]` (lowercase, snake_case); JobSearch handler calls `.overlaps('employer_profiles.accommodation_extras', ...)` with the raw param values; live DB stores Title Case strings (`'Couples welcome'`, `'Family welcome'`) per migration 013. Three fix options identified — Claude's discretion (Layer 1 / Layer 2 / Layer 3 fix). |
| **HOMEBUG-01** | Home page `get_platform_stats` RPC — schema remediated, production E2E pending | §4 HOMEBUG-01 verification — migration 012 was phantom-applied; remediated 2026-05-03 BLOCK 3 §2. Function present in schema (per STATUS-2026-05-03.md). Production E2E is the only remaining work. |
| **UXBUG-01** | Accommodation chips schema/types drift — code shipped, production E2E pending | §5 UXBUG-01 verification — `Step4Accommodation.tsx` shipped with `accommodation_extras` reads in commit `d5e8dfc` (per REQUIREMENTS.md:77). Production E2E is the only remaining work. |
| **MAIL-01** | Resend DKIM/SPF — closed 2026-05-03 evening per Phase 15-02 evidence | §6 — REQUIREMENTS.md:18 already shows `[x]` with `Authentication-Results: dkim=pass; spf=pass; dmarc=pass` evidence. Phase 22 scope item 6 is obsolete; audit only. |
| **MAIL-02** | notify-job-filled trigger fire — closed 2026-05-03 evening per Phase 15-02 evidence | §6 — REQUIREMENTS.md:19 already shows `[x]` with pg_net 200 + per-applicant 4/4 correct + DKIM-signed delivery. Phase 22 scope item 6 is obsolete; audit only. |
</phase_requirements>

## Standard Stack

This is a diagnostic phase against existing stack; no new libraries are required. Confirmed in-use libraries:

### Core (existing — no new install)

| Library | Version (live) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sonner` | ^1.x (`toast.error` API) | Toast notifications (SIGNUP-01 surface) | Mounted at `src/main.tsx:297` `<Toaster position="top-right" richColors />` |
| `@supabase/supabase-js` | ^2.x | DB queries, auth, RPC | All HOMEBUG-* surfaces and SIGNUP-01 auth flow use it |
| `react-hook-form` + `@hookform/resolvers/zod` + `zod` | (existing) | SignUp form validation | SIGNUP-01 — form-side errors handled via RHF; auth-side errors via `toast.error()` |
| `react-router` v7 | (existing) | SPA routing — `useNavigate`, `useSearchParams` | HOMEBUG-03 URL-state-driven filter is built on `useSearchParams` |
| `vitest` + `@testing-library/react` | (existing) | Tests | All Wave 0 test scaffolds use this pair |

### Supporting (existing — read-only references)

| Library | Purpose | When Touched |
|---------|---------|--------------|
| `@radix-ui/react-slider` | Salary range slider in FilterSidebar | Read-only — unrelated to bugs |
| `@radix-ui/react-dialog` | Modals (MarkFilledModal etc.) | Out of scope |

### Alternatives Considered

None — Phase 22 is a fix-existing-bugs phase, not a tool selection.

## Architecture Patterns

### File-System Layout (relevant subset)

```
src/
├── pages/
│   ├── auth/
│   │   └── SignUp.tsx                  # SIGNUP-01 surface (line 88: toast.error call)
│   ├── jobs/
│   │   └── JobSearch.tsx               # HOMEBUG-03 handler layer (line 215: .from('jobs') select; line 273-279: accommodation filter)
│   ├── Home.tsx                        # HOMEBUG-01 + HOMEBUG-02 entry (composes CountersSection + FeaturedListings)
│   └── onboarding/steps/
│       └── Step4Accommodation.tsx      # UXBUG-01 surface (line 64: accommodation_extras chips)
├── components/
│   ├── landing/
│   │   ├── CountersSection.tsx         # HOMEBUG-01 surface (line 48: get_platform_stats RPC call)
│   │   └── FeaturedListings.tsx        # HOMEBUG-02 surface (line 133: listing_tier .in(...) — DEFECT LINE)
│   └── ui/
│       └── FilterSidebar.tsx           # HOMEBUG-03 UI emission layer (lines 43-49: ACCOMMODATION_OPTIONS — DEFECT VALUES)
├── contexts/
│   └── AuthContext.tsx                 # SIGNUP-01 supporting (line 150: signUpWithRole — propagates auth errors)
└── main.tsx                            # Toaster mount (line 297) — relevant to SIGNUP-01 diagnosis

supabase/
├── migrations/
│   ├── 001_initial_schema.sql          # listing_tier int NOT NULL DEFAULT 1 (line 129)
│   ├── 012_platform_stats_rpc.sql      # get_platform_stats RPC (reconciled 2026-05-03)
│   └── 013_phase8_wizard_fields.sql    # accommodation_extras text[] migration (reconciled 2026-05-03)
└── functions/notify-job-filled/index.ts # MAIL-02 surface (NO CHANGES — already closed)
```

### Pattern 1: SIGNUP-01 — Sonner Toast Diagnosis Two-Hypothesis Decision Tree

**Hypothesis A — toast.error IS called but Sonner auto-dismisses too fast.**
- Sonner default `duration` is 4000ms. `richColors` flag is set (`main.tsx:297`) — does not affect duration.
- User-experienced symptom matches: "button reverts to 'Create account' with no toast or visible feedback" (REQUIREMENTS.md:103). If toast dismissed before user looks, this matches verbatim.
- Diagnostic: open `/signup`, submit `*@example.com`, watch for toast flash at top-right. Use DevTools Network tab to confirm Supabase returns 400 with `email_address_invalid`.
- Fix: `toast.error(result.error.message, { duration: Infinity, closeButton: true })` OR a longer fixed duration (10000+ ms).

**Hypothesis B — signUpWithRole swallows the AuthError; `result.error` is null/undefined for `email_address_invalid`.**
- Evidence supporting: `signUpWithRole` (AuthContext.tsx:150-194) returns `result = supabase.auth.signUp(...)` directly when no defensive backfill runs. Supabase auth-js v2 returns `{ data, error }` shape — `email_address_invalid` SHOULD land in `result.error`.
- BUT: the defensive backfill path (AuthContext.tsx:169-191) constructs a NEW `AuthError` for the `role_backfill_failed` case but does NOT re-wrap the signup error. The signup error returns straight through. So Hypothesis B is unlikely — unless `supabase.auth.signUp({ email: '*@example.com' })` somehow rejects-with-throw (instead of resolving-with-error-shape) and `onSubmit`'s `try/catch` block hits `catch { toast.error('An unexpected error occurred...') }` instead of the named error path.
- Diagnostic: add a `console.log('signUp result:', result)` immediately before `if (result.error)` to inspect runtime shape. OR open DevTools Console while testing — check whether 'An unexpected error occurred' fires.

**Recommended Wave 1 plan structure:**
1. Wave 0 diagnostic: write a single integration test that mounts `<SignUp>` inside `<AuthProvider>` + a real Sonner `<Toaster>` and asserts that submitting an invalid-email-format triggers `toast.error` call (mock `supabase.auth.signUp` to return `{ data: {...}, error: new AuthError('email_address_invalid', 400) }`). Sources: tests/saved-search-modal.test.tsx + tests/admin-login.test.tsx precedent for Sonner-aware RTL tests.
2. Wave 1 fix: ensure both hypotheses are addressed by ONE code change — toast with `duration: Infinity, closeButton: true` AND `console.log` removed AND a guard against the auth-js throw path (e.g. always log raw error in catch block).

### Pattern 2: HOMEBUG-02 — `listing_tier` Type Mismatch

**Root cause (HIGH confidence):**
- `001_initial_schema.sql:129`: `listing_tier int NOT NULL DEFAULT 1`
- No migration changes the type to text in 002-033 (verified via `grep -n "listing_tier" supabase/migrations/*.sql`)
- `FeaturedListings.tsx:133`: `.in('listing_tier', ['featured', 'premium'])` — STRING values passed to int column.
- PostgREST: this generates `GET /rest/v1/jobs?listing_tier=in.("featured","premium")` → Postgres returns 400 with code `22P02` (invalid_text_representation): `invalid input syntax for type integer: "featured"`.

**Supporting evidence:**
- `getTierBadge` helper (FeaturedListings.tsx:33-38) handles BOTH int (`t === '3'`) and string (`t === 'premium'`) forms, suggesting prior confusion / partial migration.
- Sibling code at `EmployerDashboard.tsx:114`, `JobDetail.tsx:170` etc. read `listing_tier` without `.in()` filters, so the bug is isolated to FeaturedListings.

**Fix options (Claude's discretion):**
1. **Simplest (1-line, recommended):** Change line 133 to `.in('listing_tier', [2, 3])` — `2 = featured`, `3 = premium` per the badge helper convention. Sibling `getTierBadge` already supports int form.
2. **Wider:** Audit all `listing_tier` consumers and either migrate the column to text OR add a CHECK constraint enforcing the int mapping. Out of scope for Phase 22.

**Pitfall:** Don't conflate `listing_tier` with `status` (used in `.eq('status', 'active')` at line 132 — that's a separate text column).

### Pattern 3: HOMEBUG-03 — Accommodation Filter 3-Layer Mismatch

**Layer 1 (UI emission) — FilterSidebar.tsx:43-49:**
```ts
const ACCOMMODATION_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'pet_friendly', label: 'Pet-friendly' },
  { value: 'couples', label: 'Couples welcome' },     // emits lowercase 'couples'
  { value: 'family', label: 'Family-friendly' },      // emits 'family'
]
```
Each checkbox toggle calls `toggleMultiValue('accommodation_type', ...)` which sets URL param `?accommodation_type=couples&accommodation_type=family` etc.

**Layer 2 (handler accept) — JobSearch.tsx:276-279:**
```ts
const accommodationTypes = searchParams.getAll('accommodation_type')
if (accommodationTypes.length > 0) {
  query = query.overlaps('employer_profiles.accommodation_extras', accommodationTypes)
}
```
Passes the raw URL values straight to PostgREST `.overlaps()`. Generates `employer_profiles.accommodation_extras=ov.{couples,family}`.

**Layer 3 (table column) — migration 013_phase8_wizard_fields.sql:30-37:**
```sql
UPDATE public.employer_profiles SET accommodation_extras = ARRAY[]::text[]
  || CASE WHEN accommodation_couples = true THEN ARRAY['Couples welcome'] ELSE ARRAY[]::text[] END
  || CASE WHEN accommodation_family = true THEN ARRAY['Family welcome'] ELSE ARRAY[]::text[] END
  ...
```
Column stores Title Case display strings: `'Couples welcome'`, `'Family welcome'`, `'Pets allowed'`, `'Utilities included'`, etc. Confirmed by `src/types/domain.ts:327-336` `ACCOMMODATION_EXTRAS_OPTIONS` which lists the same Title Case strings (consumed by `Step4Accommodation` chips — these are the SAME values written to DB by employer onboarding).

**Mismatch:** UI filter emits `'couples'`; DB stores `'Couples welcome'`. `.overlaps()` will return zero rows OR 400 depending on Postgres array operator behavior. Per gap analysis "trigger backend errors" — the 400 is the most likely outcome if any other filter coupling fails.

**Note on "Couples" specifically:** there are TWO domains conflating in the user-visible label:
1. `jobs.couples_welcome boolean` (job-level flag, in jobs table per migration 013:17)
2. `employer_profiles.accommodation_extras` text[] containing `'Couples welcome'` (employer-level flag — applies to all jobs from that employer)

The FilterSidebar lumps both under one "Accommodation" section. This is a SEMANTIC ambiguity in the filter UX, but the immediate 400 is just the case-mismatch.

**Fix options (Claude's discretion):**
1. **Simplest (Layer 1 fix):** Change FilterSidebar.tsx:47-48 `value` strings to match DB form: `{ value: 'Couples welcome', label: 'Couples welcome' }` etc. — URL params become Title Case (ugly but functional).
2. **Cleanest (Layer 2 fix):** Add a value-mapping table in JobSearch.tsx that translates `'couples' → 'Couples welcome'` before passing to `.overlaps()`.
3. **DB-driven (Layer 3 fix):** Migrate the column to canonical snake_case values, update all writers (Step4Accommodation chip values + Title Case display in employer profile preview). Out of scope (cross-cutting).

**Recommendation:** Layer 2 fix — keeps URL params concise, isolates remap to JobSearch handler. Pattern source: similar remap in FilterSidebar.tsx:255-265 herd_size bucket → range conversion.

**Validation:** Run the same `?accommodation_type=couples&accommodation_type=family` URL in DevTools after fix; expect 200 with results.

### Pattern 4: HOMEBUG-01 + UXBUG-01 — Production E2E Verification Protocol

Both are code-side closed (HOMEBUG-01 RPC migration 012 reconciled 2026-05-03; UXBUG-01 frontend committed in `d5e8dfc`). The only remaining work is production smoke.

**Verification recipe:**
1. **HOMEBUG-01:** Open `https://top-farms.vercel.app/` in incognito (anonymous). Expected: `<CountersSection>` renders three counter blocks ("Jobs Posted", "Workers Registered", "Matches Made") with non-zero numbers ticking up (Counters use `useCountUp` from 0 → target over 1800ms). DevTools Network: `POST /rest/v1/rpc/get_platform_stats` returns 200 with body `{ jobs: N, seekers: M, matches: K }`. Failure modes: 404 (RPC missing — re-confirm BLOCK 3 §2 apply), 400 (RPC signature drift), 0 0 0 ticks (RPC returns nulls — coalesce issue).
2. **UXBUG-01:** Sign in as a test employer → navigate to `/onboarding/employer` (or in-progress profile if already started). Step through to **Step 4 Accommodation** (not Step 7 as the original phase description says — Step 7 is `Step7Preview`, which READS accommodation_extras but Step 4 WRITES them; the chips affordance is on Step 4). Expected: 8 ChipSelector chips render: 'Pets allowed', 'Couples welcome', 'Family welcome', 'Utilities included', 'Furnished', 'Garden', 'Garage', 'Internet included' (per `src/types/domain.ts:327-336`). Selecting + saving + reloading the step should round-trip the chips correctly. **Note:** Phase 22 ROADMAP says "Step 7" — this is a doc inconsistency to flag in 22-04 plan. Step 7 in the wizard is the preview; Step 4 is where the chips ARE.

### Anti-Patterns to Avoid

- **Anti-pattern: Re-fire MAIL-01/02 trigger when REQUIREMENTS.md shows it's already done.** Phase 15-02 was executed 2026-05-03 evening; evidence is complete; flipping is done. Re-firing would just produce duplicate emails. The 22-05 plan should be a 10-minute audit of REQUIREMENTS.md + 15-02-SUMMARY.md consistency, not a re-run.
- **Anti-pattern: Push to main between Wave 1 and Wave 2 without operator STOP gate.** Per CLAUDE §4, history-rewriting commands need explicit operator authorization, AND push is the gate event for prod UAT. Plan 22-04 MUST open with an explicit `STOP — operator must authorize push to main before this plan proceeds`.
- **Anti-pattern: Mark HOMEBUG-02 / HOMEBUG-03 fixed without checking prod via the *deployed* `top-farms.vercel.app` URL.** Local dev runs against the same Supabase project (`inlagtgpynemhipnqvty`), so the 400 should reproduce locally — but a "works on localhost" claim isn't sufficient. Vercel preview + prod check is the standard.
- **Anti-pattern: Fix all 3 Wave 1 plans in a single commit.** Per CLAUDE §4, atomic commits — one phase per commit, and within a phase one plan per commit. Each of 22-01/02/03 is its own atomic commit.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sonner toast persistence | Custom modal wrapper around `toast.error` | `toast.error(msg, { duration: Infinity, closeButton: true })` | Sonner already supports persistent toasts via duration prop; closeButton renders a real X affordance |
| Custom PostgREST error parser | Try/catch around `.in()` with regex on error.message | Type-correct the input values (pass int for int column) | Postgres returns precise SQLSTATE codes; better to send valid input than parse output |
| Accommodation value mapper | Stateful Provider for value translation | Module-level `const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = { ... }` in JobSearch.tsx | Pure lookup; no React state needed; ~5 lines |
| Re-implementing 15-02 fire | Studio SQL re-run of `UPDATE jobs SET status='filled'` | Audit existing `15-02-EVIDENCE/` — already complete | Re-fire produces duplicate emails to real test inboxes; existing evidence is canonical |
| Test scaffolding for Sonner from scratch | Mock `sonner` module manually | `vi.mock('sonner', () => ({ toast: { error: vi.fn(), ... }, Toaster: () => null }))` — precedent: `tests/admin-login.test.tsx` | Repo has 5+ files with the canonical mock pattern; copy don't re-invent |

**Key insight:** All 5 P0 bugs have small, well-scoped fixes (1-line to ~10-line changes). The discipline is in the diagnostic-before-fix step (CLAUDE §3) and the prod UAT batch (CLAUDE §4 push gate), NOT in clever code.

## Common Pitfalls

### Pitfall 1: Mistaking the Phase Description's Step 7 for UXBUG-01 Surface
**What goes wrong:** Phase description says "Click through employer onboarding to **Step 7** in prod, confirm chips populate." But the chips are WRITTEN at Step 4 (`Step4Accommodation.tsx:212`), not Step 7. Step 7 (`Step7Preview.tsx`) only READS them in a summary block.
**Why it happens:** Historical confusion in pre-launch gap analysis docs.
**How to avoid:** Plan 22-04 verifies BOTH steps — Step 4 (chips render + are selectable + persist) AND Step 7 (preview shows the selected chips back). Step 4 is where the user-visible breakage would surface; Step 7 is where employer reads back what they entered.
**Warning signs:** If a UAT plan says only "navigate to Step 7", it'll miss the actual write-side bug if any.

### Pitfall 2: Assuming MAIL-01/02 Need a Fresh E2E Fire
**What goes wrong:** Phase 22 description says "Option A — run deferred plan 15-02 E2E". But REQUIREMENTS.md:18-19 shows MAIL-01/02 already `[x]` with full §7 evidence captured 2026-05-03 evening (DKIM=pass headers, pg_net 200, per-applicant 4/4 correct). Re-firing produces duplicate emails to real inboxes + burns ~30 minutes for zero new evidence.
**Why it happens:** Phase 22 description was authored 2026-05-19 from a stale view; the actual Phase 15-02 closure on 2026-05-03 wasn't reflected in the gap analysis source doc.
**How to avoid:** Plan 22-05 should be reframed as: "Audit REQUIREMENTS.md MAIL-01/02 state + 15-02-SUMMARY.md + 13-VERIFICATION.md MAIL-01/02 verdicts — confirm consistency; flag any drift; if all clean, plan output is a single state-confirmation SUMMARY.md with no code/migration changes."
**Warning signs:** Any plan task that says "fire the trigger again" without first reading the existing evidence.

### Pitfall 3: Local Dev "Works on My Machine" Doesn't Close P0
**What goes wrong:** TopFarms dev uses the SAME prod Supabase (`inlagtgpynemhipnqvty`) — there's no separate dev DB. So a fix that "works locally" works against prod data, BUT the production frontend at `top-farms.vercel.app` is built from a specific commit + needs push + Vercel deploy + cache invalidation. Marking a P0 fixed without a `top-farms.vercel.app` browser check is premature.
**Why it happens:** Habit from teams with separate envs.
**How to avoid:** Each Wave 1 plan's verification step must include a deploy-and-verify line referencing the Vercel preview URL OR (per operator priority) the prod URL.
**Warning signs:** Plan verification reads only "vitest GREEN" or "localhost:5173 works".

### Pitfall 4: PostgREST 400 Errors Look Like Code Bugs But Are Often Schema Drift
**What goes wrong:** A `.from('jobs').select(...)` returning 400 LOOKS like a select-clause typo or a missing column, but it's also the symptom of (a) type mismatch in `.in() / .eq()` value, (b) RLS policy rejecting the read, (c) embedded relation hint missing (`!inner` needed), (d) column dropped or never created in prod.
**Why it happens:** PostgREST surfaces SQLSTATE codes in error.code but they're easy to miss in `error.message`.
**How to avoid:** Wave 1 diagnostic step for HOMEBUG-02 / HOMEBUG-03 should run the failing query in DevTools Network, capture both the URL (`?listing_tier=in.(...)` etc.) AND the response body (`error.code = '22P02'` vs `'42703'` vs `'42501'`). The code distinguishes.
**Warning signs:** "It's a 400" without the SQLSTATE = incomplete diagnostic.

### Pitfall 5: Sonner Mount Location Matters for StrictMode
**What goes wrong:** `<Toaster>` at `main.tsx:297` is a SIBLING of `<AuthProvider>` inside `<StrictMode>`. StrictMode double-mounts in dev which can cause `toast.error` to fire twice during a single user action — but only the second is observed. NOT a known issue for prod (StrictMode is dev-only) but can confuse diagnosis.
**Why it happens:** React 18+ StrictMode contract.
**How to avoid:** Diagnose against `pnpm preview` (prod build, no StrictMode double-mount) when testing SIGNUP-01 manually.
**Warning signs:** "Toast fires twice in dev but I see only one" — that's StrictMode.

### Pitfall 6: 011-014 Phantom-Applied Range Aftershocks
**What goes wrong:** Migrations 011/012/013/014 were phantom-applied (registry row present, runtime effect absent) until BLOCK 1/2/3 reconciliation 2026-05-03. HOMEBUG-01 + UXBUG-01 are direct artifacts. HOMEBUG-02 and HOMEBUG-03 are NOT in that family (the underlying columns `listing_tier` from 001 and `accommodation_extras` from 013 are present) — but a planner might over-correct and assume they need re-application.
**Why it happens:** Pattern-matching `*BUG-0X` to the drift family.
**How to avoid:** Plan 22-02 (HOMEBUG-02) opens with an MCP `execute_sql` SELECT to confirm `pg_attribute` shows `listing_tier` is `int4` in live schema; plan 22-03 (HOMEBUG-03) confirms `accommodation_extras` is `text[]` with current values like `'Couples welcome'` (UPPERCASE first letter). Both confirm schema is sound; the bugs are in code.
**Warning signs:** A migration step in Wave 1 plan when no migration is needed.

### Pitfall 7: AuthError vs Generic Error Type Confusion in `signUpWithRole`
**What goes wrong:** `SignUp.tsx:87` checks `if (result.error)` — `result.error` is typed as `AuthError | null` per Supabase auth-js v2. But the defensive backfill path in `AuthContext.tsx:182-188` constructs `new AuthError(...)` with a 500 code and a `role_backfill_failed` code — DIFFERENT from `email_address_invalid` shape. The toast message would say "Account created but role setup failed: ..." instead of "Email address invalid". For SIGNUP-01 specifically, the email-invalid case happens BEFORE the backfill code path, so this isn't the bug — but it's a closely-adjacent failure mode the planner should be aware of.
**Why it happens:** Backfill path wraps in `new AuthError` to preserve the AuthError contract; could mask non-RPC failures if called incorrectly.
**How to avoid:** Wave 0 diagnostic test mocks `supabase.auth.signUp` to return `{ data: { user: null, session: null }, error: { message: 'Unable to validate email address: invalid format', code: 'email_address_invalid' } }` — verifies the error path doesn't go through the backfill branch.

## Code Examples

Verified patterns from this repo. Sources cited.

### Example 1: SIGNUP-01 Fix — Persistent Toast

```tsx
// src/pages/auth/SignUp.tsx (line 82-97 — onSubmit handler)
const onSubmit = async (data: FormValues) => {
  if (!data.role) return
  setIsSubmitting(true)
  try {
    const result = await signUpWithRole(data.email, data.password, data.role)
    if (result.error) {
      // BEFORE: toast.error(result.error.message)
      // AFTER:
      toast.error(result.error.message, {
        duration: Infinity,        // never auto-dismiss
        closeButton: true,         // user-explicit close affordance
      })
    } else {
      navigate('/auth/verify')
    }
  } catch (err) {
    // Defence-in-depth: if signUpWithRole rejects (not just returns error),
    // log the raw error so we don't lose diagnostic info.
    console.error('[SIGNUP-01] signUpWithRole threw:', err)
    toast.error('An unexpected error occurred. Please try again.', {
      duration: Infinity,
      closeButton: true,
    })
  } finally {
    setIsSubmitting(false)
  }
}
```

**Source:** existing `src/pages/auth/SignUp.tsx` (current state in repo) + Sonner v1 API (`duration: Infinity` + `closeButton: true` are documented in https://sonner.emilkowal.ski/toast — verified usage pattern).

### Example 2: HOMEBUG-02 Fix — Pass Ints, Not Strings

```tsx
// src/components/landing/FeaturedListings.tsx (line 130-135 — first .from('jobs') call)
const { data: featuredData } = await supabase
  .from('jobs')
  .select(
    'id, title, region, contract_type, salary_min, salary_max, listing_tier, created_at, shed_type, accommodation, visa_sponsorship, couples_welcome, employer_profiles!inner(farm_name, region, id)'
  )
  .eq('status', 'active')
  .in('listing_tier', [2, 3])  // CHANGED: was ['featured', 'premium'] — listing_tier is int (2=featured, 3=premium)
  .order('created_at', { ascending: false })
  .limit(6)
```

**Source:** Schema fact from `supabase/migrations/001_initial_schema.sql:129`; tier mapping from existing `FeaturedListings.tsx:33-38 getTierBadge` helper (lines 33-38).

### Example 3: HOMEBUG-03 Fix — Layer 2 Value Remap

```tsx
// src/pages/jobs/JobSearch.tsx — module-level constant + handler usage
// Module-level (top of file, near other imports):
const ACCOMMODATION_FILTER_TO_DB: Record<string, string> = {
  couples: 'Couples welcome',
  family: 'Family welcome',
  pet_friendly: 'Pets allowed',
  // 'house' and 'cottage' are accommodation TYPES (employer_profiles.accommodation_type),
  // not extras — see Wave 1 plan 22-03 for the type/extras split decision.
}

// In fetchJobs (replacing lines 276-279):
const accommodationTypes = searchParams.getAll('accommodation_type')
if (accommodationTypes.length > 0) {
  const dbValues = accommodationTypes
    .map((v) => ACCOMMODATION_FILTER_TO_DB[v])
    .filter(Boolean)
  if (dbValues.length > 0) {
    query = query.overlaps('employer_profiles.accommodation_extras', dbValues)
  }
}
```

**Source:** Schema fact from `supabase/migrations/013_phase8_wizard_fields.sql:30-37`; existing remap pattern in `JobSearch.tsx:253-265` (herd_size bucket → range conversion); existing FilterSidebar emission values from `src/components/ui/FilterSidebar.tsx:43-49`.

**Note on `house`/`cottage`:** These are values from `employer_profiles.accommodation_type` (singular, text), NOT from `accommodation_extras` (array). FilterSidebar currently emits all 5 into the same URL param. Plan 22-03 must decide: (a) split into two filter params, or (b) check both columns with `.or()`. This is a Claude's-discretion item the planner should call out.

### Example 4: Vitest Diagnostic Stub Pattern (SIGNUP-01)

```ts
// tests/signup-toast-persistence.test.tsx (Wave 0 RED — Phase 22 plan 22-01)
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Toaster } from 'sonner'
import { MemoryRouter } from 'react-router'
import { SignUp } from '@/pages/auth/SignUp'
import { AuthProvider } from '@/contexts/AuthContext'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Unable to validate email address: invalid format', name: 'AuthError', code: 'email_address_invalid', status: 400 },
      }),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) })),
    rpc: vi.fn(),
  },
}))

describe('SIGNUP-01: toast persistence for email_address_invalid', () => {
  it.todo('renders Sonner toast with persistent duration when supabase rejects email')
  it.todo('toast survives 5+ seconds without auto-dismiss')
  it.todo('toast has a close button affordance')
})
```

**Source:** Sonner mock pattern from `tests/admin-login.test.tsx` (existing Phase 20.1 precedent); `vi.mock` pattern from `tests/saved-search-modal.test.tsx` (existing Phase 17-02 precedent).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MAIL-01/02 `[ ]` partial-close | MAIL-01/02 `[x]` with full §7 evidence | 2026-05-03 evening (Phase 15-02) | Phase 22 scope item 6 is OBSOLETE — audit only |
| `accommodation_pets`/`couples`/`family` booleans on employer_profiles | `accommodation_extras text[]` with Title Case values | 013 phantom-applied → reconciled 2026-05-03 | FilterSidebar still emits old snake_case values; HOMEBUG-03 root cause |
| `listing_tier` as text ('featured'/'premium') | Never changed — always `int NOT NULL DEFAULT 1` | n/a (legacy code drift) | HOMEBUG-02 root cause |
| `Step7Preview` reads dropped booleans | `Step4Accommodation` writes accommodation_extras chips | commit `d5e8dfc` (UXBUG-01 fix shipped) | UXBUG-01 code-side closed; prod E2E pending |
| `get_platform_stats` RPC missing in prod | RPC reconciled via BLOCK 3 §2 (Studio SQL apply) | 2026-05-03 | HOMEBUG-01 code-side closed; prod E2E pending |

**Deprecated/outdated:**
- The original "MAIL-01/02 Option A — run deferred plan 15-02 E2E" framing in Phase 22 description. Already done.
- The phase description's reference to "Step 7" for UXBUG-01 — chips live on Step 4; Step 7 is preview only.

## Open Questions

1. **HOMEBUG-03: should `house`/`cottage` filter values be in scope?**
   - What we know: FilterSidebar's `ACCOMMODATION_OPTIONS` includes `house` and `cottage` (lines 44-45) — but these match `employer_profiles.accommodation_type` (singular, text), NOT `accommodation_extras` (array).
   - What's unclear: Whether the gap analysis "Couples + Accommodation filters trigger backend errors" means ALL 5 options break, or only the 3 that map to extras (`couples`, `family`, `pet_friendly`).
   - Recommendation: Plan 22-03 should treat all 5 as in-scope and either split the filter param OR add an `.or()` branch checking both columns. The simpler fix (Layer 2 remap with split) is recommended.

2. **SIGNUP-01: which hypothesis (A duration vs B AuthError shape) wins on diagnostic?**
   - What we know: Both hypotheses are independently plausible; hypothesis A (Sonner duration) is more likely because `toast.error` IS called and Sonner's default 4000ms duration matches the "button reverts with no visible feedback" symptom verbatim.
   - What's unclear: Whether hypothesis B (auth-js throws instead of returning error shape) ever fires for `email_address_invalid` specifically.
   - Recommendation: Wave 0 diagnostic test should verify BOTH paths (mock signUp to return error vs mock signUp to throw); fix in Wave 1 addresses both via persistent toast + try/catch logging.

3. **Plan 22-04 prod UAT batch — does it open browser-side via chrome-devtools MCP or human operator?**
   - What we know: `.mcp.json` has `chrome-devtools-mcp` configured. CLAUDE §4 requires operator authorization for push to main.
   - What's unclear: Whether the prod UAT itself (loading top-farms.vercel.app, clicking buttons) is operator-driven or agent-driven via chrome-devtools MCP.
   - Recommendation: Operator-driven for the push gate (per CLAUDE §4); agent-driven for the smoke verifications post-push (via chrome-devtools MCP). Two clean phases inside plan 22-04: STOP→push (operator) + verify (agent + MCP).

4. **Plan 22-05 scope — is it a SUMMARY-only plan or does it include any code/doc changes?**
   - What we know: MAIL-01/02 already `[x]`; evidence complete; flip done.
   - What's unclear: Whether there's any drift between REQUIREMENTS.md MAIL-01/02 state and the 13-VERIFICATION.md / 15-02-SUMMARY.md state that needs reconciliation.
   - Recommendation: Quick audit — read REQUIREMENTS.md:18-19 + 15-02-SUMMARY.md + 13-VERIFICATION.md, confirm verdicts agree; write 22-05-SUMMARY.md with the audit findings; if anything is inconsistent, fix that one thing in a 5-minute commit. Likely a single SUMMARY plan.

## Validation Architecture

> nyquist_validation key is absent from `.planning/config.json` → treat as enabled per role spec. This section is REQUIRED.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `vitest` (existing) + `@testing-library/react` for component tests |
| Config file | `vitest.config.ts` (existing — at repo root) |
| Quick run command | `pnpm test <pattern>` (vitest with file pattern) |
| Full suite command | `pnpm test` (runs all vitest specs) |
| Phase gate command | `pnpm test && pnpm exec tsc -b` (vitest GREEN + typecheck clean before phase verification) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIGNUP-01 | Sonner `toast.error` for `email_address_invalid` is persistent (does not auto-dismiss before user reads) | unit + integration (RTL with mocked supabase.auth.signUp) | `pnpm test tests/signup-toast-persistence.test.tsx` | ❌ Wave 0 — create |
| SIGNUP-01 | `signUpWithRole` AuthError path surfaces `email_address_invalid` into `result.error` | integration (mock supabase, assert toast.error called) | same file as above | ❌ Wave 0 — create |
| HOMEBUG-02 | `FeaturedListings.tsx` uses int values for `.in('listing_tier', ...)` | static-source guard (readFileSync + grep `.in('listing_tier', [` pattern; assert NOT `'featured'` literal) | `pnpm test tests/featured-listings-tier-type.test.ts` | ❌ Wave 0 — create |
| HOMEBUG-03 | `JobSearch.tsx` remaps accommodation filter values via lookup table before `.overlaps()` | static-source guard (assert presence of `ACCOMMODATION_FILTER_TO_DB` constant + lookup in fetchJobs) | `pnpm test tests/jobsearch-accommodation-remap.test.ts` | ❌ Wave 0 — create |
| HOMEBUG-01 | `get_platform_stats` RPC exists and returns `{ jobs, seekers, matches }` shape | manual-only — production smoke at top-farms.vercel.app + DevTools Network 200 confirmation | (manual UAT in 22-04 plan) | ❌ Manual — UAT markdown |
| UXBUG-01 | `Step4Accommodation` ChipSelector renders all 8 ACCOMMODATION_EXTRAS_OPTIONS chips; write round-trips | manual-only — production smoke; chip values match `src/types/domain.ts:327-336` | (manual UAT in 22-04 plan) | ❌ Manual — UAT markdown |
| MAIL-01 | DKIM=pass on production email delivery | already proven 2026-05-03 evening — audit only, no new test | n/a (audit plan 22-05) | ✅ `15-02-EVIDENCE/email_headers.txt` |
| MAIL-02 | Trigger fire → Resend → per-applicant inbox correct | already proven 2026-05-03 evening — audit only, no new test | n/a (audit plan 22-05) | ✅ `15-02-EVIDENCE/pg_net_response.json` |

### Sampling Rate

- **Per task commit:** `pnpm test <pattern matching changed files>` (sub-second — runs only the target spec)
- **Per wave merge:** `pnpm test` (full suite — confirms no regression)
- **Phase gate:** Full suite green + `pnpm exec tsc -b` clean before `/gsd:verify-work`; plus operator-confirmed prod UAT for HOMEBUG-01 + UXBUG-01 + the 3 Wave 1 fixes (5 visual smokes total in plan 22-04)

### Wave 0 Gaps

- [ ] `tests/signup-toast-persistence.test.tsx` — covers SIGNUP-01 (Sonner toast + signUpWithRole error path)
- [ ] `tests/featured-listings-tier-type.test.ts` — covers HOMEBUG-02 (static-source guard against string listing_tier values)
- [ ] `tests/jobsearch-accommodation-remap.test.ts` — covers HOMEBUG-03 (static-source guard for ACCOMMODATION_FILTER_TO_DB lookup table)
- [ ] `tests/p0-prod-smoke-UAT.md` — manual UAT markdown for plan 22-04 (5 smoke steps: SIGNUP-01 toast / HOMEBUG-02 featured cards / HOMEBUG-03 accommodation filter / HOMEBUG-01 counters / UXBUG-01 Step 4 chips)
- Framework install: none — vitest + RTL + sonner mock pattern already in repo from Phase 17/18.1/20.1/21 precedent

*(No new framework install needed; existing test infrastructure covers all phase requirements.)*

## Sources

### Primary (HIGH confidence)
- `src/main.tsx:297` — Toaster mount (`<Toaster position="top-right" richColors />`)
- `src/pages/auth/SignUp.tsx:82-97` — onSubmit handler with `toast.error(result.error.message)`
- `src/contexts/AuthContext.tsx:150-194` — `signUpWithRole` implementation (Supabase auth-js v2 return shape)
- `src/components/landing/FeaturedListings.tsx:124-156` — fetchJobs with `.in('listing_tier', ['featured', 'premium'])` DEFECT (line 133, line 147)
- `src/components/landing/CountersSection.tsx:46-60` — `supabase.rpc('get_platform_stats')` call
- `src/components/ui/FilterSidebar.tsx:43-49` — `ACCOMMODATION_OPTIONS` array (UI emission layer)
- `src/pages/jobs/JobSearch.tsx:273-279` — accommodation filter handler (Layer 2)
- `src/pages/onboarding/steps/Step4Accommodation.tsx:62-69, 210-220` — ChipSelector for accommodation_extras
- `src/types/domain.ts:327-336` — `ACCOMMODATION_EXTRAS_OPTIONS` Title Case values
- `supabase/migrations/001_initial_schema.sql:129` — `listing_tier int NOT NULL DEFAULT 1`
- `supabase/migrations/012_platform_stats_rpc.sql:1-19` — get_platform_stats RPC definition
- `supabase/migrations/013_phase8_wizard_fields.sql:17-44` — accommodation_extras + couples_welcome migration
- `.planning/REQUIREMENTS.md:18-19` — MAIL-01/02 closed 2026-05-03 evening with full §7 evidence
- `.planning/REQUIREMENTS.md:77, 99-103` — UXBUG-01, HOMEBUG-01/02/03, SIGNUP-01 verbatim text
- `.planning/STATUS-2026-05-03.md:18-21` — phantom-applied range remediation (UXBUG-01, HOMEBUG-01 root causes)
- `.planning/phases/15-email-pipeline-deploy/15-02-SUMMARY.md:1-80` — MAIL-01/02 empirical evidence (pg_net 200, DKIM=pass)
- `CLAUDE.md` §1/§2/§3/§4/§5/§7 — project house rules (verbatim file)

### Secondary (MEDIUM confidence)
- Sonner v1 API documentation (https://sonner.emilkowal.ski/toast) — `duration: Infinity` and `closeButton: true` props verified valid via existing repo usage in `tests/admin-login.test.tsx` mock patterns
- Supabase auth-js v2 error shape — `{ data, error: AuthError | null }` — verified via `AuthContext.tsx:155` `result = await supabase.auth.signUp(...)` direct return without wrapping

### Tertiary (LOW confidence — flagged for diagnostic verification in Wave 0)
- Hypothesis B for SIGNUP-01 (auth-js throws instead of returning error shape) — needs Wave 0 console.log diagnostic to confirm/rule out
- Exact PostgREST SQLSTATE for HOMEBUG-02 (`22P02` vs `42804`) — needs DevTools Network capture to confirm

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json + main.tsx + existing test files
- Architecture (file-system layout + layer mapping): HIGH — file paths + line numbers verified by direct Read
- Pitfalls (Sonner duration / PostgREST 400 / listing_tier int): HIGH — schema verified via grep of migrations 001-033; toast plumbing verified by Read of SignUp.tsx + AuthContext.tsx + main.tsx
- Hypotheses A and B for SIGNUP-01: MEDIUM — Hypothesis A strongly supported by Sonner default duration + symptom match; Hypothesis B needs runtime diagnostic
- MAIL-01/02 obsolescence claim: HIGH — direct citation of REQUIREMENTS.md:18-19 + 15-02-SUMMARY.md:1-80 + v2.0-MILESTONE-AUDIT.md:219-220

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (30 days — bug-fix research against frozen codebase; schema is reconciled and stable post-2026-05-03; only invalidates if a sibling phase modifies any of the listed files before Phase 22 executes)
