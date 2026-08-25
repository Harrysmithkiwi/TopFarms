---
phase: 15-email-pipeline-deploy
plan: "04"
subsystem: verification-backfill
tags: [verification, mail-01, mail-02, deploy-01, backfill, retrospective, partial-close]

requires:
  - phase: 15-email-pipeline-deploy/15-01
    provides: [list_edge_functions-snapshot, bfix05_audit, resend_domains_stub, deploy_log]
  - phase: 15-email-pipeline-deploy/15-03
    provides: [supabase-deploy-workflow, registry-repair-documented, ci-secrets-seeded]

provides:
  - 13-VERIFICATION.md
  - mail-01-mail-02-partial-close
  - phase-15-roadmap-complete
  - resend-api-key-carryforward-documented
  - migration-registry-repair-pattern-in-naming-md

affects:
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/phases/13-email-notifications/
  - .planning/v2.0-MILESTONE-AUDIT.md
  - supabase/migrations/NAMING.md

tech-stack:
  added: []
  patterns:
    - goal-backward-verification-backfill
    - partial-close-with-explicit-carryforward
    - requirements-roadmap-cross-reference

key-files:
  created:
    - .planning/phases/13-email-notifications/13-VERIFICATION.md
    - .planning/phases/15-email-pipeline-deploy/15-04-SUMMARY.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/v2.0-MILESTONE-AUDIT.md
    - supabase/migrations/NAMING.md

key-decisions:
  - "MAIL-01 kept [ ] (not [x]) — resend_domains.json is stub-only; no empirical Resend status captured; awaiting RESEND_API_KEY"
  - "MAIL-02 kept [ ] (not [x]) — notify-job-filled deployed and trigger live, but plan 15-02 deferred (RESEND_API_KEY unset); E2E delivery unverified"
  - "DEPLOY-01 stays [x] — CI infrastructure committed (workflow, config.toml, secrets, registry repair); first smoke test pending push"
  - "13-VERIFICATION.md verdict: gaps_found / PARTIAL across all 4 criteria — truthful over optimistic; carryforward documented in milestone audit"
  - "NAMING.md migration registry repair section added — CLI supabase migration repair is documented as incompatible with this project's naming convention"

patterns-established:
  - "Partial-close pattern: keep [ ] with explicit partial-close note when deploy is complete but E2E chain is unverified — do not fabricate [x] without empirical evidence"
  - "Carryforward pattern: milestone audit gets a named carryforward entry with effort estimate, blocker rationale, and numbered action steps"

requirements-completed: []

duration: 35min
completed: "2026-05-01"
---

# Phase 15 Plan 04: Verification Backfill + Phase 15 Closeout Summary

**Phase 13 VERIFICATION.md backfilled with truthful partial verdicts; MAIL-01/02 kept open with carryforward notes; Phase 15 marked complete in ROADMAP.md with explicit partial-close caveat; migration registry repair pattern documented in NAMING.md**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-01T01:32:39Z
- **Completed:** 2026-05-01
- **Tasks:** 3 plan tasks + 2 critical deviations (milestone audit + NAMING.md)
- **Files modified:** 6 (created 1, modified 5)

## Critical Deviation from Plan

The plan-as-written (15-04-PLAN.md) assumed plan 15-02 had run and produced empirical proof:
- `15-02-EVIDENCE/pg_net_response.json` (trigger fire 200)
- `15-02-EVIDENCE/inbox_screenshot.png` (email in inbox)
- `15-02-EVIDENCE/email_headers.txt` (DKIM=pass)

**15-02 was DEFERRED** because `RESEND_API_KEY` is unset in production. These artefacts do not exist. The plan-as-written would have instructed flipping MAIL-01/02 to `[x]` — that was overridden per explicit user instruction:

- MAIL-01: kept `[ ]` with partial-close note
- MAIL-02: kept `[ ]` with partial-close note
- 13-VERIFICATION.md verdicts: PARTIAL/DEFERRED (not SATISFIED)

## Cross-Plan Evidence Map

| ROADMAP Phase 13 Criterion | Evidence File | Verdict |
|---|---|---|
| #1 SPF/DKIM Verified (MAIL-01) | `.planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/resend_domains.json` — **STUB ONLY** (RESEND_API_KEY unset) | PARTIAL |
| #2 Test email in inbox (MAIL-01) | No 15-02-EVIDENCE — plan 15-02 deferred | DEFERRED |
| #3 Filled-job notification fires for NOTIFY_STATUSES (MAIL-02) | `.planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/list_edge_functions.json` (notify-job-filled ACTIVE v1); `.planning/phases/15-email-pipeline-deploy/15-01-EVIDENCE/bfix05_audit.txt` (AUDIT RESULT: PASS); code audit of index.ts NOTIFY_STATUSES | PARTIAL (deploy PASS; E2E delivery deferred) |
| #4 Terminal-status applicants excluded (MAIL-02) | Code audit: IN clause excludes hired/declined/withdrawn; MarkFilledModal race fix in commit `17378fc` | PARTIAL (code PASS; empirical negative-case deferred) |

## Doc-State Edits

### REQUIREMENTS.md

**MAIL-01 before:**
```
- [x] **MAIL-01**: ... (reset 2026-04-29 from `[x]` — Phase 13 missing VERIFICATION.md; reassigned to Phase 15 for verification backfill)
```

**MAIL-01 after:**
```
- [ ] **MAIL-01**: ... Code deployed; awaiting `RESEND_API_KEY` production secret + 15-02 E2E verification before satisfaction. Carryforward to post-Phase-15. (... partial-close note added 2026-05-01 via 13-VERIFICATION.md backfill)
```

**MAIL-02 before:**
```
- [x] **MAIL-02**: ... (reset 2026-04-29 from `[x]` — `notify-job-filled` Edge Function not deployed live; trigger fires-but-fails-silently. Reassigned to Phase 15)
```

**MAIL-02 after:**
```
- [ ] **MAIL-02**: ... Code deployed and reachable. Trigger no longer 404s. Awaiting `RESEND_API_KEY` production secret + 15-02 E2E verification before satisfaction. Carryforward to post-Phase-15. (... partial-close note added 2026-05-01 via 13-VERIFICATION.md backfill)
```

### ROADMAP.md

**Phase 15 entry before:**
```
- [ ] **Phase 15: Email Pipeline Deploy & Verify** — ... confirm Resend `Verified`, backfill Phase 13 VERIFICATION.md
```

**Phase 15 entry after:**
```
- [x] **Phase 15: Email Pipeline Deploy & Verify** — ... add Supabase CI deploy step, backfill Phase 13 VERIFICATION.md (completed 2026-05-01; MAIL-01/02 partial-close — RESEND_API_KEY unset, plan 15-02 deferred; see carryforward in v2.0-MILESTONE-AUDIT.md)
```

**Progress table before:**
```
| 15. Email Pipeline Deploy & Verify | 2/4 | In Progress|  | — |
```

**Progress table after:**
```
| 15. Email Pipeline Deploy & Verify | v2.0 | 4/4 | Complete (MAIL-01/02 partial-close; 15-02 deferred) | 2026-05-01 |
```

## Phase 15 Outcome

| Plan | Outcome | Atomic Commits |
|------|---------|----------------|
| 15-01 | 4 disk-only Edge Functions deployed live; BFIX-05 PASS; RESEND_API_KEY gap documented | `b061b9b`, `6070b1a`, `a445eb7`, `099a71f` |
| 15-02 | DEFERRED — RESEND_API_KEY unset in production; email delivery chain unverified end-to-end | — |
| 15-03 | supabase-deploy.yml + config.toml committed; migration registry repaired (Studio INSERT); CI secrets seeded; first run deferred (unpushed commits) | `edcde3a`, `e1afd2d`, `e5c5390` |
| 15-04 | 13-VERIFICATION.md backfill (truthful PARTIAL verdicts); REQUIREMENTS.md + ROADMAP.md partial-close edits; milestone audit + NAMING.md carryforward docs | `b57bcb3`, `cad2b02`, `008252a`, `92429e5` |

## Carry-Forward Items

**1. RESEND_API_KEY production secret (critical path)**
- Action: `supabase secrets set RESEND_API_KEY=<key> --project-ref inlagtgpynemhipnqvty`
- Unblocks: email delivery from all 4 email-sending functions + plan 15-02 execution
- Documented in: `v2.0-MILESTONE-AUDIT.md §Carryforward`

**2. Plan 15-02 execution (MAIL-01/02 satisfaction)**
- After RESEND_API_KEY is set, execute `.planning/phases/15-email-pipeline-deploy/15-02-PLAN.md` end-to-end
- Once 15-02 produces evidence, flip MAIL-01 + MAIL-02 to `[x]` and update 13-VERIFICATION.md criteria 1-4 to SATISFIED

**3. Phase 15 first CI smoke test**
- Action: `git push && gh workflow run supabase-deploy.yml --ref main`
- Expected: migrations PASS + functions PASS (or NOTIFY-ONLY)
- Documented in: `v2.0-MILESTONE-AUDIT.md §Carryforward`

**4. Phase 16 unblocked**
- `get-applicant-document-url` was already deployed before Phase 15 (ACTIVE v3 in list_edge_functions.json)
- Phase 16 (PRIV-02 empirical test) can proceed — it depends on Phase 15 completing, which is now done

**5. Phase 18 tech debt**
- Phase 12/13 VALIDATION.md `nyquist_compliant` finalisation — Phase 18 territory
- 13-01-SUMMARY.md frontmatter `requirements-completed` empty — cleanup backlog

## Atomic Commit Note

Per CLAUDE.md §4. Plan 15-04 produced 4 commits across 3 tasks + 2 deviations:
1. `b57bcb3` — docs(15-04): backfill 13-VERIFICATION.md (Task 1)
2. `cad2b02` — docs(15-04): partial-close REQUIREMENTS.md + ROADMAP.md (Task 2 + Deviation 1)
3. `008252a` — docs(15-04): milestone audit carryforward entries (Deviation 2)
4. `92429e5` — docs(15-04): NAMING.md registry repair pattern (Deviation 3)

## Deviations from Plan

### Deviation 1 — MAIL-01/02 partial-close (user instruction)

**Trigger:** Plan-as-written assumed 15-02 ran and produced empirical proof. 15-02 was deferred (RESEND_API_KEY unset).

**Override:** User explicitly instructed: keep MAIL-01/02 as `[ ]` with partial-close notes. Do NOT flip to `[x]` without empirical evidence. This overrides Task 2's action instructions.

**Treatment:**
- 13-VERIFICATION.md: PARTIAL verdicts (not SATISFIED) for all 4 criteria
- REQUIREMENTS.md: `[ ]` preserved; partial-close notes added
- ROADMAP.md: Phase 15 flipped `[x]` but with explicit partial-close caveat
- `v2.0-MILESTONE-AUDIT.md`: carryforward entry added with action steps

### Deviation 2 — v2.0-MILESTONE-AUDIT.md carryforward (user instruction)

Added two carryforward entries to `.planning/v2.0-MILESTONE-AUDIT.md`:
1. RESEND_API_KEY + MAIL-01/02 E2E verification
2. Phase 15 first CI smoke test

### Deviation 3 — NAMING.md migration registry repair (user instruction)

Added `## Supabase Migration Registry Repair` section to `supabase/migrations/NAMING.md` documenting:
- Why CLI `supabase migration repair` fails for this project
- Studio SQL INSERT as the correct repair approach
- Example SQL from plan 15-03 with verification SELECT

---

## Self-Check

- 13-VERIFICATION.md: FOUND, 177 lines, 4 verdict blocks, references 15-01-EVIDENCE
- REQUIREMENTS.md MAIL-01: `[ ]` confirmed
- REQUIREMENTS.md MAIL-02: `[ ]` confirmed
- ROADMAP.md Phase 15: `[x]` with partial-close caveat confirmed
- ROADMAP.md Progress table: 4/4 Complete 2026-05-01 confirmed
- v2.0-MILESTONE-AUDIT.md: Carryforward section added confirmed
- NAMING.md: Registry repair section added confirmed

## Self-Check: PASSED

---
*Phase: 15-email-pipeline-deploy*
*Completed: 2026-05-01*
