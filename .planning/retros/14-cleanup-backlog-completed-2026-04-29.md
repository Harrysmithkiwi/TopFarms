# Cleanup-Session Backlog (archived — completed 2026-04-29)

**Created:** 2026-04-29 — post-Phase-14 close (commit `e8f0882` on `origin/main`)
**Closed:** 2026-04-29 — all 7 items resolved across 5 atomic commits
**Owner:** Harry / next-session Claude
**Lifecycle:** This file is the natural opener for the cleanup mini-session (~1 hour). Items land in execution order below. Delete or archive this file once every item is closed — `git status` surfacing it on next session is the deliberate workflow trigger.

**Standing rules carried forward** (re-establish at session start): project-scoped MCP only (`inlagtgpynemhipnqvty`), `--read-only` ON by default, atomic commits one-phase-per-commit, diagnose-before-fix, defence-in-depth, show SQL/code body inline before any write, both flag-flip directions show diff with `/mcp Reconnect` after each.

---

## Closing outcomes (added 2026-04-29)

| Item | Status | Closing commit | Notes |
|---|---|---|---|
| 1. CLAUDE.md house rules | ✅ closed | `fb5c071` | 6 rules folded to 5; rule 5 code snippet trimmed; loads every session |
| 2. AUTH-RETRO doc | ✅ closed | `fb5c071` | Three-arc saga (AUTH-FIX / AUTH-02 / BFIX-05) with cross-arc lessons |
| 3. Phase 14 SUMMARY.md per sub-phase | ✅ closed | `753cab8` | 14-01 / 14-02 / 14-03 SUMMARY.md generated post-hoc |
| 4. /gsd:validate-phase 14 | ✅ closed | `2213c7e` | State B post-hoc audit; 4 stale tests repaired (intent-preserving rewrite); 119 tests passing; row-B specs deferred per TEST-01 |
| 5. Migration-naming decision doc | ✅ closed | `9a111ee` | Sequence-prefix on disk; live registry uses CLI timestamps; lookup table in `supabase/migrations/NAMING.md` |
| 6. Migration 017 apply | ✅ closed | `0d6d633` | Applied via Studio SQL Editor (MCP flag-flip protocol gap discovered: `/mcp Reconnect` doesn't respawn the subprocess). Runtime artefacts verified via read-only MCP queries. CLAUDE.md rule 2 corrected. |
| 7. 14-VERIFICATION.md disposition | ✅ closed | `753cab8` | Option (b) — refreshed for post-amend state, BFIX-01 doc-state lag flipped to reconciled |

## Discoveries during cleanup-session (logged into project-level docs)

- **Migration registry-row absence pattern**: Studio-applied migrations (016, 017) don't write `supabase_migrations.schema_migrations` rows. `list_migrations` is not the full source of truth for what's deployed. Documented in `supabase/migrations/NAMING.md` and DEPLOY-01.
- **MCP flag-flip protocol gap**: `/mcp Reconnect` re-establishes the connection but does NOT respawn the npx subprocess. Mid-session toggling of `--read-only` doesn't propagate via reconnect alone. CLAUDE.md rule 2 corrected with empirical-reality protocol; AUTH-RETRO.md footnote captures the discrepancy with Phase 14's apparently-working flips.
- **`name`-argument drift on `apply_migration`**: 018 + 020 omitted the `NNN_` prefix; 019 included it. Going-forward convention codified in NAMING.md: match disk filename stem with prefix.
- **Two stale tests pre-cleanup**: `seeker-step3-documents.test.tsx` (BFIX-03 broke FileDropzone/document_urls assertions) and `select-role.test.tsx` (AUTH-02 replaced direct INSERT with set_user_role RPC). Both repaired in commit `2213c7e` to test original intent against new architecture.

## Carryforwards (still open after cleanup-session)

- **PRIV-02** — B.9 identity-bypass empirical test against deployed `get-applicant-document-url`. Public-launch blocker.
- **UAT-04** — Google OAuth → SelectRole → `user_roles` round-trip empirical test. Public-launch readiness.
- **DEPLOY-01 (Edge Function side)** — 4 functions on disk not deployed live (`acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails`). Migration 017's trigger is now live but fires-but-fails-silently until `notify-job-filled` Edge Function ships.
- **Migration 016 deploy-trail unknown** — runtime artefacts presumably live (Phase 11 features have been working) but registry has no row. No action needed unless empirical issue surfaces.

## Phase 14 milestone state

Fully closed at the cleanup-session end. Ready for `/gsd:audit-milestone` if pursuing the GSD milestone archive flow, or move directly to Milestone 4 (Matching Engine, ~2-3 days per the original handoff).

---

## Execution order

Items 1–2 land first as foundations. Items 3–4 build on closed Phase 14 context while it's fresh. Item 5 is independent analysis/decision. Item 6 is a DB write requiring its own `--read-only` flag-flip cycle and should be staged separately. Item 7 is a quick disposition decision — pair with whichever commit it most naturally fits.

---

## 1. CLAUDE.md house rules

Codify the standing rules from this session into project-level CLAUDE.md so they survive session resets and apply to every future Claude in this repo.

**Scope / notes:**
- Diagnose-first / show SQL + code body before any write — no silent edits, even on docs
- Gateway-trust pattern for `verify_jwt: true` Edge Functions: trust the gateway's signature verification, decode JWT payload locally for `sub`, validate `aud === 'authenticated'`. Do NOT call `adminClient.auth.getUser(token)` on a service-role-keyed client — it routes the auth API differently and rejects valid ES256 tokens. Reference implementation: `supabase/functions/get-applicant-document-url/index.ts:75-94` (BFIX-05 fix).
- `--read-only` ON as default for Supabase MCP; flip OFF only for known DB writes; flip back ON immediately after; `/mcp Reconnect` between each flip; show diff in both directions.
- Atomic commits — one phase per commit. Amend within the same atomic-commit-window if internal consistency requires it (precedent: BFIX-02/03 + BFIX-01 docs flips amended into Phase 14-03 commit).
- Flag-flip diff discipline — never silent state changes; every `--read-only` toggle gets a diff and a `/mcp Reconnect`.

---

## 2. AUTH-RETRO

Write `.planning/retros/AUTH-RETRO.md` documenting the multi-session AUTH+BFIX-05 saga so future-Claude doesn't re-derive the lessons.

**Scope / notes:**
- Three commits to land BFIX-05 (`get-applicant-document-url` Edge Function): initial deploy → first auth-rejection diagnosis → second JWT-decode diagnosis → final gateway-trust fix. Document the diagnostic chain.
- What worked: diagnose-first preventing premature "fix" commits; reading actual function logs vs. assuming; surfacing the service-role-keyed-client routing quirk via empirical test rather than docs guess.
- Memorialise the gateway-trust JWT decode pattern as a transferable artefact — referenced from CLAUDE.md item 1, full prose lives in the retro.
- Earlier auth context worth co-locating: AUTH-FIX (centralised auth state in AuthProvider, 2fce4b7), AUTH-FIX-02 (mitigated symptom of c6066ea 3s loadRole timeout), AUTH-02 (set_user_role RPC).

---

## 3. SUMMARY.md generation for Phase 14

Close the plan-cycle hygiene gap surfaced by the verifier: sibling phases 12 and 13 have SUMMARY.md files, Phase 14 doesn't.

**Scope / notes:**
- Generate `.planning/phases/14-bug-fixes/14-01-SUMMARY.md`, `14-02-SUMMARY.md`, `14-03-SUMMARY.md`.
- Source material: each PLAN.md + closing commit body + verifier evidence in `14-VERIFICATION.md` + REQUIREMENTS.md status flips.
- Cosmetic gap, not blocking. But hygiene matters for the milestone-archive step that comes after this cleanup.
- Single commit, message like `docs(14): SUMMARY.md for sub-phases 14-01/14-02/14-03`.

---

## 4. /gsd:validate-phase 14

Nyquist test-coverage gap audit + test generation for the closed phase. Deferred from the push gate because it writes new test files to disk — that's cleanup-session work, not pre-push verification.

**Scope / notes:**
- Skill description: "Retroactively audit and fill Nyquist validation gaps for a completed phase."
- Will likely produce Playwright/Vitest specs for BFIX-01/02/03 deliverables — coverage that TEST-01 in REQUIREMENTS.md flagged as deferred.
- Separate atomic commit when complete. Do NOT mix with cleanup item 5 or 6.
- Pair with item 3 (SUMMARY.md) since both close the Phase 14 plan-cycle.

---

## 5. Migration-naming retro / decision

Decide and document the project-wide migration-naming convention. Currently drifting: live registry uses timestamp-style versions (`20260429031148`) for migrations 018+, but disk filenames use sequential prefixes (`020_*.sql`).

**Scope / notes:**
- Both conventions are referencing the same SQL bodies; the drift is cosmetic but compounds as repo debt — fresh checkouts can't easily reconcile disk → live without manual cross-reference.
- Pick one: timestamp-style (`20260429031148_seeker_documents_employer_policy.sql`) or sequence-prefix (`020_seeker_documents_employer_policy.sql`).
- Sequence-prefix is more readable in `git log`/`ls`; timestamp-style is what Supabase CLI generates by default and what the live registry uses.
- Apply the decision: rename all post-018 migrations on disk to match the chosen convention OR document the dual-naming intentionally with a `MIGRATIONS.md` lookup table.
- Output: a short decision doc + (if rename chosen) a single rename commit.

---

## 6. Migration 017 apply (notify-job-filled webhook)

Apply `supabase/migrations/017_notify_job_filled_webhook.sql` to live. Live DB has been 1 migration behind disk since Phase 14-01 — DEPLOY-01 in REQUIREMENTS.md.

**Scope / notes:**
- DB write — requires `--read-only` OFF flip cycle. Do this in its OWN session/window so it doesn't get conflated with doc work.
- Sequence: review SQL inline → flip `--read-only` OFF → `/mcp Reconnect` → `apply_migration` via Supabase MCP → flip `--read-only` ON → `/mcp Reconnect` → verify via read-only query.
- Atomic commit-or-no-commit decision: applying a migration via MCP doesn't change the working tree. The disk file already exists. So this is operationally a deploy step, not a code commit. Log via REQUIREMENTS.md update or a tiny ops-log entry only.
- Cross-reference: DEPLOY-01 widening already notes 4 Edge Functions also undeployed (`acknowledge-placement-fee`, `create-placement-invoice`, `notify-job-filled`, `send-followup-emails`). Decide separately whether to deploy those or leave for Milestone 4.

---

## 7. 14-VERIFICATION.md disposition

The gsd-verifier wrote `.planning/phases/14-bug-fixes/14-VERIFICATION.md` during the Phase 14 push session. It was held out of `e8f0882` because the report explicitly recommends "user should flip BFIX-01 checkbox" — committing alongside the commit that flipped it would be self-inconsistent.

**Three options — pick one in cleanup session:**

- **(a) Commit as-is.** Preserves the verifier's pre-flip recommendation as historical record. Honest snapshot of the verification moment. Slight downside: a future reader sees a stale recommendation against the very file that was flipped in the same commit being verified.
- **(b) Refresh and commit.** Re-run a quick verification pass post-flip (or hand-edit the relevant section) so the report reflects post-amend state. Cleaner snapshot of "verified state at push." Cost: ~5 min edit + provenance question (who edited the agent's report?).
- **(c) Leave uncommitted as session scratch.** Drop into `.gitignore` or just leave untracked indefinitely. Lowest commitment. Loses the artefact value (next reviewer can't see the verification provenance from git history).

**Recommendation:** option (b) — refresh + commit. The verifier's value is the snapshot-of-truth artefact, and the post-amend state IS the truth as of `e8f0882`. Hand-edit the BFIX-01 section to "PASS — REQUIREMENTS.md reconciled in this commit" and commit alongside or after item 3 (SUMMARY.md generation).

---

## Closeout

Once all 7 items are closed:
1. Final `git status` — should show no `.planning/CLEANUP-BACKLOG.md` (deleted) and no `.planning/phases/14-bug-fixes/14-VERIFICATION.md` (committed per item 7 disposition).
2. Optional: archive a copy of this file to `.planning/retros/14-cleanup-backlog-completed-YYYY-MM-DD.md` for posterity, then delete the working file.
3. Phase 14 milestone is then fully closed — ready for `/gsd:audit-milestone` if pursuing the GSD milestone archive flow, or move directly to Milestone 4 (Matching Engine, ~2-3 days per the original handoff).
