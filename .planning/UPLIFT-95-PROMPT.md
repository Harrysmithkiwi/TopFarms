# UPLIFT-95 — work order to take TopFarms from 46/100 to launch-ready

**Paste this whole file as the opening prompt of a fresh session.** It is the execution plan
for `.planning/LAUNCH-READINESS-AUDIT-2026-08-20.md` (score 46/100, measured against live
prod, not recalled). It supersedes `.planning/NEXT-SESSION-PROMPT.md` as the session opener;
that file's landing-page detail is still authoritative for Phase 5 and is referenced there.

Read first, in this order: this file · the audit · `CLAUDE.md` §3 §4 §9 §10 · `.planning/NOW.md`.

---

## The honest arithmetic — read before promising anything

The target is **≥95/100**. It cannot be reached by code alone, and this file does not pretend
otherwise. Three bands:

| Band | Who | Gets us to |
|---|---|---|
| Phases 1–5 (engineering) | this session | **~82** |
| Phase 6 (outreach + first employer actions) | operator, session supports | **~90–92** |
| Milestone M3 (real job → real hire → real invoice) | the market | **95+** |

Per audit dimension, the deltas claimed by each phase are listed at the end. A phase is not
"done" until its **gate command** produces the stated output (§9.6) — never when its tasks are
ticked.

## Standing constraints (violating any of these is a stop-the-line event)

1. **Never send any email to any real lead.** Draft yes, stage yes, send never — sending is
   the operator's hand only.
2. **`git push origin main` deploys BOTH Vercel prod and the Edge Functions. Ask before every
   push.**
3. Migrations via the claude.ai Supabase connector; SQL saved to `supabase/migrations/` + a
   `LEDGER.md` row; verified via `pg_catalog`, never the banner. Prove destructive/behavioural
   SQL in a rolled-back transaction first (the 092–103 pattern).
4. Gates by the project's own commands: `tsc -b` · `npm run lint` (NOT `npx eslint src tests`
   — that form lied to CI once already) · `npx vitest run` · `npm run build` · `deno check`
   on any touched edge function.
5. Frontend work goes through the `impeccable` skill (CLAUDE.md §10). Marketing canon is
   `docs/design/v12-DIRECTIVE.md`; portals are `docs/DESIGN.md`; never cross them.
6. An audit's proposed fix is a hypothesis — read live `pg_proc`/`pg_policies`/`pg_attribute`
   before implementing (two of four DSA fixes would have caused incidents as written).
7. Throwaway prod accounts are permitted for E2E proof (operator pre-approved the pattern
   2026-08-19): use `harry.symmans.smith+<tag>@gmail.com`, enumerate rows before purging,
   purge completely, verify counts return to baseline (0 employers · 0 jobs · 1 seeker).
8. Re-measure prod before acting. The audit numbers are from 2026-08-20.

---

## Phase 0 — Preflight + two operator decisions (blocks everything downstream)

**Session tasks:**
- Re-measure prod: employers/jobs/applications/seekers, `leads` contacted, `lead_staging`
  pending, `git log origin/main..main`.
- Verify the working tree is clean and list the unpushed commits for the operator.

**Operator decision A — the unpushed stack.** Local `main` is ~6 commits ahead, and the stack
includes the v12 landing page whose **artwork the operator has twice called not good enough**
(1024px-source crops; see `.planning/NEXT-SESSION-PROMPT.md` §image-quality). Pushing anything
deploys it. Options, presented in prose, operator picks:
  1. Push the stack as-is (v12 goes live with interim art; it is still better than the current
     prod page) and iterate art later.
  2. Hold v12: `git branch v12-landing` at current main, reset a NEW branch from `origin/main`,
     cherry-pick only the Phase-1 auth fix forward, push that. (Branch + cherry-pick only —
     no history-rewriting of anything pushed, §4.)
  Recommendation: (1). The old prod landing is weaker than v12 even with interim art, and (2)
  splits the tree for days.

**Operator decision B — the artwork source.** Ask once, early, because Phase 5 depends on it:
can the concept be re-exported at **2048px+** from wherever it was generated? If yes, Phase 5
re-cuts in minutes. If no, Phase 5 ships the current 2× crops and art becomes a post-launch
commission. **Do not spend another round sharpening 1024px pixels.**

**Gate:** measured prod state posted in chat; both decisions recorded in this file via edit.

---

## Phase 1 — THE BLOCKER: signup verification (audit §1, +18 → ~64)

Nobody can complete signup. Full diagnosis in the audit §1 and in memory
(`project_signup_link_blocker.md`): the email's QP encoding is decoded twice in the mail path,
so `token=3D46b4…` arrives as `tokenF…` — deterministic, hits recovery/magic-link/email-change
too. The fix is provider-independent: **no `=` before the token.**

**Tasks:**
1. Build route `/auth/confirm/:type/:tokenHash` in the React app (framework-mode route +
   legacyRoutes entry, matching how `/auth/verify` is wired). On mount it calls
   `supabase.auth.verifyOtp({ type, token_hash })`, then routes exactly as the existing
   `/auth/verify` success path does (employer → onboarding, seeker → onboarding, error state
   with resend affordance on failure). Four required states (§10).
2. Rewrite the four Supabase email templates (confirmation, recovery, magic link, email
   change) to link `https://www.topfarms.co.nz/auth/confirm/<type>/{{ .TokenHash }}` — **and
   brand them** while in there (TopFarms name, plain-English copy, the green, a plain-text
   fallback line). This also closes the "reads like phishing" finding (audit §5). Templates
   are changed via the Management API (`PATCH /v1/projects/inlagtgpynemhipnqvty/config/auth`,
   token in `.mcp.json`) — **show the operator every template body before PATCHing.**
3. Deploy the route (needs the push from Decision A).
4. **E2E proof on live prod:** throwaway signup → read the real email via the Gmail tool →
   click the delivered link → session established → purge per constraint 7. Also prove one
   password-reset email end to end (it shares the fix).
5. Optional diagnosis (do not block on it): operator opens Gmail → Show original on an old
   broken email and reports `Content-Transfer-Encoding`, pinning Resend vs Supabase for an
   upstream bug report.

**Gate:** a fresh signup completes verification by clicking the actual delivered link — proven
in this session's browser, then purged. Vitest/tsc/lint/build green.

---

## Phase 2 — Deliverability + bounce hygiene (audit §5, +5 → ~69)

1. **Operator (2 min):** Resend dashboard → filter Bounced → classify the 11 (test vs real,
   hard vs soft) and paste the list into chat.
2. Session: insert the bounced addresses into `lead_suppression` (via connector, ledgered) so
   they can never be retried; if any staged lead carries one, mark it.
3. Session: add a `notification_sends`-style guard check that outreach drafts never target a
   suppressed address (verify `lead-draft-email` already joins suppression; fix if not).
4. Record the warm-up plan in `.planning/NOW.md`: first tranche 10–15/day, watch bounces
   before tranche 2 (auth email shares the sending reputation — that is why this matters).

**Gate:** `select count(*) from lead_suppression` equals the bounce count; a drafted batch
provably excludes suppressed addresses (SQL shown).

---

## Phase 3 — Security hardening (audit §2, +3 → ~72)

1. Migration: `ALTER VIEW public.marketplace_employer_profiles SET (security_invoker = true);`
   Verify `reloptions` via `pg_class`. Then **re-verify the view still returns rows to `anon`**
   (it reads `employer_profiles` under invoker rights now — the anon column grants from 059
   must cover every column the view projects; check `has_column_privilege` for each, fix
   grants in the same migration if not, and prove with a REST call using the anon key).
2. The 12 RLS-enabled-no-policy tables: for each, confirm from live `pg_policies` + code grep
   that only service-role/definer paths touch it, then record the intent in one place — a
   `COMMENT ON TABLE` per table ("deny-by-default intentional: service-role only, audit
   2026-08-21") via a single ledgered migration. Any table that a client DOES need becomes a
   real policy instead.
3. Re-run `get_advisors` (security): the ERROR must be gone; the INFO count must be 0 or each
   remaining one commented.

**Gate:** advisor sweep shows 0 ERROR; the anon REST probe of the marketplace view returns the
same shape as before the change.

---

## Phase 4 — Observability (audit §4, +3 → ~75)

1. `Sentry.setUser({ id })` on session change in `AuthContext` (id only — the PII scrubber and
   PRODUCT.md privacy posture forbid more), cleared on sign-out.
2. Sweep the remaining `console.error` sites to `reportError` on the **seeker path** (the
   employer path was done 2026-08-19; mirror it: onboarding, dashboard, documents, saved
   searches). Admin screens optional, lowest value.
3. Add `environment` sanity: verify prod events tag `production` and preview deploys do not
   pollute it (check `observability.ts` gate; fix if preview carries the DSN).
4. Operator (optional, recommended): wire the Sentry MCP so issues are readable in-session.

**Gate:** grep shows 0 `console.error` under `src/pages/dashboard/seeker`, `src/pages/onboarding/Seeker*`;
a deliberate probe error on prod arrives in Sentry carrying the user id tag. All gates green.

---

## Phase 5 — Marketing surface (audit §6, +5 → ~80)

Authority: `docs/design/v12-DIRECTIVE.md` + `.planning/NEXT-SESSION-PROMPT.md` (the
what-is-right / what-went-wrong record — **read it before touching art**; the operator has
rejected artwork twice and the lesson is recorded there).

1. Artwork per Decision B: either re-cut from the 2048px export (minutes; same crop script
   pattern — Lanczos 2×, display maths ≤1.05×) or ship current crops and file the commission.
2. Port `ForEmployers` and `Pricing` to the v12 world (tokens exist side-by-side already;
   follow the v12 kit; impeccable skill engaged; content unchanged — pricing v3 numbers are
   canonical).
3. Sync the shipped React landing with the approved uplift comp
   (`docs/design/topfarms-landing-uplift.html` is the comp; the React page is the product).
4. Deploy (push — ask), then verify live in the browser at 1440 and 390 exactly as before.

**Gate:** clicking Pricing from the new landing stays in one design world; landing suite
(13 tests) green; browser pass on prod shows no fog band, no sub-44px targets, zero console
errors.

---

## Phase 6 — Demand side, session-supported (audit §7–8, operator-driven, → ~90–92)

Session prepares; **operator sends**; nothing here is autonomous.

1. Draft the first tranche (size from Phase 2's answer, default 10) via `lead-draft-email`;
   CTA decision already made: `/for-employers`. Stage for operator review in the Outreach
   screen.
2. Operator reconnects Gmail as `admin.topfarms@gmail.com`; session then builds the tracking
   routine (no code needed: `admin_outreach_mark_sent` / `admin_outreach_mark_responded`
   already exist — a `/schedule` routine cross-references sent mail daily).
3. Operator sends tranche 1. Session watches: bounce rate after 24h, replies into
   hello@ → admin inbox, `admin_lead_mark_contacted` hygiene.
4. First employer signup: session shadows via Sentry + DB (do not touch their rows), fixes
   anything they hit same-day. D4's register check gets its first real NZBN here.
5. Seeker lane first run (B4): paste ONE post, verify confidence > 0 and Terms present before
   any bulk paste — it has never run in production.

**Gate:** ≥10 leads `contacted_at` set · first reply received · first real employer row exists
with a real listing on `/jobs`.

## Milestone M3 — the market closes the last points (95+)

Real job → real applicants → real hire → placement fee invoiced and paid (Stripe path fires
for the first time). Session's role: monitor, fix same-day, and **re-run the audit scoring
honestly** after each phase — update the tracker below rather than asserting a number.

---

## Score tracker (update after every phase gate)

| Checkpoint | Claimed | Measured | Evidence |
|---|---|---|---|
| Baseline 2026-08-20 | 46 | 46 | audit file |
| After Phase 1 | ~64 | | |
| After Phase 2 | ~69 | | |
| After Phase 3 | ~72 | | |
| After Phase 4 | ~75 | | |
| After Phase 5 | ~80–82 | | |
| After Phase 6 | ~90–92 | | |
| M3 complete | 95+ | | |

Scoring rule: re-walk the audit's eight dimensions with the same weights; a dimension only
moves on **evidence** (a command, a row, a browser pass), and the audit file gets an addendum,
not an edit — the 46 stays visible.

## Ask, do not assume

Decision A and B up front; every push; every email template body; tranche size; anything that
writes to a real lead. When a fix touches something this file did not anticipate, diagnose
before fixing (§3) and say what changed.
