# TopFarms — Open Scope Questions for Sense-Check Session

**Snapshot:** 2026-05-01 — pre-sense-check export
**Purpose:** Surface unanswered scoping questions ahead of a sense-check session. **These are intentionally not answered here.** A fresh session should walk through each one and either decide, defer, or assign.

---

## Methodology

These questions emerged from cross-referencing `PRD.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `v2.0-MILESTONE-AUDIT.md`, and the Phase 15 closeout artefacts. Each one represents a real decision point where the codebase, planning docs, or recent work signals genuine optionality — not items that have already been decided and are merely awaiting execution.

Order is rough priority — top items affect the launch path; bottom items affect post-launch direction.

---

## A. Launch Scope & Sequencing

### Q1. Is Saved Search (Phase 17 / SRCH-13/14/15) still in scope for v2.0 launch, or should it defer to v2.1?

**Why this is a real question.**
- v2.0 milestone goal lists "saved search" as one of the 6 launch-critical gaps
- ROADMAP.md says "**Plan this phase right before execution** — not now — to avoid burning context on stale planning"
- v2.0-MILESTONE-AUDIT.md flags SRCH-13/14/15 as orphaned at milestone level until Phase 17 plans exist
- All other v2.0 gap-closure phases (15, 16, 18) are paying down debt, not building features. Phase 17 is the only feature-work phase in v2.0
- Critical Blocker #3 in v2.0-MILESTONE-AUDIT.md is literally "Plan/execute Phase 17 Saved Search OR explicitly punt SRCH-13/14/15 to v2.1"
- MAIL-06 (saved search → email alert) is explicitly post-launch — would Phase 17 ship a feature with no notification delivery and let users notice the gap?

**What "answered" looks like:** clear ship-vs-defer decision; if ship, plan the phase; if defer, update REQUIREMENTS.md to move SRCH-13/14/15 to v2.1 and rewrite the v2.0 milestone goal.

---

### Q2. What is the actual MVP-launch checklist?

**Why this is a real question.**
- "Public launch" appears as a gating condition in multiple places: PRIV-02 ("Blocker for: public launch"), UAT-04 ("To run when first real user signs up via Google, OR before MVP public launch"), MAIL-01/02 partial-close note, UXBUG-01
- No single checklist exists in `.planning/` that lists every item gated to "public launch" with owners and acceptance criteria
- Without one, it's easy for a launch decision to surprise — items get discovered late
- Candidate items already known: PRIV-02 test, UAT-04 OAuth smoke, MAIL-01/02 E2E, UXBUG-01 fix, first CI smoke test, Resend domain verified, custom domain (referenced in CORS-01 as "future"), Stripe production-mode keys (assumed but not confirmed)

**What "answered" looks like:** a `.planning/LAUNCH-CHECKLIST.md` with every gate, owner, and verification action — or an explicit decision that "public launch" is not yet a target and the term should be replaced with "private beta" or similar.

---

### Q3. Is the 4-Edge-Function Stripe placement-fee flow on the critical path for launch?

**Why this is a real question.**
- `acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails` were all on disk + undeployed for the entire v1.0 + most of v2.0. Yet v1.0 was declared "shipped" 2026-03-17 and v1.1 "shipped" 2026-03-23
- This means real users haven't been routed through these flows yet (or the flows have been silently failing)
- v2.0 milestone audit notes: "Every employer who marks a job as filled silently fails to notify the unresolved applicants" was the production state before 2026-05-01
- Open question: did any user actually mark a job filled in production before the deploy? If yes, the flow's been broken in their experience
- For launch: do all 4 functions need empirical end-to-end tests, or just the ones in the user-facing critical path?

**What "answered" looks like:** confirmation of whether anyone has actually used the placement-fee or job-filled flows in production yet (check Stripe production dashboard + Supabase logs), and a launch-gate decision on which functions need empirical E2E proof vs which can ship with code-only verification.

---

### Q4. Should Phase 16 (PRIV-02) bundle PRIV-01 unification (404 → 403)?

**Why this is a real question.**
- PRIV-02 is the public-launch blocker; PRIV-01 is "low severity" hardening
- Phase 16 plan note: "(Optional, decide at plan time) PRIV-01 status-code unification (404 → 403) bundled if scope permits"
- Bundling expands scope but reduces the chance of needing a follow-up Edge Function deploy
- Splitting keeps Phase 16 minimal and leaves PRIV-01 as a clean post-launch task
- Trade-off is small; decision should be made at plan time, but the question hasn't been surfaced explicitly yet

**What "answered" looks like:** decide bundle-or-split before `/gsd:plan-phase 16` runs.

---

## B. Migration & Deployment Hygiene

### Q5. Migration 016 — accept the unknown deploy trail or verify post-hoc?

**Why this is a real question.**
- Migration 016 (`016_phase11_backend_features.sql`) is NOT in `supabase_migrations.schema_migrations` registry but Phase 11 features have been live in production since v1.1 ship
- "Applied via non-MCP path (likely Studio / Dashboard) before 2026-04-29" per `supabase/migrations/NAMING.md`
- We don't know which sub-blocks succeeded vs failed-and-were-patched
- A future v2.x change touching the same path could hit unmigrated state
- ~15 min via Supabase MCP to query the runtime artefacts 016 promised to create (`seeker-documents` storage bucket policies, `estimate_match_pool` RPC) and confirm
- Or accept the risk and ship — Phase 11 features have been stable for 6 weeks, the empirical evidence is "it works"

**What "answered" looks like:** decide to verify post-hoc (assign to Phase 18 or do it ad-hoc) OR explicitly accept the risk and document the rationale in NAMING.md.

---

### Q6. AUTH-FIX-02 — root cause investigation now or defer to post-launch?

**Why this is a real question.**
- Symptom is mitigated: ProtectedRoute renders spinner instead of bouncing through `/auth/select-role` when `loadRole` exceeds 3s
- But `loadRole > 3s` is the actual bug — symptom hides it
- 2fce4b7 was meant to fix Web Lock contention via AuthProvider centralisation, but Phase 14-02 UAT showed three loadRole timeouts firing on a single page navigation — meaning centralisation didn't fully eliminate latency
- Candidates: residual auth-token Web Lock contention, Supabase client cold-init on first nav, race between INITIAL_SESSION and loadRole chains
- Edge case not covered by mitigation: an OAuth user with `session=true` + no `user_roles` row navigating to a `requiredRole`-protected route would see a perpetual spinner instead of bouncing to `/auth/select-role`
- This is in Phase 18 scope but Phase 18 is "non-time-pressured" — does it stay there, or is it elevated?

**What "answered" looks like:** decide whether AUTH-FIX-02 is launch-blocking (elevate from Phase 18 to a separate gate-fix phase) or post-launch acceptable (keep in Phase 18 cleanup).

---

## C. Process & Discipline

### Q7. Is the partial-close discipline a one-off (Phase 15) or a permanent house rule?

**Why this is a real question.**
- Phase 15 closeout established the pattern: keep `[ ]` with explicit partial-close notes when deploy is complete but E2E chain is unverified — do not fabricate `[x]` without empirical evidence
- This was added to Claude's persistent memory as `feedback_partial_close_discipline.md`
- But it's not yet codified in `CLAUDE.md` (which has 5 numbered house rules and no §6)
- Phase 18 has a related cleanup item (#6: SUMMARY frontmatter `requirements_completed` backfill) — should the partial-close pattern also be backfilled retroactively where applicable, or only applied going forward?
- Codifying the partial-close discipline in CLAUDE.md would make it survive memory resets and propagate to subagents that read CLAUDE.md but not memory

**What "answered" looks like:** decide whether to add `CLAUDE.md §6 Partial-close discipline` and whether retroactive application is in scope.

---

### Q8. Should Phase 17 + 18 + 16 run in a specific order, or in parallel?

**Why this is a real question.**
- Current ROADMAP.md sequence: 15 → 16 → 17 → 18, but these have no dependency chain after Phase 15 closes
- Phase 16 unblocks public launch (PRIV-02). Phase 17 ships a feature. Phase 18 cleans up debt.
- All three could run in any order or in parallel branches. Phase 18 is explicitly "non-time-pressured."
- Running 17 and 18 in parallel could absorb learnings from 17 (e.g., new tables → migration → forces lookup-table update in NAMING.md → Phase 18 NAMING work informed)
- Running 16 first means launch-gating work clears first, but the developer is one person — parallelism is calendar parallelism, not effort parallelism

**What "answered" looks like:** confirm ROADMAP order or rearrange. Honest version: "16 first because launch blocker, then 17 because feature, then 18 because cleanup is fine to do later" — but worth saying out loud.

---

## D. Post-Launch Direction

### Q9. Are MAIL-03/04/05/06 still post-launch (not yet planned), or should one of them be promoted into v2.0?

**Why this is a real question.**
- MAIL-03 (weekly digest), MAIL-04 (90-day nudge), MAIL-05 (120-day auto-hide), MAIL-06 (saved-search alerts) are all listed under "Future Requirements > Email Automation"
- The 5-Edge-Function Resend setup is now production-ready — adding another email function is incremental work
- MAIL-04 + MAIL-05 are seeker-retention features; without them, a seeker who signed up but didn't get matched will go silent and never come back
- MAIL-06 depends on Phase 17 (Saved Search) — if Phase 17 ships in v2.0, MAIL-06 becomes much cheaper to add
- Question is whether v2.0 launch needs any retention email loop, or if a marketing-only launch is acceptable

**What "answered" looks like:** decide whether any MAIL-0X gets pulled into v2.0 scope, or all four stay in v2.x backlog.

---

### Q10. What's the milestone definition for v2.0 close → v2.1 open?

**Why this is a real question.**
- v2.0 goal: "Close 6 launch-critical gaps so TopFarms can go live"
- "Go live" is undefined (see Q2)
- Audit (2026-04-29) defines milestone-close differently from launch: "Critical Blockers (must fix before milestone close)" lists 3 items, "Public-Launch Blockers (separate from milestone close)" lists 2 items
- Implies milestone-close ≠ launch-ready. So when does v2.0 close vs v2.1 open?
- Closure rituals: `/gsd:audit-milestone` re-run, `/gsd:complete-milestone` to archive, REQUIREMENTS.md transition, ROADMAP.md transition, CLAUDE.md update if any v2.0 patterns codify
- Without an explicit milestone-close definition, work could drift into v2.0 forever

**What "answered" looks like:** explicit close criteria for v2.0 (e.g., "all 7 phases code-complete with VERIFICATION.md") and a separate launch-readiness checklist (per Q2). They are different things.

---

## E. Tech Stack & Operations (lower-priority but worth surfacing)

### Q11. Custom domain (`top-farms.vercel.app` → `topfarms.co.nz` or similar)?

**Why this is a real question.**
- CORS-01 references "Scope down to `https://top-farms.vercel.app` + `http://localhost:5173` once the production custom domain is stable" — implying a custom domain is on the roadmap
- PRIV-02 test snippet runs at `top-farms.vercel.app` — would change with domain
- Resend SPF/DKIM is set up for the sending domain (per MAIL-01) — coordination with the marketing/landing domain may be needed
- No phase or requirement currently captures this work
- This is platform-launch infrastructure, distinct from product features

**What "answered" looks like:** decide whether custom domain is pre-launch or post-launch, and which phase (if any) owns it.

---

### Q12. Stripe production-mode confirmation?

**Why this is a real question.**
- Stripe is in the tech stack from v1.0
- No artefact in `.planning/` confirms Stripe is in **production mode** (live keys, webhook endpoints registered to production URLs, idempotency tested in prod)
- v1.0 phase 5 (Revenue Protection) shipped with Stripe, but v1.1 milestone audit didn't explicitly verify prod-mode posture
- Without explicit confirmation, listing fees + placement fees may still be in test mode — first real customer could surface this in the worst possible way

**What "answered" looks like:** explicit verification that Stripe is in production mode end-to-end (live keys in env, webhook endpoint set to production URL, test transaction in prod). Maybe a UAT entry or a Phase 16 bundle.

---

## How to Use This Document

1. Sense-check session opens this file alongside `PRD-2026-05-01.md` and `STATUS-2026-05-01.md`
2. For each question, decide: **answer it**, **defer it explicitly to v2.1**, or **assign it to a phase**
3. Update REQUIREMENTS.md / ROADMAP.md / CLAUDE.md as decisions land
4. Then resume execution from `STATUS-2026-05-01.md` carryforwards

Questions that could not be answered in the sense-check session should be promoted to a `.planning/DECISIONS-PENDING.md` (or equivalent) so they don't get lost in conversation history.

---

*Snapshot generated: 2026-05-01 — handoff/sense-check export. Twelve open questions surfaced from cross-reference of source documents. No answers proposed; no source documents edited.*
