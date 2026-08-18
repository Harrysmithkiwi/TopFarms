# Next batch — Phases B → C → D → E

**Paste this whole file as the opening prompt of a fresh session.** It is a work order, not a
summary. Written 2026-08-18 at the close of the seeker-corpus session.

---

## 0. Standing orders

**Read first, in this order, before touching anything:**

1. `.planning/NOW.md` — the live map. If it and a stream doc disagree, the stream doc wins and
   NOW.md is stale; fix it.
2. `docs/SEEKER-INSIGHTS.md` — the 23-post evidence base and the gap register G-1…G-25.
3. `.planning/DSA-AUDIT-2026-08-17.md` — 27 verified defects, tiered. **Phase E is this file.**
4. `.planning/EMPLOYER-WALK-2026-08-17.md` — where it disagrees with the audit, **the walk wins**;
   it is empirical.
5. `CLAUDE.md` §3, §4, §7, §9, §10 — diagnose before fix, atomic commits, partial-close, the
   verification gates, and the two design canons.

**Rules that are not negotiable in this batch:**

- **An audit's "Fix" column is a hypothesis, not a spec.** On 2026-08-17, two of four fix-shapes
  would have caused an incident as written (F-01 would have opened the admin gate to any
  authenticated user; F-02 would have taken the marketplace dark). Before implementing any fix
  below, read the live object — `pg_proc` bodies, `pg_policies`, `pg_class.reloptions`,
  `pg_attribute.attacl` — and grep every caller. Look specifically for **negated comparisons**
  (`!=`, `<>`) against anything that can become NULL.
- **Migrations go via the claude.ai Supabase connector `apply_migration`** (write-capable,
  records `schema_migrations`), or Supabase Studio if that connector is unauthenticated. Either
  way: save the SQL to `supabase/migrations/`, and **verify via `pg_catalog`, never the banner.**
- **The gate defines done.** `tsc -b` = 0, vitest green, lint 0 errors at the pinned warning
  count, `npm run build` = 0. A phase is complete when its stated gate produces its stated output.
- **Rank seeker gaps by frequency across the corpus, never by how interesting they are.** That
  ranking is what proved the two gaps shipped on 2026-08-17 were the right two.
- **One phase per commit.** No bundling. No history rewriting without an explicit instruction
  typed into the chat.

**Phase A (outreach — send the first batch) is DEFERRED by operator decision, 2026-08-18.**
Do not send anything, do not draft a send, do not treat M3 as the goal of this batch. Tickets
below that touch outreach are scoped to **build and verify only**. Where a ticket cannot be
finished without the send doctrine (T-01) being resolved, it says so and stops there.

---

## Phase B — Seeker lane throughput

**Goal:** the seeker intake pipeline can take 100–200 real posts without losing, duplicating, or
mis-filing any of them, and without dropping the fields that shipped on 2026-08-17.

**Why now:** `AdminSeekerStaging` + `PasteCapture` were built and are idle — `lead_staging` had
zero seeker rows only because nothing had been pasted in. The lane is a throughput problem, not a
build problem. Do not re-read the absence of *data* as the absence of a *channel*.

### B1 — Dedupe seeker staging on post body, not display name

The same person is already in the corpus twice under two handles with byte-identical text. Dedupe
currently keys on `display_name`, so **an opt-out recorded under one handle leaves the other
handle contactable** — that is a compliance hole, not tidiness.

- Read the live dedupe path (`_lead_intake`, migration 041/081, and `_lead_suppression_key` as
  repointed by **087**) before changing anything. 087 deliberately dropped `region` from the
  suppression key while keeping it in the dedupe fingerprint — do not undo that.
- Decide whether the seeker fingerprint should be a normalised body hash, and whether suppression
  should key on it too.
- **Gate:** a test that two rows with identical body text and different handles collapse to one,
  and that suppressing either suppresses both.

### B2 — Fork the employer post out of the seeker pile

One post in the seeker staging corpus is an employer advertising a role. Route it to the employer
queue. Check whether this is a one-off or a classification gap in `PasteCapture` — if the paste
step cannot tell a seeker post from an employer post, that is the ticket, not the single row.

### B3 — Verify the new seeker fields actually reach the intake

**Verified 2026-08-18: `contract_type_pref` appears nowhere in `supabase/functions/` or
`src/pages/admin/`.** Migration 090 shipped the column and the onboarding UI writes it, but the
staging extractor does not extract it and `notify-job-matches` does not read it.
`role_type_pref` is read at `notify-job-matches/index.ts:225` but only to **display** roles in the
email body — it does not filter.

So the highest-frequency finding in the whole corpus (relief/part-time/short-term, 9 of 23) is
captured on the profile and ignored everywhere it would matter.

- Extend the seeker staging extractor to pull `contract_type_pref` and the three new roles
  (Shepherd, Stock Manager, Calf Rearer) from post text.
- `src/lib/constants.ts` and `supabase/functions/_shared/leadVocab.ts` are kept in parity by
  `tests/role-filter-vocabulary.test.ts`. **The parity test parses `leadVocab.ts` with a
  string-literal regex — comments in that file must contain no apostrophes and no quoted tokens**
  or the test misreads them as array entries.
- **Gate:** paste a corpus post that says "relief milking only" and assert the extracted row
  carries `casual`.

### B4 — Bulk-load "TopFarms People"

Only after B1–B3. Transfer the operator's Facebook saved collection into `AdminSeekerStaging`.
Report the count in, the count deduped away, and anything the extractor could not classify —
that residue is the next round of evidence, and is worth more than any inference I can offer.

**Deferred with Phase A:** T-06a (the seeker DM prototype) and T-02 (whether Facebook DMs need
UEMA sender + unsubscribe lines — 43 of 113 leads are DM-only). Both are send-doctrine work and
are blocked behind T-01, which is Phase A.

**Phase B gate:** ≥100 seeker rows staged, zero duplicate persons, zero employer posts in the
seeker queue, and `contract_type_pref` populated on every row whose post states terms.

---

## Phase C — Make matching earn its name

**Goal:** the two things seekers say most — the role they want and the terms they want — change
their ranking.

**The finding, verified against the live function body:** `compute_match_score` reads **neither**
`role_type` **nor** `contract_type`. A seeker who says "relief only" is still ranked against
permanent jobs, and the role they asked for does not influence their matches at all. Everything
shipped on 2026-08-17 sharpened the **profile, the filters and the extractor** — none of it
changed **ranking**. This is the highest-leverage matching work available.

### C1 — Document the live scoring model before changing it

Read the live `compute_match_score` body from `pg_proc`. Write out every dimension and its weight
and where the weights sum. Do not trust any doc that describes it; the recency multiplier in
`match-scoring.test.ts` was removed by migration 072 and the test still specifies it (`F-27`).

### C2 — Decide the weight budget — **operator decision, stop and ask**

Adding two dimensions means taking points from existing ones. Present the current allocation, a
proposed one, and what moves for a concrete corpus seeker under each. **Do not pick this
unilaterally** — location alone is 25 points and it is load-bearing for a country where seven of
twenty-three posts name a town.

### C3 — Implement, in one migration

`role_type` and `contract_type` as scoring dimensions. `contract_type_pref` is a `text[]` with a
CHECK constraining it to `permanent|contract|casual`; an empty or null preference must mean **no
penalty**, not zero score — ~35% of the corpus is entry-level and will leave fields blank.

### C4 — Rescore, and respect the two traps in the rescore path

- **F-15** — the rescore guard omits `pets`/`family`, the two columns `compute_match_score`
  actually reads for accommodation, so a whole-row upsert per section save produces no rescore for
  24h. Also: narrowing `sector_pref` orphans `match_scores` rows that both search and the operator
  alert read. Fix is `OLD IS NOT DISTINCT FROM NEW` plus a reconciling DELETE in the cron. **Do
  not apply the job-side equivalent.**
- **F-20** — match explanations are cached and never invalidated. A rescore that leaves a stale
  explanation attached is worse than no explanation.
- **F-15 and F-20 must land in one migration.** Applied separately, the second silently reverts
  the first.

### C5 — Close the alert loop

`notify-job-matches` should filter on terms, not just print roles. A casual-only seeker should not
be emailed about a permanent job.

**Phase C gate:** a test asserting a casual-only seeker scores strictly lower on a permanent job
than an otherwise-identical permanent-seeking seeker; a test that a blank preference is not
penalised; and `match_scores` reconciled with zero orphans after a `sector_pref` narrowing.

---

## Phase D — The visa compliance wedge

**Goal:** establish whether TopFarms is compliance infrastructure, and if it is, ship the smallest
proof.

**The finding (2026-08-18, not yet built):** the AEWV **Job Check** requires most roles to be
advertised ~3 weeks with a labour market test. TopFarms is a job board, so the artefact INZ wants
— *"advertised publicly X to Y, N applicants, M NZ residents"* — is a **by-product of a listing we
already host.** That reframes the product from a nice-to-have board into something a farm needs in
order to hire the migrant it has already found, which gives a farm a reason it cannot refuse to
post. **The visa play and the cold-start inventory problem have the same solution.**

~30% of the corpus is visa-touched. `employer_profiles.inz_accredited` + expiry + the derived
`accredited_employer` flag shipped as migration **091**.

### D1 — Verify the rules against live INZ material — **BLOCKING, do this first**

The ≥3-week advertising rule and the labour-market-test requirements are flagged fast-moving in
`docs/immigration/01-visa-landscape.md`. **Verify against current INZ sources before building
anything in this phase.** If the rule has changed shape, D5 changes shape with it and D3/D4 are
still worth doing on their own merits.

### D2 — Fix the doc drift that will mislead the next reader

`docs/immigration/00-strategy-overview.md` still says *"TopFarms is not a licensed party… we do
not advise"*. **`02-legal-line.md` supersedes it:** the founder holds a current NZ practising
certificate (and a NSW one), and under **IALA s 11 lawyers are exempt from licensing**, so the
advice layer can be in-house with no partner LIA. For Australia, Migration Act 1958 s 276–277
gives the equivalent without OMARA. Anyone who reads `00` first designs the wrong product.

### D3 — `/jobs` accredited-employers-only filter

091 laid the foundation and the filter was explicitly not built. Small. Note that
`accredited_employer` is **derived** — `inz_accredited AND inz_accreditation_expires >
current_date` — so an expired accreditation must stop matching without any write.

Design canon: `/jobs` is a **public marketing surface** — visual findings there are out of scope
and settled under `docs/design/v11-DIRECTIVE.md`. But `/jobs` branches on session and role, so
**accessibility, the four required states, and the §1.3/§1.4/§1.5 product principles bind it
anyway** (CLAUDE.md §10, ruled 2026-08-07).

### D4 — INZ list-API verification

Feasibility was confirmed while the immigration phase was parked: the INZ accredited-employer list
API keys on **NZBN + expiry**. This is what moves `inz_accredited` from a **self-declared** claim
to a **verified** one. Keep it outside `employer_verifications` until it is genuinely verified —
that separation is deliberate (F-11's lesson: a self-declared trust claim is not a verified one).

### D5 — The advertising-record export

The actual wedge: from a listing, produce the artefact a Job Check needs. Scope it to a read-only
export of facts the database already holds. **Do not build this before D1 confirms the shape.**

**Australia's 88-day market is explicitly NOT being built** (decision 2026-08-18). It is real,
large, trust-broken, and the NSW practising certificate is a genuine moat — but it is a different
country, regime and sector, and NZ still has 0 jobs and 0 real users. **Save 20 Australian posts
first**, then revisit with evidence, exactly as the NZ corpus was built.

**Phase D gate:** D1's verification written down with sources and dates; `00-strategy-overview.md`
no longer contradicts `02-legal-line.md`; the accredited filter returns only unexpired
accreditations, proven with a row whose expiry is in the past.

---

## Phase E — The rest of the DSA audit

Work `.planning/DSA-AUDIT-2026-08-17.md` in tier order. **Each fix is a hypothesis — verify
against the live catalog first** (see Standing Orders). The recorded dependencies are hard:

**Tier 1 remainder**

- **F-05** — placement invoice can double-bill; the guard reads `confirmed_at` which is written
  *after* `finalizeInvoice` has already emailed a payable invoice, and the error is swallowed
  while returning success. Zero `idempotencyKey` across all 17 edge functions. Stripe idempotency
  keys derived from `application_id` (already UNIQUE). No migration.
- **F-06** — a fee countable as paid **and** written off. `CHECK (paid_at IS NULL OR
  status='paid')` plus `.is('paid_at', null)` on the failure branch. **After F-05.**
- **F-03** — a seeker can self-set `hired`; the live policy constrains `seeker_id` only, and
  `VALID_TRANSITIONS` is used only for rendering. `pipeline-transitions.test.ts` is 11 `it.todo`
  with zero assertions. `BEFORE UPDATE OF status` trigger with a `(from, to, actor)` table.
- **F-04** — `hired` has three writers and `placements` has one. Placement becomes the writer via
  trigger. **Depends on F-03.**
- **F-23** — Step 5 overwrites the seeker's region: `SeekerStep5LifeSituation.tsx:79` writes
  `region: preferred_regions?.[0]` from a list holding 8 of 16 regions in tap order, and it drives
  the 25-point location dimension. Standalone, small, and it corrupts the data Phase C depends on
  — **do this one before or alongside Phase C.**

**Tier 2** — F-14 (contact guard covers failed read, not pending), F-34 (salary band cannot be
cleared), F-24 (`storage_path` unconstrained — audit legacy rows from the 019 backfill first),
F-25 (retry button that refetches nothing), F-18 (herd-size filter's comma is PostgREST's OR
separator), F-17 (`q` absent from the filter registry; four more filters render, persist, and
filter nothing).

**Tier 3** — model debt and false assurance. **F-27 is the one that matters most**: 108 `it.todo`
counted as green, 80 of them across 5 files with zero `expect()`. Until that is true, every gate
in this document is weaker than it looks.

---

## Sequencing

**B → C → D → E**, with two deliberate interleaves:

1. **Do F-23 (Phase E, Tier 1) before Phase C ships.** It corrupts `region`, which drives the
   25-point location dimension you are about to rebalance. Rebalancing weights on corrupted data
   produces a model tuned to the corruption.
2. **B3 feeds C.** Extracting `contract_type_pref` is worthless until C scores it, and C is
   unprovable at scale until B has real rows. Build B3, then C, then re-run the alert on real
   staged data.

Take each phase to its stated gate, commit atomically, update `.planning/NOW.md` at the end of
each phase, and **stop at C2** — the weight budget is the operator's call, not yours.

If a phase turns out to be blocked or wrong-shaped, finish every other part of it in full and say
explicitly what was left out and why. Scaling the work down is the operator's decision.
