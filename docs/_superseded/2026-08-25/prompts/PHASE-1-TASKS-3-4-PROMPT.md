# Phase 1 · Tasks 1.3 & 1.4 — RLS gap closure and adversarial verification

Operating prompt. Companion to `docs/UPLIFT-ROADMAP-2026-07-30.md` and
`docs/AUDIT-PRELAUNCH-2026-07-30.md`. Tasks 1.1/1.2 (the shared authorization helper and its
application to five Edge Functions) are on branch `feat/phase1-auth-spine`, **pushed but
deliberately unmerged** — Task 1.4 gates that merge.

**Goal.** Close the authorization holes that live in Postgres rather than in function code,
then prove — with recorded evidence, not assertion — that both layers actually refuse.

---

## Ground truth, verified live 2026-07-30

Do not re-derive. Do not trust the audit's summary over this table; these are the actual
`pg_policies` rows and function bodies as they stand right now.

| Object | Current state (verified) | Problem |
|---|---|---|
| `set_user_role(p_role)` | `INSERT … ON CONFLICT (user_id) DO UPDATE SET role` — checks only `auth.uid() IS NOT NULL` and role ∈ (employer, seeker) | Unlimited, free, unaudited self-promotion to `employer` |
| `seeker_skills: employers can view` | `SELECT TO authenticated`, `qual: get_user_role(auth.uid()) = 'employer'` | **No ownership binding at all** — any employer reads every seeker's skills |
| `messages: sender can insert` | `INSERT TO public`, `with_check: sender_id = auth.uid()` | `thread_id` unchecked — inject into any thread |
| `employer_verifications: anon view` | `SELECT TO anon`, `qual: true` | World-readable incl. `nzbn_number`, `document_url` |
| `employer_verifications: seekers view` | `SELECT TO authenticated`, `qual: get_user_role(auth.uid()) = 'seeker'` | **Second hole the audit missed** — same columns, any seeker, all rows |
| `applications: seekers insert and view own` | `FOR ALL TO authenticated`, correctly bound to own `seeker_id` | Correct binding, but no column restriction → seeker reads `application_notes`, `ai_summary` |

Available and already correct — reuse, don't rebuild:
- `employer_has_public_job(uuid)` — SECURITY DEFINER boolean, exists (migration 060, created
  precisely to break the 42P17 recursion cycle). **Cross-table policy predicates go through a
  definer helper; a policy that subqueries another RLS'd table can deadlock — see CLAUDE.md
  and the E8 incident.**
- `admin_audit_log(id, admin_id, action, target_table, target_id, payload, created_at)`
- `user_roles(id, user_id, role, created_at, is_active)`

Client callers confirmed compatible with first-assignment-only:
- `src/pages/auth/SelectRole.tsx:32` early-returns when a role already exists
- `src/contexts/AuthContext.tsx:168` sets it once during OAuth signup

---

## Task 1.3 — Close the RLS gaps

One migration, `066_phase1_rls_gaps.sql`. Show the full SQL body before applying (CLAUDE.md
§3). Apply via the claude.ai connector, verify each object via `pg_catalog`, add the ledger
row per `supabase/migrations/README.md`.

### 1.3a · `set_user_role` — first assignment only
Raise on re-assignment rather than upserting. Both callers already avoid re-assignment, so
this is not a behaviour change for legitimate flows — it removes an attack. No audit log
needed: **if the role can only be set once, there is nothing to audit.** Prefer that over
logging a thing you have now made impossible.

Keep the existing `Not authenticated` and `Invalid role` guards and their messages.

### 1.3b · `seeker_skills` — bind employer reads to a real relationship
Replace the role-only predicate. The employer may read a seeker's skills when **either**:
- that seeker has applied to one of the caller's jobs, **or**
- the seeker is `open_to_work = true` — matching the posture `seeker_profiles` already takes,
  which is plausibly the intended marketplace design.

Route the cross-table check through a SECURITY DEFINER helper, not a bare subquery.

**Judgement call to make explicitly:** if browse-all-open-to-work is *not* intended, say so
and drop the second arm. Do not silently preserve a hole because it might be a feature.

### 1.3c · `messages` — bind the INSERT to the thread
Add the `thread_id` predicate mirroring the existing (correct) SELECT policy, so a sender can
only write into a thread they are party to.

Note the surrounding context in the PR: the PRD says messaging is Growth-phase, *tables only,
no UI* — yet the tables are live and writable, and `src/pages/ForEmployers.tsx:26` advertises
"Shortlist, **message**, and move candidates" to paying employers. Closing the policy is
correct regardless; the copy/roadmap mismatch is Phase 3 Task 3.4.

### 1.3d · `employer_verifications` — close **both** read policies
- anon: `qual: true` → `employer_has_public_job(employer_id) AND status = 'verified'`
- seeker: role-only → the same predicate

Then drop `document_url` (and `nzbn_number` where unused) from the three client `select('*')`
call sites: `src/hooks/useVerifications.ts:56`, `src/pages/jobs/JobSearch.tsx:422`,
`src/pages/jobs/JobDetail.tsx:220`.

Live row count is currently **0**, so this is an armed landmine rather than a live breach — it
arms itself the moment the first employer verifies. Note in the PR that self-service
verification (P0-9) is a *separate* Phase 3 fix; this task does not make the badge trustworthy,
only stops leaking the evidence behind it.

### 1.3e · `applications` column exposure — decide, don't hand-wave
Seekers can read `application_notes` and `ai_summary` on their own rows.

**Constraint that makes the obvious fix wrong:** column-level grants are per-*role*, and both
parties are `authenticated`. Revoking these columns from `authenticated` would remove them
from employers too, breaking the applicant dashboard.

Real options: (a) a seeker-facing view with direct table SELECT revoked for seekers —
invasive, touches client queries; (b) move employer-private fields to a sibling table;
(c) defer to Phase 5 with the reason recorded.

**Pick one and justify it. If deferring, say so in the PR and add it to the roadmap — do not
leave it silently open.** This is lower severity than 1.3a–d: the data is the employer's notes
about that same seeker, not another tenant's data.

---

## Task 1.4 — Adversarial verification

**No claim without a recorded refusal.** Output is `docs/evidence/phase-1-probes.md`,
committed: one row per attack with the command, the response, and the status code.

### The sequencing problem — read before planning

Edge Functions deploy **on merge** (`supabase-deploy.yml`), so the Task 1.2 changes cannot be
probed before the PR merges. Three options, and the choice must be deliberate:

1. **Deploy from the branch via the connector, probe, then merge.** Rejected: creates
   repo↔prod drift, which is exactly the class of problem Phase 0 just spent a day fixing for
   migrations. Do not do this.
2. **Merge, deploy, probe, revert if a probe fails.** Blast radius today is 6 users, 0 jobs,
   0 applications — effectively nil — and a revert is one PR. **Preferred.**
3. Local `supabase functions serve` — blocked by the same pooler/CLI auth that blocks
   `db push`.

So: **RLS probes (1.3) run pre-merge**, because the migration applies directly to the DB.
**Edge Function probes (1.2) run immediately post-merge**, and the PR is not considered
verified until they pass. If any fails, revert first and diagnose second.

### Seeding

Use the throwaway-account recipe in memory `project-verify-with-temp-admin` (seed into
`auth.users` with empty-string token columns plus an `identities` row; the `handle_new_user`
trigger assigns the role). Seed **three** accounts — the second employer is what makes
cross-tenant probes meaningful:

| Handle | Role | Purpose |
|---|---|---|
| `probe-seeker` | seeker | victim profile, skills, application |
| `probe-employer-a` | employer | owns a job; the legitimate caller |
| `probe-employer-b` | employer | the attacker — owns nothing |

Give employer A a job and the seeker an application to it, so ownership chains have something
to resolve against.

### The probe matrix — every one must refuse

| # | Attack (as employer B unless stated) | Target | Expect |
|---|---|---|---|
| P1 | `generate-candidate-summary` with A's `application_id` | P0-2 | 403 |
| P2 | `generate-match-explanation` with the seeker's profile id | P0-2 | 403 |
| P3 | `acknowledge-placement-fee` on A's application | P0-3 | 403 |
| P4 | `create-payment-intent` on A's job | F-A4 | 403 |
| P5 | `create-placement-invoice` on A's application | found by the guard | 403 |
| P6 | As **A**, the same five calls on A's own resources | regression | 2xx — *the fix must not break the legitimate path* |
| P7 | `set_user_role('employer')` as an existing seeker | 1.3a | raises |
| P8 | Read `seeker_skills` for a seeker who never applied to B's jobs | 1.3b | 0 rows |
| P9 | Insert a `messages` row into a thread B is not party to | 1.3c | refused |
| P10 | Anon `GET /employer_verifications` | 1.3d | 0 rows |
| P11 | As the seeker, `GET /employer_verifications` | 1.3d | 0 rows |
| P12 | Anon reads of `seeker_profiles`, `seeker_contacts`, `applications` | regression | 0 rows |

**P6 is not optional.** A 403 on everything is not success — it is an outage. Prove the
legitimate employer path still works, including that `generate-candidate-summary` now returns
a summary with real candidate facts (the O8 fix).

### Cleanup — non-negotiable

Delete all three accounts and their cascade, then verify with a read-only count that nothing
remains: users, profiles, jobs, applications, match_scores, fees. Record the read-back in the
evidence file. Prod must return to **6 users / 0 jobs** exactly.

---

## Definition of done

1. `066_phase1_rls_gaps.sql` applied, every object verified via `pg_catalog`, ledger row added,
   `LEDGER.md` updated (the drift-guard test enforces this).
2. `docs/evidence/phase-1-probes.md` committed, all twelve rows recorded, P6 green.
3. Test guards extended for the new policies — a policy is not protected by a probe that ran
   once; it is protected by a test that fails when someone widens it again.
4. `tsc -b` · lint · vitest · build · CI all green; `deno check` clean.
5. Throwaway data gone, verified by read-back.
6. Audit findings P0-2, P0-3, P0-5, P0-6, F-A4, F-S1, F-S2 marked closed with evidence
   references; anything deferred (1.3e) recorded in the roadmap rather than dropped.

## House rules in force

CLAUDE.md §9 especially: stage explicit paths, never discard an exit code, verify before
anything destructive, read the real schema before writing SQL, label provenance, and let the
gate define done. §3: show the SQL before applying. §4: no history rewriting.
