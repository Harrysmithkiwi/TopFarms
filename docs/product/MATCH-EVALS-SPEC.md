# TopFarms — Match-Scoring Evals Spec (golden fixtures + regression harness)

> **Status:** SPEC — Stage-2 remediation deliverable, 2026-07-08. Closes the audit finding that scoring has no evals: `tests/match-scoring.test.ts` is 100% `it.todo` — not one executable assertion protects `compute_match_score` today [V].
> **What it protects:** `compute_match_score` (migration `009:113-334` — deterministic PL/pgSQL, 7 dimensions + recency, [V]) and its precompute path (`010`), through the coming gate work: Platform Audit MA-1 (RTW + dog vetoes), MA-2 (`normalise_region()`), MA-4 (sole-charge conditional gate), and the PEND-02 visa decisions (`.planning/DECISIONS-PENDING.md`).
> **Fixture provenance:** `docs/_canonical/TopFarms_Combined_Data.md` — 35 real seeker posts + 12 real employer listings with known gate collisions (Platform Audit §5.2 names this exact use).
> Labels: **[V]** verified in code · **[MODELLED]** expected values pending first recorded run · **[OPINION]** design judgement.

---

## 1. Why now, in one paragraph

The gate work (MA-1) changes scoring from "everything scores, low sinks" to "some pairs are excluded". Platform Audit §5.2 is blunt: *"This is the regression net for the gate work; without it, a future reweight silently un-gates."* The scoring function is deterministic SQL — the cheapest thing in the codebase to eval exhaustively — and the fixture data already exists as coded real-world rows. Building the harness *before* MA-1 lands means the gate change ships with its proof in the same PR (audit build-next item 3 says exactly this).

## 2. Where it lives

```
fixtures/match/
  seed.sql          -- fixture rows (fixed UUIDs) for seeker_profiles, employer_profiles,
                    --   jobs, seeker_skills, job_skills — one block per Combined-Data row used
  golden.ts         -- the golden set: pairs + expectations + CHANGELOG header (the only
                    --   place expectations may change)
  llm-evals/        -- dated JSON results from the monthly LLM-output eval (§7)
tests/
  match-evals.test.ts   -- the vitest harness
scripts/
  llm-match-eval.ts     -- Claude-as-judge runner (§7), NOT in CI
```

Locations per Platform Audit §5.2 recommendation (`fixtures/match/`). The Combined Data doc itself stays canonical and untouched; `seed.sql` cites row IDs in comments so drift is greppable.

## 3. Fixture format

### 3.1 SQL seed (`fixtures/match/seed.sql`)

- Fixed, legible UUIDs: seeker S06 → `00000000-0000-4000-a000-000000000s06`-style is invalid hex, so use a documented convention: `fe000000-0000-4000-a000-0000000000XX` where XX = row number (S06 → `…0006`, E02 job → `fe100000-…-0002`). One comment line per block: `-- S06: Peak Seasonal visa, anywhere NZ, calf rearer (Combined Data row S06)`.
- Maps Combined-Data prose onto **current** columns only (`visa_status` per the 057 vocab, `region`, `open_to_relocate`, `accommodation_needed`, `couples_seeking`, `pets`, `shed_types_experienced`, `min_salary`; jobs: `region`, `shed_type`, `visa_sponsorship`, `accommodation` jsonb, `couples_welcome`, `salary_max`, skills junctions). Fields the gates will need but that don't exist yet (`has_working_dog`, `dog_policy`, sole-charge) are noted in comments and activate staged fixtures (§4) when their migrations land.
- Where a Combined-Data row is silent (e.g. S09's visa status), the seed states the assumption in the comment — fixtures must be deterministic, so silence becomes an explicit value, never a NULL surprise (except the one fixture whose *point* is NULL, GS-19).
- `jobs.created_at` seeded **> 7 days old** for every fixture so the ×1.1 recency multiplier (`009:317-319` [V]) never fires — evals test dimensions, not clock state. One dedicated recency fixture may set a fresh timestamp later if wanted; not in v1 (YAGNI).
- Idempotent: `DELETE FROM … WHERE id LIKE 'fe%'`-equivalent guard first (delete by the fixed UUID set), then inserts. Safe to re-run against a local stack; **never pointed at prod** — the harness refuses to run unless the target URL is localhost (one guard line).

### 3.2 Golden expectations (`fixtures/match/golden.ts`)

```ts
// CHANGELOG (append-only — every expectation change gets a dated line + reason):
// 2026-07-XX  initial lock from first recorded run (commit …)
export type Expectation = {
  id: string                      // 'GS-04'
  source: string                  // 'S12 × E10 (Combined Data)'
  seeker: string; job: string     // fixture UUIDs
  expect: {
    gated?: 'rtw' | 'dog' | 'sole_charge'   // post-MA-1: pair must be excluded, with reason
    band?: '<50' | '50-69' | '70-84' | '85+' // 039 band vocab [V]
    dimensions?: Partial<Record<'shed_type'|'location'|'accommodation'|'skills'|'salary'|'visa'|'couples', number>>
    total?: number                 // exact, locked after first recorded run
  }
  status: 'active' | 'staged'     // staged = waiting on a named migration (field doesn't exist yet)
  stagedOn?: string               // 'MA-4 sole-charge fields' | 'SK-2/EM-4 bedrooms' | 'PEND-02 decision'
}
```

**Record-then-lock protocol [OPINION, deliberate]:** band and dimension expectations are authored up front from the Combined Data reading; exact `total` values are recorded from the first harness run, human-reviewed against the expected band, then committed. Hand-computing 19 totals from PL/pgSQL is error-prone busywork; reviewing 19 recorded numbers against expected bands is 10 minutes. After lock, totals are exact assertions.

## 4. Golden set v1 (19 pairs)

Bands per 039: `<50 / 50-69 / 70-84 / 85+`. All Combined-Data row IDs cite `docs/_canonical/TopFarms_Combined_Data.md`.

### Gate collisions — the reason this harness exists

| ID | Pair | Collision | Expectation (post-MA-1) | Pre-gate baseline (today) |
|---|---|---|---|---|
| GS-01 | S06 × E02 | Peak-Seasonal-visa migrant × "NZ citizens only" (Dunsandel) | `gated: 'rtw'` | scores with `visa: 0` — assert that, so the PR that lands MA-1 must consciously flip this row |
| GS-02 | S06 × E04 | same seeker × "must work without a visa" (Matamata) | `gated: 'rtw'` | `visa: 0` |
| GS-03 | S35 × E07 | overseas (relocating from SA) × not-accredited "must have right to work" | `gated: 'rtw'` | `visa: 0` |
| GS-04 | S12 × E10 | dog-owning seeker (partner + outside stock dog) × "NO dogs — non-negotiable" (Darfield) — **flagship fixture: both Canterbury, would otherwise score well; proves gate beats score** | `gated: 'dog'` | scores normally (dog policy is only a +3 accommodation sub-score today [V, Platform Audit §1.4]) |
| GS-05 | S19 × E10 | team of 6 dogs × no-dogs farm | `gated: 'dog'` | scores normally |
| GS-06 | S21 × E10 | 2 dogs, North Island × no-dogs Canterbury | `gated: 'dog'` — and the reported gate reason must be `dog`, not a location artefact | low score |
| GS-07 | S05 × E11 | refuses-sole-charge × sole-charge poultry (Irwell) | `gated: 'sole_charge'` — **staged on MA-4** (neither field exists yet; do not fake with proxies, per audit §3.3 "omit rather than guess") | cross-sector: likely unscored/low |

### Clean high matches — prove the gate work doesn't nuke good pairs

| ID | Pair | Why it should score well | Expectation |
|---|---|---|---|
| GS-08 | S25 × E04 | Waikato NZ Resident, rotary+herringbone, single/no pets × Matamata rotary, visa-free-required — passes the RTW gate *and* matches shed+region | `band: '70-84'` or better; `dimensions: {location: 20, shed_type: 25, visa: 5}` [MODELLED until lock] |
| GS-09 | S04 × E07 | North Canterbury 4 yrs × Charing Cross Canterbury, entry-ok | `band: '70-84'`; `location: 20` |
| GS-10 | S09 × E07 | 40-aside herringbone trainee, relocate-anywhere × 50-aside herringbone | `shed_type: 25`; `location: 16` (relocate, different region — seed decides S09's region as non-Canterbury to make the 16 branch deliberate) |
| GS-11 | S22 × E07 | relocating to SI, Milk Quality L3 × Canterbury keen-to-learn | `band: '50-69'` or better; not gated (RTW assumed held — stated in seed comment) |

### Borderline / dimension-assertion pairs

| ID | Pair | What it pins | Expectation |
|---|---|---|---|
| GS-12 | S02 × E04 | same town (Matamata) but "no rotary, keen to learn" × rotary-essential | `location: 20`, `shed_type: 0`; mid band — the fixture that keeps shed scoring honest when weights change |
| GS-13 | S34 × E12 | Taranaki calf rearer × Pahiatua (Manawatu-Whanganui) — **adjacency branch** (`get_adjacent_regions`, `009:86-101` [V]); seed `open_to_relocate: false` so the 12-point branch, not the 16, is exercised | `location: 12` |
| GS-14 | S13 × E12 | needs accommodation × drive-in, no accommodation | `accommodation: 0` |
| GS-15 | S07 × E01 | needs accommodation × 3-bed house available, HB sheds | `accommodation ≥ 10`, `shed_type: 25` |
| GS-16 | S03 × E03 | couple × couple-or-single accommodation (`couples_welcome`) | `couples: 5` |
| GS-17 | S29 × E02 | NZ citizen (passes RTW gate) but Waikato × Canterbury, not adjacent | **not gated** + `location: 0` + low band — pins "gate-pass ≠ good match", the confusion MA-1's UI work must not blur (audit §3.3 reweighting caution) |
| GS-18 | S27 × E10 | needs 3-bed minimum × 2-bed offered | **staged on SK-2/EM-4 bedrooms**; until then asserts current behaviour (accommodation scores despite bedroom mismatch — documents the known blind spot) |
| GS-19 | S14 × E04 | seeker with **NULL `visa_status`** × visa-free-required job | **staged on PEND-02**: today asserts `visa: 0` (the silent-zero bug, PEND-02 issue 1 [V]); the fixture flips to whatever PEND-02 decides — this row is the executable record of that decision |

Coverage check: every scoring dimension asserted at least twice; both gate axes ×3; the adjacency, relocate, and same-region location branches each exercised; both "gate would fire" and "gate must NOT fire" directions present. Not covered in v1 (deliberate): recency multiplier, salary decay curve, skills preferred-bonus arithmetic — add rows when one of those changes, not before.

## 5. The harness (`tests/match-evals.test.ts`) · effort: M

The repo's DB-adjacent tests are static — they read migration SQL and assert posture (`tests/admin-analytics-rpcs.test.ts`, `tests/fk-indexes.test.ts` pattern [V]). That style cannot execute PL/pgSQL, so this is the repo's first test that needs a live Postgres. Keep it cheap:

- **Connection:** existing `@supabase/supabase-js` dependency against a **local** stack (`supabase start`), service-role key, calling `supabase.rpc('compute_match_score', {p_seeker_id, p_job_id})`. No new npm dependency [OPINION — ladder: already-installed dep over adding `pg`].
- **Gating:** `describe.skipIf(!process.env.MATCH_EVALS_URL)` — today's CI (`npx vitest run`, `ci.yml` [V]) skips it cleanly; locally `MATCH_EVALS_URL=http://127.0.0.1:54321 MATCH_EVALS_KEY=<local service key> npx vitest run tests/match-evals.test.ts`.
- **Safety guard:** harness throws unless the URL host is `127.0.0.1`/`localhost` — fixture seeding never touches a remote project (and the MCP is read-only anyway, per house rules).
- **Flow:** apply `seed.sql` (via `supabase.rpc`-free path: `psql` shell-out is avoided by shipping the seed as batched inserts through supabase-js, or simply instructing `supabase db reset && psql -f fixtures/match/seed.sql` as the local pre-step — pick at build time, either is fine) → loop `golden.ts` active fixtures → assert `gated`/`band`/`dimensions`/`total` → print a one-line diff table for any mismatch.
- Staged fixtures assert their **current-behaviour baseline** (see GS-01, GS-19) so landing a gate migration *forces* a golden-file edit — the mechanism that makes silent un-gating impossible in either direction.

### CI wiring note

`ci.yml` has one frontend `quality` job today [V]. Add a second job:

```yaml
match-evals:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: supabase/setup-cli@v1
    - run: supabase db start          # local Postgres, applies supabase/migrations/
    - run: psql "$LOCAL_DB_URL" -f fixtures/match/seed.sql
    - run: MATCH_EVALS_URL=... npx vitest run tests/match-evals.test.ts
```

Runs on every PR (it's ~2 minutes; path-filtering to `supabase/migrations/**` would let a `domain.ts` weight-constant change dodge it — not worth the hole) [OPINION]. Until this job lands, the harness is a required **local** step per the regression rules below.

## 6. Regression rules (the contract)

1. **Every change** to `compute_match_score`, its weights, `get_adjacent_regions`, any gate block, or the `010` precompute/cleanup path **must run the harness** — in CI once the job exists, locally (documented in the PR body with output) until then.
2. **Scores may only change when a fixture's expectation is deliberately updated** — same commit, with a dated line in the `golden.ts` CHANGELOG stating what moved and why. A red harness with no golden edit is a bug in the change, never a reason to relax an assertion.
3. **Gate migrations must flip their staged fixtures** in the same PR (GS-01–07, GS-19 as they activate). A gate PR with untouched fixtures is incomplete by definition.
4. New scoring dimensions or vocab changes add fixtures before or with the change — the golden set only grows; rows are removed only if the underlying Combined-Data source is superseded (dated note required).
5. Reweighting caution from the audit applies: when a gate zeroes pairs, re-run the nightly recompute and check GS-17 still reads "gate-pass, low score" — excluded and low must stay distinguishable end to end.

## 7. LLM-output evals (explanation / summary prose) · effort: S

Two LLM surfaces exist: `supabase/functions/generate-match-explanation` and `generate-candidate-summary` [V]. The deterministic score is never LLM-written ("Claude writes prose only, never the number" — Platform Audit §1.4 [V]); the eval therefore checks *prose discipline*, not scoring.

**Rubric (score each 0–2, pass = no zero anywhere):**

| Criterion | Check |
|---|---|
| Grounded in breakdown | every factual claim traces to a breakdown dimension or a profile/job field present in the fixture |
| No fabricated facts | no invented herd sizes, quals, place names, or circumstances |
| Number discipline | prose never states a total that contradicts `total_score`; ideally states no number at all |
| Length | explanation ≤ 80 words, summary ≤ 120 [MODELLED — tune once] |
| Framing | matching language, not ranking/triage ("strong fit on shed and region", never "top candidate #1") — house copy rule |

**Runner:** `scripts/llm-match-eval.ts` — takes the non-gated golden pairs (~12), invokes each Edge Function against the local stack, then one Claude-as-judge call per output with the rubric as the system prompt, JSON verdict out. Results land as `fixtures/match/llm-evals/YYYY-MM.json` (committed — the trend is the point).

**Cadence & cost:** **monthly, not per-commit** — LLM output is non-deterministic, so per-commit gating would flake, and the failure mode (prose drift) moves slowly. ~24 generation calls + ~24 small-model judge calls ≈ well under NZ$1/run [MODELLED]. A failed month = open an issue and fix the prompt, not block CI.

## 8. Effort summary

| Piece | Effort |
|---|---|
| `fixtures/match/seed.sql` (19 pairs mapped to current schema, cited row IDs) | S |
| `fixtures/match/golden.ts` + record-then-lock first run | S |
| `tests/match-evals.test.ts` harness (local-stack, skipIf-gated) | M |
| CI `match-evals` job (supabase CLI local stack) | S (after harness) |
| `scripts/llm-match-eval.ts` + rubric | S |
| Retiring `tests/match-scoring.test.ts` `it.todo` stubs into real assertions where the golden set covers them (delete the rest — a todo list is not a test suite) | S |

Sequencing [OPINION]: seed + golden + harness land **before or with** MA-1 (audit build-next item 3 bundles them); CI job immediately after the harness proves stable locally; LLM eval any time — it has no ordering dependency.
