---
phase: 21-v20-close-post-launch-ops
plan: 08
subsystem: ui-badge-surfacing
tags: [phase-21, track-b, documents-verified-badge, applicant-panel, employer-ux]
requirements:
  closed:
    - DOC-QUEUE-04
    - DOC-QUEUE-BADGE-SURFACE-01
dependency_graph:
  requires:
    - 21-00 (Wave 0 test scaffold — provides documents-verified-badge.test.tsx with 4 .todo stubs)
    - 21-01 (migration 032 — seeker_documents.status column + SeekerDocumentStatus type export)
  provides:
    - DocumentsVerifiedBadge stateless component surface usable from any seeker-context UI
    - Employer-visible "Documents Verified" signal on applicant card header (no expand required)
  affects:
    - 21-09 (Wave 6 milestone close — UAT can browser-verify badge appears post-approve flow)
tech_stack:
  added: []
  patterns:
    - "Stateless badge composition over existing Tag primitive (Tag variant='green' + Lucide icon)"
    - "Predicate-only head-count Supabase query (count: 'exact', head: true, limit 1) for boolean-from-table without row payload"
    - "Cancellation-flag cleanup in useEffect for async data fetch (let cancelled = false in effect body, set true in cleanup)"
key_files:
  created:
    - src/components/ui/DocumentsVerifiedBadge.tsx
  modified:
    - src/components/ui/ApplicantPanel.tsx
    - tests/documents-verified-badge.test.tsx
decisions:
  - "Scenario B chosen for ApplicantPanel integration: lightweight head-count query scoped to seeker_id + status='approved' filter + limit 1. ApplicantDocuments (existing child) keeps its own fetch unchanged; lifting its state up would have required prop threading + a refactor across multiple call sites. The extra round-trip is bounded (one HEAD request per panel mount) and per-applicant scoped (no N+1)."
  - "Badge placed in collapsed-row header (next to seekerLabel) NOT inside expanded panel — employers see the verification signal in the list view without needing to expand each card, matching CONTEXT.md 'visible to employers on applicant cards/panels' literal."
  - "Atomic single commit (bb4bc82) per CLAUDE §4 + plan §success_criteria literal commit message. Matches Phase 17-01/02/03/04, 18.1-03, 20.1-01/02/03/04 atomic-bundle precedent. Splitting Task 1 (component+tests) from Task 2 (panel integration) would have produced 2 commits for what is logically one Wave 5 deliverable."
  - "Cancellation flag in the useEffect (let cancelled = false … return () => { cancelled = true }) over an AbortController — Supabase JS client doesn't accept AbortSignal on .then() chains; the flag pattern is the established React-style guard and matches general TopFarms async-effect convention."
metrics:
  duration_minutes: 6
  duration_seconds: 9
  completed: 2026-05-18T10:08:50Z
  files_created: 1
  files_modified: 2
  vitest_baseline: "298 passed | 118 todo (suite-wide pre-21-08)"
  vitest_post: "303 passed | 114 todo (delta: +5 passed / -4 todo, exact match to flip)"
  badge_test_file: "5/5 GREEN (4 flipped from Wave 0 + 1 new className-forward assertion)"
  tsc_errors_before: 27 (pre-existing baseline)
  tsc_errors_after: 27 (zero new errors introduced; zero errors mention ApplicantPanel/DocumentsVerifiedBadge)
  commit_hash: bb4bc82
---

# Phase 21 Plan 08: DocumentsVerifiedBadge Summary

**One-liner:** `DocumentsVerifiedBadge` stateless component (Tag variant='green' + FileCheck icon + "Documents Verified" text) shipped with `ApplicantPanel` integration via predicate-only Supabase head-count query (`status='approved'`, `limit 1`); 5/5 vitest GREEN, single atomic commit `bb4bc82`, zero regressions.

## What shipped

### `src/components/ui/DocumentsVerifiedBadge.tsx` (NEW — 33 lines)

Stateless React component. Props: `{ hasVerifiedDocuments: boolean; className?: string }`. Composition pattern:

- Renders `<Tag variant="green">` (existing primitive from `src/components/ui/Tag.tsx`) containing a Lucide `FileCheck` icon + "Documents Verified" text when `hasVerifiedDocuments=true`.
- Returns `null` when `hasVerifiedDocuments=false` — no DOM output, no wrapper.
- `className` prop forwards to `Tag.className` via `cn()` for layout consumers.
- `aria-hidden="true"` on the icon so screen readers read the text only.

Distinct from `VerificationBadge` (employer `TrustLevel` domain, expandable popover, different data axis). Documented in component docblock so future readers understand the deliberate non-reuse.

### `src/components/ui/ApplicantPanel.tsx` (MODIFIED)

Three additions (minimal-diff per RULE 3 scope discipline):

1. **Import:** `import { DocumentsVerifiedBadge } from '@/components/ui/DocumentsVerifiedBadge'` alongside existing UI imports.
2. **State + effect (Scenario B):** New `useState(false)` slot for `hasVerifiedDocuments` + `useEffect` keyed on `application.seeker_profiles?.id` that runs a predicate-only Supabase query:
   ```ts
   supabase
     .from('seeker_documents')
     .select('id', { head: true, count: 'exact' })
     .eq('seeker_id', seekerId)
     .eq('status', 'approved')
     .limit(1)
     .then(({ count }) => { if (!cancelled) setHasVerifiedDocuments((count ?? 0) > 0) })
   ```
   Cancellation flag in the cleanup function guards against unmount-during-fetch state updates. Inline comment documents the PRIV-02-preservation rationale (this is orthogonal to identity-document filtering, which lives in `ApplicantDocuments` / `get-applicant-document-url` Edge Function).
3. **JSX:** Badge rendered inside the existing collapsed-row seeker-label `<div>`, wrapped with a `<div className="flex items-center gap-2">` so the label + badge sit side-by-side without disrupting the layout. Visible without expanding the panel.

### `tests/documents-verified-badge.test.tsx` (MODIFIED)

4 Wave 0 `.todo` stubs flipped to real RTL assertions + 1 new assertion (`className` forwards to Tag). All 5 GREEN in 41ms.

## ApplicantPanel integration choice — Scenario B (per plan body)

Plan offered three scenarios:
- **A:** Inline `documents?.some(d => d.status === 'approved')` if docs already loaded in ApplicantPanel state.
- **B:** Lightweight predicate query if docs not loaded here.
- **C:** Boolean passed via prop from parent.

**Reading the file revealed:** `ApplicantPanel` does NOT load `seeker_documents` directly. The child `ApplicantDocuments` (line 350) owns its own fetch effect scoped to its own component. Three options for getting the boolean into the panel:
- **A wasn't applicable** — no docs in panel state.
- **C** would have required threading a new prop through `ApplicantsList` / `ApplicantDashboard`, then a new fetch at the dashboard level grouping by applicant — bigger surface change, more refactor, no clear win.
- **B** added a single bounded HEAD query (no row payload — `count: 'exact', head: true`) per panel mount, scoped to one applicant. Cleanest in terms of minimal-diff + no parent refactor.

Chose **B**. Documented choice + rationale in code comment above the `useEffect`.

## Confirmation: PRIV-02 baseline preserved

CLAUDE-noted concern: the panel must not gain identity-document exposure logic. Verified:

- `grep -c "document_type === 'identity'" src/components/ui/ApplicantPanel.tsx` returns **0** (post-edit).
- New query filters by `seeker_id` + `status='approved'` — `document_type` is not referenced at all. The query returns a count, not document records.
- Identity-document exclusion stays at the **three existing enforcement layers**: `get-applicant-document-url` Edge Function (Phase 14 BFIX-02), `ApplicantDocuments` listing query, document-bucketing loop.
- Badge visibility is **predicate-only** — employers see "this seeker has at least one approved document" without learning anything about WHICH document or what type. Information leakage = exactly 1 bit, which is the entire feature.

## Verification

### Acceptance criteria

Task 1 (component + tests):
- ✓ `ls src/components/ui/DocumentsVerifiedBadge.tsx` exits 0
- ✓ `grep -c "export function DocumentsVerifiedBadge"` returns 1
- ✓ `grep -c "Documents Verified"` returns 2 (docblock + JSX; AC required ≥1)
- ✓ `grep -c "FileCheck"` returns 2 (import + JSX) — meets ≥2 AC
- ✓ `grep -c 'variant="green"'` returns 1
- ✓ `grep -c "if (!hasVerifiedDocuments) return null"` returns 1
- ✓ `pnpm exec vitest run tests/documents-verified-badge.test.tsx` exits 0; **5 passing**
- ✓ `grep -c "it.todo" tests/documents-verified-badge.test.tsx` returns 0
- ✓ `pnpm exec tsc -b`: 27 pre-existing errors (unchanged baseline)

Task 2 (panel integration):
- ✓ `grep -c "DocumentsVerifiedBadge" src/components/ui/ApplicantPanel.tsx` returns 2 (import + JSX)
- ✓ `grep -c "hasVerifiedDocuments" src/components/ui/ApplicantPanel.tsx` returns 2 (state + JSX prop)
- ✓ `grep -cE "status.*'approved'"` returns 3 (effect `.eq`, comment, comment)
- ✓ `grep -c "document_type === 'identity'"` returns **0** (PRIV-02 preserved)
- ✓ `pnpm exec tsc -b`: 27 pre-existing errors, none in `ApplicantPanel.tsx` / `DocumentsVerifiedBadge.tsx`
- ✓ Full vitest suite GREEN: **303 passed | 114 todo** (Δ +5 passed / -4 todo vs 298/118 baseline; exact match to the test flip; zero regressions)

### Test baseline math

| Metric          | Pre-21-08 baseline | Post-21-08 | Delta              |
| --------------- | ------------------ | ---------- | ------------------ |
| Tests passed    | 298                | 303        | +5 (new badge file) |
| Tests todo      | 118                | 114        | −4 (Wave 0 flips)  |
| Test files      | 47 passed + 7 skipped | 48 passed + 6 skipped | +1 (badge file moved from "skipped because empty todos" to "passed") |

Sum check: 298+5=303 ✓. 118-4=114 ✓. The 5th new assertion (`className` forward) was authored in plan body beyond the 4 Wave 0 stubs — accounts for the extra +1 vs the literal −4/+4 flip.

### Test-run flake (no-deviation event)

First post-edit full vitest run reported `1 failed | 302 passed | 114 todo`. Re-runs (×2) returned clean `48 passed | 303 passed | 114 todo`. Investigation:

- The failure surfaced as `DailyBriefing load failed TypeError: Cannot read properties of undefined (reading 'error')` at `src/pages/admin/DailyBriefing.tsx:113:25` — completely unrelated file to plan 21-08 edits.
- `tests/admin-daily-briefing-render.test.tsx` is the harness; it's a single integration test that statically imports `DailyBriefing`, which transitively triggers a Supabase fetch in its mount effect. The act-warning noise + occasional `undefined` read on the response object is the well-known RTL/jsdom async-effect race that the test harness doesn't gate with `await waitFor`.
- Pattern is consistent with Phase 20-06 STATE entry (`vi.hoisted` decision rationale) noting that DailyBriefing render-test was the lone integration test using static SUT import.
- Treated as pre-existing flake. Not in scope per CLAUDE §3 (diagnose-before-fix scope boundary) + executor scope-boundary rule (only auto-fix issues directly caused by current task changes). Two consecutive clean runs after the first establish that this plan introduces no regression.

## Deviations from Plan

### None functional. One scope clarification:

**Acceptance criterion AC for "Documents Verified" count was specified as "returns 1" but grep returns 2** (docblock comment line "verified" + JSX text). Same pattern as plan 21-06's "skipped: true" count (STATE.md Phase 21-06 line documents identical AC8 interpretive note). Treated as plan-anticipated documentation: extra occurrence strengthens regression coverage; the substantive ACs (file exists, function exported, JSX renders the literal) all pass. No code change made to satisfy a literal count of 1.

## Note: surfaces deferred to v2.1

Per plan body open question ("also surface on JobSearch applicant cards?") — deferred to a potential v2.1 polish phase. ApplicantPanel is the primary employer-facing applicant-review surface; that surface is the locked CONTEXT.md scope for v2.0. Other surfaces (e.g., a future seeker-profile-public page, mobile applicant list, recruiter-only summary cards) can reuse the component with no API changes — the `hasVerifiedDocuments` boolean prop is the entire contract.

## Carryforward to Wave 6 (plan 21-09 milestone close)

Plan 21-09 operator UAT should include a **badge-visibility browser smoke test** as part of the end-to-end approve flow:

1. Admin opens `/admin/seeker-documents-queue` (plan 21-07 surface)
2. Admin clicks "Approve" on a pending document
3. Admin RPC commits (`update seeker_documents.status='approved'`)
4. Employer (in second browser session) navigates to their applicant dashboard for the seeker who owns that document
5. Expected: "Documents Verified" green badge visible on the collapsed applicant row, no expand required

Source-level coverage shipped here (5/5 vitest GREEN); E2E browser verification is plan 21-09's milestone-close responsibility. Add to UAT checklist when authored.

## Self-Check: PASSED

- ✓ `src/components/ui/DocumentsVerifiedBadge.tsx` exists on disk
- ✓ `src/components/ui/ApplicantPanel.tsx` modified with import + state + effect + JSX
- ✓ `tests/documents-verified-badge.test.tsx` flipped + extended (5/5 GREEN)
- ✓ Commit `bb4bc82` exists: `git log --oneline | head -2` shows `bb4bc82 feat(21-08): DocumentsVerifiedBadge component + ApplicantPanel surface (Track B)`
- ✓ Full vitest suite green (×2 confirmation runs after one pre-existing flake)
- ✓ tsc clean delta (27 → 27, none in edited files)
- ✓ PRIV-02 baseline preserved (`grep -c "document_type === 'identity'"` returns 0)
