# Test backlog — the plans that were pretending to be tests

Audit **F-27**: 108 `it.todo` counted green, 80 of them across five files with **zero
`expect()`**. `it.todo` is neither a failure nor a skip — vitest prints it in a green run, so a
file of nothing but todos reads exactly like a file of passing tests.

Four such files were deleted on 2026-08-18 and their content moved here, where nothing reports
it as green. `tests/no-phantom-coverage.test.ts` now fails if a test file is ever again all plan
and no assertion, and ratchets the total todo count downward.

**Anything below is UNTESTED. It is a list of intentions, not a record of coverage.**

---

## Deleted: `tests/match-scoring.test.ts` — 26 todos, 0 assertions

**Not migrated. It described a model that no longer exists**, and had done since migration 072.

It specified `shed type: exact match returns 25 points` (v3: 3), `location: same region returns
20 points` (v3: 15), `accommodation: mismatch returns 0 points` (v3: a gate, not a score), and
four todos for a **1.1x recency multiplier that migration 072 removed and `match-scores-cleanup`
actively forbids**. The audit flagged this exact contradiction.

Replaced by `tests/match-scoring-v3.test.tsx` (13 assertions against migration 093) plus the
prod probe recorded in the 093 ledger row.

## Deleted: `tests/job-search.test.tsx` — 18 todos, 0 assertions

Partly obsolete, partly covered elsewhere.

- `SRCH-05: DairyNZ level filter` — **the filter itself was deleted** under F-17. It rendered,
  persisted and pilled while filtering nothing.
- Shed / accommodation / visa filter todos — the query-shape half is now covered by
  `tier2-audit-fixes.test.ts` (F-18) and `filter-registry-single-source.test.ts` (F-17).
- Rendering todos (`renders FilterSidebar and job results grid`, `shows skeleton cards during
  loading`, `shows empty state when no results match`) — **still untested.** These need a
  rendered page with a stubbed client. Worth writing; nobody has.

## Deleted: `tests/applications.test.ts` — 15 todos, 0 assertions

- `APPL-01` apply / duplicate handling (`23505`) — **still untested.** The `(job_id, seeker_id)`
  unique constraint is real and the apply path is an upsert over it.
- `APPL-02` My Applications grouping and card rendering — **still untested.**
- `APPL-03` `updates application status to withdrawn` — **describes a feature that does not
  exist.** Found while building migration 097: `withdrawn` is modelled, rendered by two
  components and handled by `useAppliedStatuses`, and **no UI writes it**. 097 permits the
  transition so a withdraw button does not have to ship a migration with it. Write the button
  first, then the test.
- Transition legality is now enforced and tested — `tests/pipeline-transitions.test.ts`, 21
  assertions against the state machine in 097.

## Deleted: `tests/seeker-profile.test.ts` — 10 todos, 0 assertions

- Data-integrity todos (`dairynz_level stores valid DairyNZLevel value`, `visa_status stores
  valid VisaStatus value`, and the shed/herd equivalents) — **converted into real tests**:
  `tests/domain-enums-match-the-database.test.ts` checks each UI constant against the live
  `pg_constraint` definition. That is the check they were describing, and it needs no database
  at run time.
- Profile CRUD todos (`creates on first step`, `updates on subsequent steps`, `loads on return
  visit`) — **still untested.** Partly covered in spirit by `wizard-prefill-data-loss.test.tsx`
  and `use-wizard-resume.test.ts`.
- `saves seeker skills with proficiency levels` — **still untested.**

---

## Still carrying todos, and why they are allowed

`tests/seeker-onboarding.test.tsx` has 19 todos **and 6 real assertions**, so it is not phantom
coverage — the assertions are genuine and the todos are notes beside them. The remaining
singletons across six other files are the same shape. The ratchet in
`no-phantom-coverage.test.ts` exists so this number falls rather than drifts.
