---
phase: 22-pre-launch-p0-closure
plan: "04"
subsystem: prod-uat
tags: [prod-uat, postgrest, supabase, vercel, ci-deploy, requirements-flip, claude-7]

# Dependency graph
requires:
  - phase: 22-pre-launch-p0-closure
    provides: "Wave 1 P0 fixes (22-01 SIGNUP-01 toast 0e8c3a5 / 22-02 HOMEBUG-02 listing_tier 9ca41ad / 22-03 HOMEBUG-03 accommodation 231d17b)"
  - phase: 18.1-pre-launch-hardening
    provides: "HOMEBUG-01 platform_stats RPC remediation (2026-05-03 BLOCK 3 §2 Studio re-apply of phantom-applied migration 012)"
  - phase: pre-Phase-22 (commit d5e8dfc + 2026-05-03 BLOCK 1)
    provides: "UXBUG-01 fix (frontend reads accommodation_extras, schema 013 ALTER TABLE DROP COLUMN re-applied via Studio)"
provides:
  - "All 5 P0 items (SIGNUP-01, HOMEBUG-02, HOMEBUG-03, HOMEBUG-01, UXBUG-01) flipped [ ] → [x] in REQUIREMENTS.md with §7-satisfied closure notes"
  - "Empirical prod evidence per P0 captured in 22-04-UAT-EVIDENCE.md (Tasks 3-7)"
  - "supabase-deploy CI workflow gated to workflow_dispatch-only until §6 pooler auth resolves (c30a867)"
  - "Migration registry backfill for 023-033 (11 rows added via Studio SQL Editor bypassing pooler)"
  - "Post-launch live-UAT carryforward in v2.0-MILESTONE-AUDIT.md (4 items requiring re-verification at scale with real data)"
  - "Carryforward for §6 pooler auth + 018-022 timestamp/filename drift (both block migrations CI re-enable; paired in dedicated pre-flight phase)"
affects: [Phase 22 verifier (5 P0 closure proves Wave 2 + Wave 3 satisfied), REQUIREMENTS.md (5 flips), v2.0 milestone close (PEND-01 becomes single remaining blocker)]

# Tech tracking
tech-stack:
  added: []  # No new code dependencies — pure UAT + closure work
  patterns:
    - "API-layer direct curl for PostgREST-fix UAT (HOMEBUG-02 + HOMEBUG-01): operator-accepted canonical evidence per CLAUDE §7 when fix is at API layer with no Layer 1/3 transformation"
    - "Multi-layer evidence for user-visible UX bugs with multi-layer fix chains (HOMEBUG-03 + UXBUG-01): primary authenticated browser end-to-end + supplementary service-role SQL + supplementary frontend source verification"
    - "Atomic per-item REQUIREMENTS flips (operator preference 2026-05-22): each P0 closure committed atomically with its UAT evidence rather than batched at end — better traceability + faster gap recovery if any single item fails"
    - "Studio SQL Editor for one-off DB writes bypassing pooler (CLAUDE §2): registry backfill for 023-033 + verification via MCP list_migrations rather than CLI db push dry-run"
    - "Carryforward discipline: §6 + 018-022 drift + 4-item post-launch live-UAT all written into v2.0-MILESTONE-AUDIT.md to survive context resets"

key-files:
  created:
    - ".planning/phases/22-pre-launch-p0-closure/22-04-UAT-EVIDENCE.md (8 tasks; ~370 lines; canonical evidence file for Phase 22 Wave 2)"
    - ".planning/phases/22-pre-launch-p0-closure/22-04-p0-prod-smoke-SUMMARY.md (this file)"
  modified:
    - ".planning/REQUIREMENTS.md (5 P0 flips + 5 change-log entries)"
    - ".planning/v2.0-MILESTONE-AUDIT.md (3 new carryforward sections + 4 post-launch UAT items)"
    - ".github/workflows/supabase-deploy.yml (migrations CI gated to workflow_dispatch)"
    - ".gitignore (.claude/scheduled_tasks.lock + .claude/settings.local.json added)"
    - ".planning/STATE.md (updated stopped_at + last_activity through 2026-05-26)"
    - "supabase/migrations/029_pg_net_webhook_secret_vault.sql (committed to git history via 67f874f — was untracked; load-bearing for handle_job_filled vault read)"

key-decisions:
  - "Push-vs-investigate decision tree (2026-05-21): operator-driven investigation surfaced 80-commit scope (vs ~3 assumed by plan) + Studio-applied migrations 023-033 + §6 pooler auth still unresolved. Three-step preparation (commit 029 / Studio registry backfill / workflow gate) before the push. Avoided a CI failure cascade that would have blocked all P0 closure."
  - "API-layer curl is canonical evidence (2026-05-22 operator decision applied to HOMEBUG-02): direct PostgREST 400→200 contrast at the URL the browser hits is stronger than browser Network tab read, especially when the fix is at a single layer (no Layer 1/3 transformation). Reused for HOMEBUG-01 (404→200 RPC contrast)."
  - "Browser+SQL+source for user-visible UX bugs (2026-05-23 operator decision applied to HOMEBUG-03, repeated 2026-05-26 for UXBUG-01): when the fix touches multiple layers (URL params → frontend remap → DB column) and the user-visible symptom is silent (empty result rather than 400), browser end-to-end is canonical and SQL+source are supplementary belt-and-braces."
  - "Atomic per-item flips, not batched (2026-05-22): each P0 closure committed atomically with its UAT evidence. Plan §Task 8 batch flip reframed as no-op + closure summary. Better traceability; if one item failed mid-way the others would not be unwound."
  - "§6 pooler auth + 018-022 drift carryforward (2026-05-21): both block migrations CI re-enable but neither is in scope for Phase 22 (P0 code defect closure). Carried forward to v2.0-MILESTONE-AUDIT.md for a dedicated pre-flight phase. Migration changes continue to land via Studio per CLAUDE §2 in the interim."
  - "Post-launch live-UAT 4-item carryforward (2026-05-23 + 2026-05-26 operator requests): Phase 22 Wave 2 proved code fixes empirically but test dataset was limited (1 active job, 1 employer profile, 0 paid listings). Real-data re-verification required at scale; carryforwarded to post-launch UAT log rather than re-opening closed requirements."

patterns-established:
  - "Three-step push preparation when origin diverges by >10 commits: (1) verify all migrations are applied + registry-registered via MCP read-only sweep, (2) gate CI workflows that depend on broken infrastructure, (3) operator-authorize the push only after pre-flight passes. Avoids surprise CI cascade failures."
  - "Evidence path matrix for prod UAT: choose curl vs browser vs SQL+source vs combinations based on (a) is the fix single-layer or multi-layer, (b) is the user-visible symptom loud (400) or silent (empty result), (c) operator setup cost for browser path. Default to canonical-API-layer when single-layer + loud; default to browser+SQL+source when multi-layer + silent."
  - "Per-item atomic REQUIREMENTS flips with §7-satisfied closure notes referencing (a) original log date + framing, (b) code-fix commit hash + reasoning, (c) deploy commit hash + Vercel bundle hash, (d) empirical evidence pointer to UAT-EVIDENCE.md task section. Mirror the convention across all 5 P0 closures established this plan."

requirements-completed:
  - "SIGNUP-01 (closed 2026-05-22, commit a6cc3f5)"
  - "HOMEBUG-02 (closed 2026-05-22, commit 73ed245)"
  - "HOMEBUG-03 (closed 2026-05-23, commit 9673eb1)"
  - "HOMEBUG-01 (closed 2026-05-26, commit fb60aa2)"
  - "UXBUG-01 (closed 2026-05-26, this commit)"

# Metrics
metrics:
  tasks_completed: "8 of 8 (Tasks 1-2 pre-resolved via operator-driven investigation + Prep-A/B/C; Tasks 3-7 each ran as operator-driven UAT checkpoint + atomic closure commit; Task 8 reframed as no-op summary)"
  commits_landed: "6 (67f874f + c30a867 + a6cc3f5 + 73ed245 + 9673eb1 + fb60aa2 + this commit = 7 total across Phase 22 plan 22-04 prep + UAT closure)"
  p0_items_closed: "5 of 5 (100%)"
  uat_evidence_lines: "~370 lines (22-04-UAT-EVIDENCE.md)"
  carryforwards_added: "4 to v2.0-MILESTONE-AUDIT.md (3 sections: §6 pooler auth + 018-022 drift + 4-item post-launch UAT)"
  ci_run_outcome: "supabase-deploy run 26256528587 SUCCESS — migrations job correctly skipped per gate, functions job deployed all 11 functions in ~22s"
  vercel_deploy: "Bundle index-Dmwiy3oc.js shipped; Vercel READY 2026-05-21T22:22:54Z"
  duration: "2026-05-21 (push + Task 3 SIGNUP-01) through 2026-05-26 (Tasks 6 HOMEBUG-01 + 7 UXBUG-01 + 8 closure) — 6 calendar days, ~5 operator UAT sessions"
---

# Phase 22 Plan 22-04 — P0 Prod Smoke Battery

## Outcome

All 5 pre-launch P0 items (SIGNUP-01, HOMEBUG-02, HOMEBUG-03, HOMEBUG-01, UXBUG-01) empirically closed against deployed production with §7-satisfied evidence chains. REQUIREMENTS.md flips committed atomically per-item with full closure notes. Phase 22 plan 22-04 COMPLETE.

## What Was Built

This was an UAT + closure plan, not a code-change plan — no source code shipped. The deliverables:

1. **Pre-push preparation** (Tasks 1-2 + Prep-A/B/C):
   - Investigation surfaced 80-commit push scope vs ~3 assumed; surfaced Studio-applied migrations 023-033 not in registry; surfaced §6 pooler auth still unresolved
   - Committed migration 029 to git history (was untracked but applied in prod since 2026-05-10)
   - Backfilled supabase_migrations.schema_migrations registry for 023-033 (11 rows) via Studio SQL Editor — bypassed pooler per CLAUDE §2
   - Gated supabase-deploy migrations CI job to `workflow_dispatch` only — protects against the broken pooler auth path
   - Added .claude/scheduled_tasks.lock + .claude/settings.local.json to .gitignore
   - Wrote §6 + 018-022 carryforward into v2.0-MILESTONE-AUDIT.md
2. **Push to main** (Task 2): 82 commits delivered (`f14eda0..c30a867`). supabase-deploy CI run `26256528587` SUCCESS — migrations correctly skipped per gate, functions job deployed all 11 functions in ~22s via `--use-api` (PAT auth). Vercel auto-deploy READY 2026-05-21T22:22:54Z, bundle `index-Dmwiy3oc.js`.
3. **Per-P0 UAT + closure** (Tasks 3-7):
   - Task 3 SIGNUP-01 — operator browser UAT, toast persists indefinitely, X close button visible — closed `a6cc3f5`
   - Task 4 HOMEBUG-02 — direct PostgREST curl 400→200 contrast (operator-accepted as canonical API-layer evidence) — closed `73ed245`
   - Task 5 HOMEBUG-03 — authenticated browser end-to-end (full Layer 1→2→3 chain) + supplementary service-role SQL proof — closed `9673eb1`
   - Task 6 HOMEBUG-01 — direct PostgREST RPC curl 404→200 contrast — closed `fb60aa2`
   - Task 7 UXBUG-01 — authenticated employer browser end-to-end + supplementary schema + source verification — closed (this commit)
4. **Final closure** (Task 8): reframed as no-op summary since flips were atomic per-item. UAT-EVIDENCE.md Task 8 section captures the audit trail.
5. **Carryforward**: 4-item post-launch live-UAT backlog added to v2.0-MILESTONE-AUDIT.md (accommodation re-verification at scale, featured listings rendering with real paid tiers, cold-start UX, employer onboarding accommodation flow at scale).

## Notable Deviations

- **Plan §Task 1 STOP gate triggered an out-of-plan investigation cycle** (2026-05-21) when pre-flight surfaced 80-commit push scope + Studio-applied migrations not in registry + §6 still unresolved. Resolution required commit 029, Studio registry backfill, workflow patch, and v2.0 audit carryforward — all before the push could proceed safely. The "Task 1" placeholder expanded into Prep-A/B/C sub-tasks. This deviation was operator-authorized at each gate.
- **Plan §Task 4-7 evidence methodology was operator-driven per item** rather than uniform. HOMEBUG-02 + HOMEBUG-01 used API-layer curl (single-layer fixes, loud 400/404 contrast). HOMEBUG-03 + UXBUG-01 used browser+SQL+source (multi-layer fixes, silent empty-result symptoms). SIGNUP-01 used browser only (single-layer fix but UI-visible Sonner persistence). This established the evidence-path matrix as a reusable pattern for future UAT plans.
- **Plan §Task 8 batched-flip reframed as no-op + closure summary** — atomic per-item flips throughout Tasks 3-7 (operator decision 2026-05-22). Outcome equivalent; better traceability.

## Self-Check

**PASSED.**

- ✓ All 5 P0 items flipped in REQUIREMENTS.md with §7-satisfied closure notes
- ✓ UAT-EVIDENCE.md populated through Task 8
- ✓ Atomic commits land per-item with traceable evidence chains
- ✓ STATE.md updated (frontmatter + body)
- ✓ Carryforwards written to v2.0-MILESTONE-AUDIT.md (§6 + 018-022 + 4-item post-launch UAT)
- ✓ Plan SUMMARY.md (this file) written before final commit
- ✓ Working tree clean post-commit
- ✓ Phase 22 plan 22-04 status: COMPLETE 2026-05-26

## Next Phase Readiness

**Phase 22 plan 22-05 (Mail Docs Audit) is the last plan in Phase 22.** Per `.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md` §6 critical_research_corrections, the ROADMAP Phase 22 description's MAIL-01/02 re-fire item is OBSOLETE — MAIL-01/02 already at `[x]` in REQUIREMENTS.md since 2026-05-03 (plan 15-02 evening run produced full §7 evidence: pg_net 200, DKIM=pass, per-applicant 4/4). Plan 22-05 is a lightweight docs audit closing out that obsolete description, not an E2E re-run.

After plan 22-05 + Phase 22 verifier:
- **PEND-01 (Stripe live-mode swap)** remains as the single v2.0 milestone close blocker per CLAUDE §7 partial-close discipline
- 9-item checklist in `.planning/DECISIONS-PENDING.md` PEND-01 row; <30 min effort in a separate dedicated session
- After PEND-01: `/gsd:complete-milestone v2.0` unblocked

Carryforwards (NOT blockers for v2.0 close, but inputs to v2.1 / post-launch):
- §6 pooler auth + 018-022 migration registry drift (paired dedicated pre-flight phase before migrations CI re-enable)
- 4-item post-launch live-UAT backlog (re-verify at scale once real employer + seeker traffic exists)
- Item #16 JWT signing key migration HS256 → ES256/JWKS (Phase 18.1 SC-3 dependency)
- Cosmetic Sonner toast top-left vs top-right position observation (orthogonal to SIGNUP-01)
