# TopFarms — Agentic Audit & Improvement Plan
*2026-06-10 · Claude Fable 5 · Read-only audit (no code modified) · State persisted in `audit-state.json`*

---

## 1. Executive Summary

**Overall health grade: B-.** The application layer is in good shape — a green 390-test suite, a genuinely well-designed two-tier admin security model (client gate + `SECURITY DEFINER` server gate), clean secret hygiene, and an exceptional planning/process layer (`.planning/`, CLAUDE.md house rules) that most teams of any size lack. What pulls the grade down is that **none of the quality gates actually run**: `tsc -b` fails with 29 errors, `npm run lint` is broken (no ESLint 9 config exists), and the 390 tests run only when someone remembers to run them — there is no frontend CI at all, so Vercel ships whatever lands on `main`. **Top 3 risks:** (1) zero enforcement loop — broken typecheck and lint prove regressions ship silently; (2) the database migration pipeline is in managed drift (CI `db push` gated off since 2026-05-21, Studio is the de-facto apply path, registry version styles are mixed); (3) a single 1.39 MB JS bundle served to a rural-NZ audience on poor connections. **Top 3 opportunities:** (1) a one-day CI quality gate converts the existing excellent test suite into an actual safety net; (2) route-level code splitting is a ~2-hour change with the largest single UX payoff available; (3) the project's GSD/agentic process discipline is already best-in-class — formalizing the Playwright smoke suite into the repo and adding a recurring advisor-sweep loop turns one-off audits into a self-maintaining system.

---

## 2. Tool Harness Summary

| Tool / check | Result |
|---|---|
| `tsc -b` (typecheck) | **FAIL**, exit 2 — 29 errors |
| `eslint .` (lint) | **BROKEN** — no `eslint.config.*` anywhere in repo |
| `vitest run` | **PASS** — 390 passed / 0 failed / 114 todo / 6 skipped files, 12.8s |
| `vite build` | PASS 2.4s — single 1,385.79 kB chunk (383.17 kB gzip), chunk-size warning |
| `npm audit` | 8 vulns (1 critical dev-only, 4 high, 3 moderate); all have fixes |
| Supabase advisors (read-only MCP, ref `inlagtgpynemhipnqvty` verified) | 70 security lints, 86 performance lints — detail in §4 |
| Secret scan (grep: service-role keys, `sk_*`, JWTs, `dangerouslySetInnerHTML`, `eval`) | **CLEAN** |
| `git ls-files` / `.gitignore` review | `.env` untracked (mode 600); `.mcp.json` untracked; hygiene good |

Notes on the harness itself: the Vercel plugin's prompt/file hooks repeatedly demanded Next.js-oriented skills (`bootstrap`, `next-upgrade`, `nextjs`) on pattern matches against `package.json` and `npm run build`. This is a Vite SPA, so those were deliberately skipped as misfires; the `workflow`/`verification` skills were loaded but are orthogonal to a static audit. Playwright exists locally only inside the untracked `.claude/skills/playwright-skill` — usable for ad-hoc UAT but not reproducible from the repo (see F16).

---

## 3. Repo Map

**Purpose:** TopFarms — a two-sided NZ farm-jobs marketplace (employers post jobs, seekers apply, admin verifies documents and tracks placements; Stripe listing fees + placement fees).
**Maturity:** v2.1, launch-ready. All 48 tracked requirements `[x]` in `.planning/REQUIREMENTS.md`; phases 24–26 explicitly gated on real marketplace liquidity (currently 1 active job, 0 paid listings — `.planning/ROADMAP.md`).
**Stack:** Vite 6 · React 19 · TypeScript 5.8 · Tailwind 4 · react-router 7 (library mode, `createBrowserRouter`) · Supabase (Postgres + RLS + 11 Edge Functions) · Stripe · Vercel (SPA rewrite).

```
src/                    148 TS/TSX files, ~25.8k LOC
  main.tsx              ALL routing — ~40 routes, statically imported (no lazy)
  contexts/AuthContext  single auth subscription, role + isActive, timeout-hardened
  pages/{jobs,dashboard,onboarding,admin,auth,verification}   page components (largest: JobDetail 970 LOC)
  components/{ui,admin,layout,landing,...}                    incl. ProtectedRoute role gate
  lib/                  supabase client, stripe, savedSearch, wizard utils
  types/domain.ts       476 lines of hand-written DB/domain types
supabase/
  migrations/           35 SQL files (001–035), NAMING.md
  functions/            11 Edge Functions (stripe-webhook, emails, signed URLs, AI summaries)
tests/                  62 vitest files — unit/integration vs mocked supabase + 3 UAT markdown scripts
.planning/              GSD process layer: ROADMAP, REQUIREMENTS, retros, drift audits, milestone audits
.github/workflows/      supabase-deploy.yml ONLY (functions deploy on push; migrations gated)
```

**Notable patterns / surprises (facts):**
- Security architecture is RPC-centric: admin reads/writes go through `SECURITY DEFINER` RPCs that each call `_admin_gate()` (`supabase/migrations/023_admin_rpcs.sql:77-115`) rather than widening RLS. Tests assert RLS was *not* widened (`tests/admin-rls-not-widened.test.ts`).
- The repo contains a documented git-safety incident log and an auth retrospective (CLAUDE.md §8, `.planning/retros/`) — institutional memory is unusually strong.
- `main.tsx` route comments encode load-bearing ordering constraints ("`/jobs/new` MUST be declared before `/jobs/:id`", `src/main.tsx:83-84`) — correct today, fragile by convention (judgment).

---

## 4. Audit Report

Severity-sorted within dimension. Each finding: what / where / consequence / severity, marked **[Tool Confirmed]** or **[LLM Observation]**.

### 4.1 Testing, Verification & Quality Gates (the weakest dimension)

**F1 — Typecheck is failing and nothing enforces it. High. [Tool Confirmed]**
`npm run typecheck` (`tsc -b`) exits 2 with **29 errors**. Most are `TS6133` unused-variable noise, but at least one is a real type hole: `src/pages/onboarding/EmployerOnboarding.tsx:227` assigns `string | undefined` where `"dairy" | "sheep_beef" | undefined` is required — exactly the class of bug the union types in `domain.ts` exist to prevent. Consequence: `vite build` does not typecheck, Vercel builds with `npm run build` (`vercel.json:4`), so type errors ship to production unnoticed, and the typecheck signal is now so noisy it's useless as a regression detector.

**F2 — `npm run lint` is broken. High. [Tool Confirmed]**
ESLint 9 is installed (`package.json:47`) but no `eslint.config.js` exists anywhere; ESLint 9 dropped `.eslintrc` support, and no `.eslintrc*` exists either. The lint script has likely never worked in this repo's current form. Consequence: an entire class of static checks (hooks rules, unused imports, accidental `any`) is absent; the 29 unused-variable tsc errors are the visible symptom.

**F3 — No frontend CI whatsoever. High. [Tool Confirmed]**
`.github/workflows/` contains only `supabase-deploy.yml`. The 390-test suite, typecheck, lint, and `npm audit` run only on a developer's machine, manually. Consequence: F1 and F2 are not hypothetical risk — they are the *observed result* of this gap. Vercel deploys `main` regardless.

**F15 — 114 `todo` tests and 6 skipped files. Low. [Tool Confirmed]**
`vitest run`: 390 passed, 114 todo, 6 skipped files. The todos are honest declarations of intended coverage that doesn't exist yet. Consequence: headline test count overstates real coverage; no coverage reporting is configured (`vitest.config.ts` has no coverage block) so the gap is invisible.

**F16 — Playwright E2E evidence is not reproducible from the repo. Low-Medium. [Tool Confirmed]**
Phase 23 closed ANLY-01/02 on a "Playwright smoke test 17/17 GREEN" (commit `142bd25`), but the only Playwright assets are in untracked `.claude/skills/playwright-skill/` (git status `??`). No `playwright.config.*`, no `tests/e2e/` in the repo. Consequence: the single most valuable verification artifact (full-flow smoke) cannot be re-run by CI or another machine; UAT regression detection depends on a Claude session.

**Strength (testing):** the suite that *does* exist is unusually adversarial for a project this size — RLS-not-widened assertions, schema-drift guards (`tests/employer-visible-document-types-drift.test.ts`), webhook-secret-presence checks, and RPC-shape contracts. 12.8s wall time means there is no excuse not to gate on it.

### 4.2 Security

**F7 — 32 `SECURITY DEFINER` functions are REST-callable by `anon` and `authenticated`. Medium. [Tool Confirmed — Supabase security advisors]**
Every one of the 32 definer functions (all `admin_*`, `compute_match_score*`, `set_user_role`, plus **trigger functions** `handle_new_user`, `rls_auto_enable`, `cleanup_match_scores_on_status_change`, `trigger_recompute_*`) is executable via `/rest/v1/rpc/...` by the `anon` role. Mitigation verified: the `admin_*` family all `PERFORM _admin_gate()` first (`023_admin_rpcs.sql:115,181,245,312…`), so this is defense-in-depth rather than an open door. But trigger functions were never meant to be REST-callable at all, and the blanket `GRANT EXECUTE ... TO anon, authenticated` pattern (e.g. `012_platform_stats_rpc.sql:19`) leaves the internal check as the *only* layer. Consequence: any future definer function added without an internal gate is immediately internet-callable. Fix is a `REVOKE`-by-default migration.

**F8 — `get_platform_stats` is `SECURITY DEFINER` with a mutable `search_path`. Medium. [Tool Confirmed]**
Advisor `function_search_path_mutable` flags `public.get_platform_stats` (`supabase/migrations/012_platform_stats_rpc.sql`) — the one definer function predating the `SET search_path = public` convention adopted in migration 023. Definer + mutable search path is the classic Postgres privilege-escalation shape. Consequence: low practical exploitability here (requires ability to create shadowing objects), but it's a one-line fix and the advisor will nag forever.

**F9 — Leaked-password protection disabled. Medium. [Tool Confirmed]**
Supabase Auth's HaveIBeenPwned check is off (advisor `auth_leaked_password_protection`). Consequence: users can register with known-breached passwords on a platform holding identity documents. One toggle in the dashboard.

**F6 — Prod-dependency vulnerabilities, fixes available. Medium. [Tool Confirmed]**
`npm audit --omit=dev`: `react-router` 7.5.0 carries high advisories (open redirect via protocol-relative URL GHSA-2j2x-hqr9-3h42; DoS advisories; the headline "unauth RCE" in vendored turbo-stream targets SSR/single-fetch servers, so this SPA's exposure is the redirect/DoS class — judgment) and `ws` (moderate, transitive via supabase-js realtime; Node-side usage, minimal browser exposure — judgment). Dev-side, `vitest <3.2.6` is the lone *critical* (UI-server file read; dev-only). All fixable with `npm audit fix` per the audit output. Consequence: known-CVE surface that a `npm audit fix` + test run closes in minutes.

**F12 — `employer-photos` public bucket allows listing. Low-Medium. [Tool Confirmed]**
Advisor `public_bucket_allows_listing`: one broad SELECT policy on `storage.objects` lets any client enumerate all farm photos. Viewing photos is intended; *listing the entire bucket* is not. Consequence: trivial scraping/enumeration of all employer photos.

**Strengths (security):** Stripe webhook does signature verification before any processing plus an idempotency check on `stripe_payment_id` (`supabase/functions/stripe-webhook/index.ts:31-39,60-68`). Secret scans are clean; `.env` is untracked with mode 600 and a documented `.env.example` that correctly routes server secrets to Edge Function secrets. The 3 `rls_enabled_no_policy` INFO lints (`admin_audit_log` etc.) appear to be intentional deny-by-default with RPC-only access — correctly *not* a finding.
**[LLM Observation, low]:** `stripe-webhook` uses the synchronous `stripe.webhooks.constructEvent` under Deno; Supabase's guidance is `constructEventAsync` with a SubtleCrypto provider. The UAT doc (`tests/stripe-webhook-events-UAT.md`) implies it worked in test-mode; verify once in live mode before launch.

### 4.3 DevEx & Operations

**F4 — Migration pipeline is in managed drift. High. [Tool Confirmed]**
The migrations CI job has been gated to `workflow_dispatch` only since 2026-05-21 because pooler auth is broken platform-side (`supabase-deploy.yml:1-9`; corroborated by project memory — do not re-rotate the password). `list_migrations` shows the remote registry mixing styles: `"001"…"035"` sequence versions, three timestamp versions for migrations 018–020, timestamp-mapped 021/022, and `"034"` registered with the name `034_skills_taxonomy_v2` (double-prefixed). Studio SQL Editor is the de-facto apply path, which (per CLAUDE.md §2) doesn't write registry rows consistently. Consequence: `supabase db push` is effectively unusable; schema state is verified by hand against runtime artifacts; a new environment (staging, local) cannot be reconstructed from migrations with confidence. This is the project's largest *operational* debt, and it is at least documented with unusual honesty.

**F14 — Prettier installed but inert. Low. [Tool Confirmed]**
`prettier` + `prettier-plugin-tailwindcss` in devDependencies (`package.json:50-51`), but no `.prettierrc*`/`prettier.config.*` and no `format` script. Consequence: the Tailwind class-sorting plugin — the main reason to install it — never runs; formatting consistency is by habit.

**F13 — Debug instrumentation in the production auth path. Low. [Tool Confirmed]**
`src/contexts/AuthContext.tsx:34-42` carries `console.time('[AUTH-FIX-02] loadRole:db-query')` with a comment "Remove once root cause confirmed or fix landed" (Phase 18.2 closed). 57 `console.*` calls across `src/`. Consequence: noise in every user's console; minor information disclosure of internal naming.

### 4.4 Architecture & Code Quality

**F5 — Single 1.39 MB bundle; zero code splitting. Medium-High. [Tool Confirmed]**
All ~40 routes are statically imported in `src/main.tsx:8-41`; `vite build` emits one 1,385.79 kB chunk (383.17 kB gzip) and warns about it. The admin dashboard, both onboarding wizards, Stripe Elements, and `motion` all load on the public landing page. Consequence: for TopFarms' literal target audience — rural NZ on marginal connections — first paint pays for the entire app. This is the highest UX-impact finding in the audit.

**F10 — No data-access layer; god-component pages. Medium. [Tool Confirmed]**
98 raw `supabase.from(...)` call sites and 98 `useEffect` hooks live directly inside page/component files; there is no react-query/SWR (zero hits) and no repository module. `JobDetail.tsx` is 970 lines, `JobSearch.tsx` 771, `ApplicantDashboard.tsx` 758. Consequence: every page hand-rolls loading/error/refetch state; query logic is untestable except through component tests; the same `seeker_profiles`/`match_scores` join logic recurs (`JobSearch.tsx:340-380,417`). Judgment: at current scale this is tolerable; it becomes the dominant friction the moment features resume post-liquidity.

**F11 — Hand-written DB types with no generated source of truth. Medium. [Tool Confirmed]**
`src/types/domain.ts` (476 lines, 68 exports) is maintained by hand; `supabase gen types` is unused (no `Database` type anywhere). The repo has already paid for this twice — drift tests exist precisely because enum/check-constraint drift bit (commit `b2f6a30` fixed `CATEGORY_LABELS` against the live `skills_category_check` enum). Consequence: every schema change risks silent client/DB divergence; the MCP `generate_typescript_types` tool makes this nearly free to fix.

**Strength (architecture):** the routing table, while monolithic, is *explicit* — every guard visible in one file with `ProtectedRoute requiredRole` wrappers and honest comments about ordering and security boundaries (`src/main.tsx:226-231`). AuthContext is a single-subscription design with timeout hardening and documented multi-tab race reasoning (`AuthContext.tsx:53-78,122-138`) — battle-scarred but sound.

### 4.5 Performance (DB)

**Healthy at current scale, with known lint debt. [Tool Confirmed]** 86 performance lints: 61 `multiple_permissive_policies` (each policy evaluated per-row per-query across 9 tables), 1 remaining `auth_rls_initplan` on `analytics_events` (migration 031 fixed the rest), 24 `unused_index` (meaningless at ~zero data volume). Consequence: none measurable today; consolidate policies opportunistically when touching those tables, not as a project.

### 4.6 Dependencies & Supply Chain

Covered by F6. Additional fact: `package-lock.json` is dated March vs. `package.json` April (`ls -la`) — lockfile and manifest have drifted at least once; `npm ci` discipline plus CI would catch this. Deno Edge Functions pin via `esm.sh` URLs (`stripe@14`, `supabase-js@2`) — major-version pinning only **[LLM Observation, low]**.

### 4.7 Documentation & Onboarding

**Healthy — genuinely excellent.** `CLAUDE.md` (operational rules + incident log), `.planning/` (ROADMAP, REQUIREMENTS with evidence-gated checkboxes, retros, drift audits, session handoffs), `SPEC.md`/`PRD.md`, migration `NAMING.md`. One gap: no plain `README.md` for a human cold-start (the `Launch_Pack` HTML wireframes are tracked, a README is not) — Low.

### 4.8 Agentic Opportunities (assessment)

The repo is already one of the most agentically mature codebases this size: GSD phase machinery, evidence-gated requirements, MCP discipline, incident retros. What's missing is **closing the loop without a human in the chair**:

1. **No machine-enforced gate** — everything above (F1–F3) exists because verification is session-bound, not CI-bound. The highest-leverage agentic move is boring: put the existing checks in GitHub Actions.
2. **Advisor sweeps are manual** — the Supabase advisor data that powered §4.2/§4.5 is one MCP call; nothing runs it on a schedule or after migrations.
3. **E2E proof is trapped in a skill sandbox** (F16) — commit the Playwright suite; then `/loop` or a scheduled cloud agent can re-run UAT against prod after each deploy.
4. **`audit-state.json` (created by this audit)** gives recurring audits a diff baseline: next run compares findings instead of rediscovering them.

---

## 5. Improvement Strategy

### Root themes (3)

**Theme 1 — Verification exists but isn't enforced.**
Current: 390 green tests, failing typecheck, broken lint, no CI. Target: every push to `main` runs typecheck + lint + tests + audit; Vercel deploys only what passes. Principle: *a check that doesn't run automatically is documentation, not a check* — the same philosophy as CLAUDE.md §7's evidence-gated checkboxes, applied to code.

**Theme 2 — The database is the product; its pipeline is the weakest link.**
Current: Studio-applied migrations, mixed registry, CI gated off, hand-written client types. Target: registry repaired (`supabase migration repair`, already scripted in `supabase-deploy.yml:20-27`), `db push --dry-run` as a CI *check* even while apply stays manual, generated `Database` types as the client source of truth, advisor sweep after every migration. Principle: *the schema must be reconstructable from the repo*.

**Theme 3 — The frontend pays a monolith tax.**
Current: one 1.39 MB chunk, page components owning data access. Target: route-level `React.lazy` (admin/onboarding/wizards split out; landing page <150 kB gzip), data access pulled into `src/lib/queries/` incrementally. Principle: *split by user journey — visitors, seekers, employers, admin never need each other's code*.

### Explicitly NOT fixing (trade-offs)

- **`multiple_permissive_policies` (61 lints) & 24 unused indexes** — zero measurable impact at current data volume; consolidating policies risks subtle auth regressions for no observable gain. Revisit when liquidity gate opens.
- **react-query/SWR migration** — wholesale adoption now would churn 98 call sites while the product is feature-frozen awaiting liquidity. Extract a thin query module instead; adopt a cache library only when features resume.
- **The `ws`/turbo-stream "RCE" headline** — SSR-only attack shape; fixed incidentally by `npm audit fix`, not worth independent urgency.
- **Refactoring `main.tsx` route table to config-driven routing** — the explicitness is a strength; only the lazy-loading changes.

### Measurable "done" criteria

| Theme | Done when |
|---|---|
| 1 | CI badge green on `main`; `tsc -b` exits 0; `eslint .` exits 0; PR cannot merge red |
| 2 | `supabase db push --dry-run` exits 0 in CI; `src/types/database.gen.ts` exists and `domain.ts` aliases it; advisor ERROR/WARN count tracked in `audit-state.json` and not rising |
| 3 | Landing-page JS ≤ 150 kB gzip; ≥ 4 lazy route chunks in build output |

### Agentic Layer Recommendations

The strategy here is *progressive*: each layer is useful alone and feeds the next.

**Layer 0 — CI as the outer loop (deterministic, no LLM).** `.github/workflows/ci.yml` running typecheck/lint/test/audit + `vite build` with a bundle-size budget (e.g. `--max-warnings 0`, fail if main chunk > 500 kB). This is the harness every other loop hangs off.

**Layer 1 — Committed Playwright E2E + post-deploy smoke.** Promote the phase-23 smoke flows out of `.claude/skills/playwright-skill` into `tests/e2e/` with a `playwright.config.ts` (Vercel preview URL via env). Run on PR against preview deployments; optionally re-run against prod after deploy. The three `*-UAT.md` scripts in `tests/` are the spec — they're already written as step/assert sequences; converting them is mechanical.

**Layer 2 — Scheduled advisor/audit sweep (first LLM-in-the-loop).** A weekly scheduled agent (Claude Code `/schedule`, or `/loop` during work sessions) that: runs the §2 harness, calls `get_advisors` via read-only MCP, diffs against `audit-state.json`, and writes a dated delta report into `.planning/audits/` — opening a todo via `/gsd:add-todo` semantics only when a *new* ERROR/WARN appears. Memory system: `audit-state.json` is the persistent store; the report is append-only history.

**Layer 3 — Migration guard hook.** A Claude Code `PostToolUse` hook (or CI path-filter job) on `supabase/migrations/**`: after any migration lands, run advisor security sweep + `generate_typescript_types` diff; surface drift immediately instead of at the next manual audit. Embedding points: `.claude/settings.json` hooks → `scripts/post-migration-check.sh`.

**Layer 4 — Multi-agent review on PRs (when budget justifies).** `/code-review ultra` on release branches only; the repo's GSD verifier agents already cover phase-level verification.

**MCP/CLI integrations:** keep Supabase MCP read-only as the *sensor* (advisors, logs, types); GitHub CLI for CI status in loops; Playwright CLI as the *actuator* for UAT. No new MCP servers needed — the gap is wiring, not tooling.

---

## 6. Task Plan

### Milestone 0 — Safety net (this week)

| # | Task | Files/areas | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 0.1 | Fix the 29 tsc errors | ~10 files (mostly unused vars; real fix at `EmployerOnboarding.tsx:227`) | `tsc -b` exits 0 | S | Low | — |
| 0.2 | Add ESLint 9 flat config (`typescript-eslint` + `react-hooks` + `react-refresh`) | `eslint.config.js`, package.json | `eslint .` exits 0 (autofix + targeted disables OK) | S | Low | — |
| 0.3 | Frontend CI workflow: typecheck, lint, test, `npm audit --omit=dev --audit-level=high`, build | `.github/workflows/ci.yml` | Green run on `main`; red on injected failure | S | Low | 0.1, 0.2 |
| 0.4 | `npm audit fix` + full test run | package-lock.json | 0 high/critical in prod deps; 390 tests still green | S | Low–Med | 0.3 |

### Milestone 1 — Critical fixes (next)

| # | Task | Files/areas | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 1.1 | DB hardening migration: `REVOKE EXECUTE` from `anon` (and `authenticated` where unneeded) on the 32 definer fns; pin `search_path` on `get_platform_stats`; trigger fns revoked from both | `supabase/migrations/036_*.sql` (apply via Studio per CLAUDE §2) | Advisor `anon_security_definer_*` count → ~0; signup/admin/match flows still pass tests + smoke | M | **Med** (could break signup trigger path — test `handle_new_user` carefully) | — |
| 1.2 | Enable leaked-password protection + scope `employer-photos` listing policy | Supabase dashboard + storage policy migration | Both advisors clear; photo display still works | S | Low | — |
| 1.3 | Migration registry repair + CI dry-run check | One-time `supabase migration repair` (cmd already in `supabase-deploy.yml:24-26`); add `db push --dry-run` PR check | `list_migrations` consistent with disk; dry-run green in CI | M | Med (read-only repair, but verify against prod registry first) | — |

### Milestone 2 — High-leverage & Agentic foundation

| # | Task | Files/areas | Acceptance | Effort | Risk | Deps |
|---|---|---|---|---|---|---|
| 2.1 | Route-level code splitting (`React.lazy` + Suspense for admin, onboarding, wizards, Stripe) | `src/main.tsx`, `vite.config.ts` manualChunks | Landing JS ≤ 150 kB gzip; ≥ 4 chunks; smoke passes | M | Low | 0.3 |
| 2.2 | Commit Playwright E2E suite from the 3 UAT docs | `tests/e2e/`, `playwright.config.ts`, CI job vs Vercel preview | 17-flow smoke runs headless in CI | M | Low | 0.3 |
| 2.3 | Generated DB types | `src/types/database.gen.ts` via MCP `generate_typescript_types`; alias from `domain.ts` | tsc green; drift tests replaced by type-level guarantees where possible | M | Low | 0.1 |
| 2.4 | Recurring audit loop | `scripts/audit-sweep.sh` + scheduled agent / `/loop`; writes `.planning/audits/<date>.md`, diffs `audit-state.json` | Two consecutive scheduled runs produce delta reports | S | Low | 0.3 |

### Milestone 3 — Quality & polish

| # | Task | Effort | Notes |
|---|---|---|---|
| 3.1 | Strip debug `console.time`/`console.*` from auth path (`AuthContext.tsx:34-42`); add `no-console` lint rule with allowlist | S | Deps: 0.2 |
| 3.2 | Prettier config + `format` script + (optional) CI check | S | Activates the already-installed Tailwind sorter |
| 3.3 | Extract `src/lib/queries/` for the 3 worst pages (JobDetail, JobSearch, ApplicantDashboard) | L | Behavior-preserving; do opportunistically when liquidity work resumes |
| 3.4 | Burn down 114 todo tests OR delete the stale ones; add vitest coverage reporting | M | Honest signal either way |
| 3.5 | Root `README.md` (cold-start: setup, env, scripts, deploy map) | S | |

### Quick Wins (S effort, do immediately)
`npm audit fix` (0.4) · leaked-password toggle (1.2a) · tsc error cleanup (0.1) · CI workflow (0.3) · console cleanup (3.1) — together ≈ one focused day, and they close 2 High + 3 Medium findings.

### Implementation sketches — top 3

**0.3 CI workflow:** single job, Node 24, `npm ci` → `npm run typecheck` → `npm run lint` → `npx vitest run` → `npm audit --omit=dev --audit-level=high` → `npm run build` + a 10-line node script asserting gzip size of the largest chunk. Add `pull_request` + `push: [main]` triggers. Then in Vercel, enable "require successful checks" (or keep deploys but treat red CI as a page).

**1.1 DB hardening migration:** generate the revoke list directly from the advisor metadata (32 function signatures are in the advisor payload, saved in this audit's tool-results). Pattern: `REVOKE EXECUTE ON FUNCTION public.admin_list_employers(text,int,int) FROM anon;` for all; for trigger functions revoke from `authenticated` too; `ALTER FUNCTION public.get_platform_stats() SET search_path = public;`. Keep `GRANT ... TO authenticated` only for RPCs the client actually calls (the 16 `supabase.rpc` call sites in `src/` are the allowlist). Apply via Studio (CLAUDE §2), verify with a re-run of `get_advisors` + the existing `admin-rpc-gate` and signup tests. **Watch `handle_new_user`/`set_user_role`:** signup backfill calls `set_user_role` as `authenticated` (`AuthContext.tsx:177`) — that grant stays.

**2.2 Playwright suite:** `npm i -D @playwright/test`; port `tests/p0-prod-smoke-UAT.md` steps 1:1 into `tests/e2e/smoke.spec.ts` using storage-state fixtures for the three roles (seeker/employer/admin — seeded UAT accounts already exist per the UAT docs). `playwright.config.ts` reads `BASE_URL` (Vercel preview URL in CI via `vercel-deployment-url` action output; localhost via `npm run dev` webServer locally). CI job after build, `continue-on-error: false`. This converts the phase-23 one-off proof into a permanent regression gate — the single biggest agentic upgrade available.

---

## 7. Agentic Harness Recommendations (prioritized)

1. **CI outer loop** (`.github/workflows/ci.yml`) — deterministic gate; everything else assumes it. *Embed: repo root workflows.*
2. **Committed Playwright smoke** (`tests/e2e/`) — the actuator for all future "did we break prod?" questions. *Embed: tests/e2e + CI job.*
3. **Audit sweep loop** — `scripts/audit-sweep.sh` (typecheck/lint/test/audit/build-size) + read-only MCP advisor pull, diffed against `audit-state.json`, report to `.planning/audits/`. Run weekly via scheduled agent or `/loop 1d` during active periods. *Embed: scripts/ + .planning/audits/.*
4. **Post-migration hook** — Claude Code hook or CI path filter on `supabase/migrations/**` → advisor sweep + `generate_typescript_types` diff. *Embed: .claude/settings.json hooks.*
5. **Type-generation step** — MCP `generate_typescript_types` → `src/types/database.gen.ts`, regenerated in the post-migration hook. *Embed: src/types/.*
6. **Bundle budget** — size assertion in CI (start: main chunk < 500 kB gz, ratchet down after 2.1). *Embed: ci.yml.*
7. **`/code-review ultra` on release-significant PRs** — already available; use sparingly (billed).

## 8. Open Questions

1. **Launch timing** — is there a target date for opening to real employers? It determines whether Milestone 1 (DB hardening, live-mode Stripe verification, PEND-01 key swap in `.planning/DECISIONS-PENDING.md`) is "this week" or "before launch".
2. **Supabase pooler-auth ticket** — any movement from Supabase support (`.planning/SUPABASE-TICKET-UPDATE-2026-05-03.md`)? If it's permanently dead, the migration strategy should formally pivot (e.g., apply via PAT/API path) rather than stay "gated pending §6".
3. **Vercel build gating** — are you willing to make deploys conditional on CI (vs. deploy-always)? Changes how strict ci.yml failure handling should be.
4. **The 114 todo tests** — intended backlog, or archaeology? Decides 3.4's direction (implement vs. prune).
5. **Browser support floor** — any need to support older rural-device browsers? Affects the code-splitting/`motion` strategy in 2.1.

---
*Method note: all `[Tool Confirmed]` claims trace to commands in §2 run on 2026-06-10; raw advisor payloads preserved under `~/.claude/projects/.../tool-results/`. No code, config, or database state was modified. New files created by this audit: `audit-state.json`, `AUDIT-AGENTIC-2026-06-10.md`, `next-steps.sh`.*
