# Training & qualifications: fit, data model, sequencing, risks

Type: research
Status: resolved

## Question

The operator is weighing a post-launch differentiator: plug skills-training providers and
qualifications into the platform — seekers find training to advance, employers get an
upskilling channel. Assessment only: architecture fit, data-model impact, sequencing after
launch, risks. Do not build.

## Answer

Assessed 2026-08-07 against the repo, not from scratch — because the repo already contains
most of this thinking.

### 1. This idea is already half-designed in this repo, and that is the headline

`v2.1-MILESTONE-SCOPING.md` (2026-05-29, operator-approved) scoped exactly this as the
**Match + Train + Retain** thesis, split into three phases that survive contact with the new
framing unchanged:

| Phase | What it is | Status |
|---|---|---|
| 24 — Skills-gap analysis | `job_skills − seeker_skills` as pure SQL set difference, surfaced on match views with training links | Scoped, **gated** |
| 25 — Training directory + funding navigation | Admin-curated NZ ag training, filterable, tagged with the same taxonomy, funding context per entry, "express interest" lead capture | Scoped, **gated** |
| 26 — Credential / expiry tracking | Seeker credentials (GROWSAFE, machinery tickets, DairyNZ levels) with Resend + pg_cron expiry alerts; track, never verify | Scoped, **gated** |

The scoping also pre-answered the hard strategic questions, with reasons recorded:
**providers are curated content, not an acquired marketplace side** (NZ ag training is finite
and institutional — a third side's cold-start problem is refused, not solved);
**bookings/payments deferred** to a monetised phase (NZ ag training is largely subsidised —
funding *navigation* is the value, and it is content, not integration); a **hard
zero-added-cost constraint** (no LLM calls, no new SaaS — gap analysis is SQL); and four
**kill/pivot signals** including directory-content rot ("Te Pūkenga is actively reorganising
— enforce `last_reviewed_at` or cut it").

The assessment's first conclusion is therefore: *do not re-derive this*. The new framing adds
one genuinely new element — validating demand **before** the gate opens — and that is exactly
what the S1 demand form is for.

### 2. Architecture fit — clean, because the join key already exists

The load-bearing asset is the **Phase 23 skills taxonomy**: 24 competencies across 6
categories, live in prod as the `skills` table (verified 2026-08-07: 24 rows, uuid PK,
category + discipline columns), consumed by both onboarding wizards and the job-posting
wizard through the shared `SkillsPicker`, and carried into matching as `job_skills` /
`seeker_skills` with a 20-point skills dimension in `match_scores`.

Training bolts onto that key without touching the core:

- **Directory (25):** `training_providers` + `training_offerings` (offering → `skill_id[]`,
  region, format, funding-context text, `last_reviewed_at`) + `training_interest` (the lead
  capture — same queue pattern as Phase 21 doc verification). Read-mostly, admin-written
  under `_admin_gate()`, RLS-public read. **No existing table changes.**
- **Gap analysis (24):** a read-only derivation over tables that already exist. One RPC or
  view; zero schema change.
- **Credentials (26):** `seeker_credentials` (type, expiry, optional link to
  `seeker_documents`) + one pg_cron job for expiry alerts through the existing Resend lane.

The demand form (S1) is deliberately keyed to the same taxonomy (`skill_id uuid[]`), so its
responses join directly against future `training_offerings.skill_ids` — the partner-signal
query is a join, not a re-survey.

Match-engine impact: **none required**. The scoring stays untouched; training reads its
outputs. Anything that *writes* back into scoring (e.g. boosting matches for
credential-holders) is explicitly out of scope until the core has liquidity — that would be
retuning an engine that has not yet run on real data.

### 3. Sequencing — after launch, behind two gates, in the order 25 → 24 → 26

The existing liquidity gate stands: **≥ N real employer-posted jobs** (v2.1's criterion; prod
today measures 0 jobs, 0 `job_skills` rows). To it this assessment adds the demand-form gate:
**S1 responses naming specific competencies from both sides** before committing build effort.
Two cheap gates beat one argument.

Order, revised from the numbering:

1. **25 first** — the directory is pure content + one table, the smallest honest slice, and
   the demand form tells you *which* providers to curate first. It also works with thin
   liquidity (a seeker with no matches can still browse training).
2. **24 second** — gap analysis needs real `job_skills` rows to say anything; it is the
   match→train bridge and lands best once matches exist to bridge from.
3. **26 last** — retention is a tenure play; it presupposes placed workers.

Earliest sensible start: after the launch-week dust settles **and** both gates show signal.
Weeks, not days, post-launch — and if the kill signals fire instead, the answer is recorded
in advance: stop, don't build deeper.

### 4. Risks

| Risk | Weight | Mitigation (mostly pre-existing) |
|---|---|---|
| **Content rot** — NZ vocational-education landscape is actively reorganising; a stale funding claim is worse than none | High | `last_reviewed_at` discipline or cut the directory (scoping's own kill signal); funding context as prose, never price/promise |
| **Third-side temptation** — provider self-service, acquisition funnel, bookings | High if indulged | Already rejected with reasons; providers stay admin-curated content |
| **Pre-liquidity distraction** — training engineering while the core marketplace stalls | High | The gates; scoping's own question: "is more training engineering the right next thing, or the more fun next thing?" |
| **Demand-form false positive** — interest clicks are cheap; curation effort is not | Medium | Treat S1 as *ranking* signal (which competencies first), not as a green light by itself; liquidity gate still applies |
| **Taxonomy strain** — training providers describe offerings finer than 24 competencies | Medium | Map offerings to competencies many-to-many and accept lossiness; do NOT fork the taxonomy — it is the match engine's vocabulary |
| **Credential-verification creep** — "track, don't verify" erodes under user requests | Medium | Scope line already written into Phase 26; verification is a trust product with legal weight, not a feature |
| **Regulatory adjacency** — training shades into immigration advice for migrant workers | Low now | Immigration phase is deliberately parked; keep the two decoupled until it unparks |

### 5. What was decided here

- Placed on the go-live map as **M6, post-launch, gated** — liquidity gate (existing) +
  demand-signal gate (new, fed by S1).
- Build order within M6: **25 → 24 → 26**.
- The demand form's schema commitment: responses keyed to `skills.id` so the future join is
  free. (This is the one place item 3 and item 2 touch; it is why the form uses uuids, not
  free text.)
- Everything else in `v2.1-MILESTONE-SCOPING.md` — constraints, rejections, kill signals —
  stands unmodified and is inherited by M6 by reference.
