# Match engine audit — 2026-08-15

**Source of truth:** `public.compute_match_score(p_seeker_id uuid, p_job_id uuid)`, read from
`pg_catalog` on 2026-08-15 (`algorithm_version = 2`). Everything below is read off the deployed
function body in prod, not from memory or from `src/`.

**How it was produced:** an end-to-end rehearsal in prod — a seeker profile, an employer profile
and an active job were created, the alert chain observed, then all three deleted. Prod was
returned to 3 accounts / 0 profiles / 0 jobs / 0 match_scores. The predicted score was written
down *before* running it and came back exact (88), so the model below is verified, not inferred.

---

## 1. What the engine does

Score = `round(100 × raw_total ÷ applicable_max)`, clamped to 0–100.

| Dimension | Max | Counts toward the denominator when |
|---|---|---|
| Shed type | **25** | `job.shed_type` is non-empty (i.e. dairy) |
| Location | 20 | always |
| Accommodation | 20 | always |
| Skills | 20 | the job has `job_skills` rows |
| Salary | 10 | always |
| Visa | 5 | always |
| Couples | 5 | `seeker.couples_seeking = true` |

- All dimensions applicable → `applicable_max = 105`
- Always-on base → `55`
- Non-applicable dimensions are removed from **both** numerator and denominator, and reported as
  `null` in the breakdown. **This part is well built** and is what let today's shed-type fix ship
  with no DB change: a non-dairy job simply scores on an 80-point base.

**Verified example.** Seeker: Waikato, rotary+herringbone, needs accommodation, NZ citizen,
min salary 60k. Job: Waikato, dairy, rotary, accommodation available, 65–95k, no sponsorship,
not couples-friendly.

```
shed 25 + location 20 + accommodation 10 + salary 10 + visa 5 = 70 raw
applicable_max = 80  (skills and couples not applicable)
→ 88
```

---

## 2. Findings

### F1 — Accommodation scores "doesn't need it" as a perfect match 🔴

```sql
IF v_seeker.accommodation_needed = false THEN v_accommodation := 20;
```

A seeker who needs **no** housing collects **20/20 on every job in the system**. A seeker who
*does* need housing, on a job that provides it, starts at **10** and only reaches 20 if the job
ticks pets *and* couples *and* family *and* utilities (`10+3+2+2+3`).

**Measured impact.** The verified example above scored **88**. Flip `accommodation_needed` to
`false`, change nothing else, and the same person against the same job scores **100** — twelve
points for *not needing something*.

This is the "not applicable" case being scored as "perfect" rather than being excluded. It
systematically ranks the seekers the dimension exists for *below* the seekers it doesn't apply
to. In NZ dairy, housing is frequently the deciding factor in taking a job, so this inverts a
signal the product is supposed to be good at.

**Fix:** gate it exactly like shed/skills/couples — `v_accom_applicable := seeker.accommodation_needed`
— and drop 20 from `v_max` when false. The machinery already exists a few lines away in the same
function. Small diff, no new concepts.

### F2 — `student` visa status can never score 🟠

`VisaStatus` has five members (`domain.ts:118`): `nz_citizen`, `permanent_resident`,
`working_holiday`, `student`, `needs_sponsorship`.

The scoring covers four:

```sql
IF   visa_status IN ('nz_citizen','permanent_resident')            THEN 5
ELSIF visa_status IN ('working_holiday','needs_sponsorship') AND job.visa_sponsorship THEN 5
```

`student` is unreachable — 0/5 on every job, forever, with no way to earn the points. Students
can legally work 20h/week in term time in NZ, which is squarely relevant to casual farm work.

### F3 — Working-holiday holders are penalised for the employer's setting 🟠

A WHV holder is legally entitled to work **without** sponsorship, but scores 0 unless the job
offers sponsorship. They are marked down for not receiving something they don't need. The
dimension conflates *"is entitled to work"* with *"needs sponsorship"*; only the first is a
property of the seeker.

### F4 — Pets and family bonuses test presence, not truth 🟡

```sql
IF v_seeker.pets   IS NOT NULL AND (job.accommodation->>'pets')   = 'true' THEN +3
IF v_seeker.family IS NOT NULL AND (job.accommodation->>'family') = 'true' THEN +2
```

`pets` is `{ dogs?, cats?, other? }` and `family` is `{ has_children?, ages? }` (`domain.ts:172,174`).
A seeker who explicitly answered *"no pets"* has a non-null object and still collects the bonus.
The check should read the boolean inside, not the wrapper.

### F5 — Skills scoring flattens the distinction that matters most 🟡

Required contributes up to 20; preferred then *adds* up to 12 more (`20 × 0.6`), capped at 20.

So a seeker matching **50% of required + 100% of preferred** (`10 + 12 → capped 20`) is
indistinguishable from one matching **100% of required** (`20`). For hiring, "has every
must-have" versus "has half the must-haves" is the single most important distinction, and the
engine cannot express it.

### F6 — `sector_pref` is a hard gate with only a client-side guard 🟠

`trigger_recompute_job_scores` filters:

```sql
WHERE NEW.sector = ANY(sp.sector_pref)
```

A seeker with `NULL` or empty `sector_pref` matches **nothing, silently, forever**. This is not
theoretical — the first rehearsal run hit exactly this and produced
`{"skipped":true,"reason":"no matches"}` with no error anywhere.

The wizard does guard it (`SeekerStep1FarmType.tsx:68` plus a disabled submit button), and the
trap is already documented in that file's header comment (verified 2026-08-11, LAUNCH.md R3).
**But the guard is client-side only.** There is no `CHECK` constraint and no `NOT NULL`. Any
seeker arriving by import, admin insert, backfill or direct API is invisible to every job ever
posted, with no signal to anyone. Given lead harvesting exists and imports are plausible, this
deserves a DB-level constraint.

### F7 — Shed type is the heaviest single weight 🟢 (ruling, not a bug)

Shed type (25) outweighs location (20). Defensible for a dairy-first product, but worth being a
conscious decision rather than an accident.

Note the composition shifts by sector after the 2026-08-14 dairy-only fix: on a **dairy** job
location is 20/105 ≈ 19% of the score; on a **non-dairy** job it is 20/80 = 25%. Same weight,
different meaning. Not a defect — a consequence worth knowing when comparing scores across
sectors.

---

## 3. Suggested order

1. **F1** — largest measured distortion (12 points), smallest fix, and it points the wrong way on
   a signal the product markets itself on.
2. **F6** — a DB constraint; cheap insurance against a silent, unobservable failure.
3. **F2 / F3** — visa correctness; both are small conditional edits.
4. **F4** — read the boolean, not the wrapper.
5. **F5** — needs a design ruling before code: should unmet *required* skills cap the whole
   dimension?

None of these are launch-blocking. F1 and F6 are the two that change outcomes for real people.

---

## 4. Out of scope / unverified

- **Whether the weights are *right*** is a domain judgement, not a code question. This audit says
  what the engine does and where it contradicts itself; it does not claim 25 for shed type is the
  correct number.
- **Email delivery.** The rehearsal proved Resend *accepted* the send (`{"sent":1}`). It did not
  prove the message landed — the alert goes to `admin.topfarms@gmail.com`, which is not the
  mailbox connected to this session.
- **Separately observed and unrelated to matching:** the mail health monitor reported
  `{"rate":0.68,"total":25,"delivered":17,"bounced":8}` — a **32% bounce rate**. Sustained, that
  damages domain reputation and threatens M3 outreach. Worth investigating before sending at
  volume. Filed here only because this is where it surfaced.
