# Founder Analytics Dashboard — Design (Step 1, pre-build)

*2026-06-11 · Status: APPROVED — operator selected §4 RECOMMENDED option
(reuse admin role) on 2026-06-11; build authorized. Product feature work; explicitly NOT part of the
pre-launch security queue (037, registry repair, exposure fixes, PEND-01),
which it must not touch or delay. CRM is out of scope by operator instruction.*

---

## 1. What the cockpit answers

Four questions, one panel each:

| Panel | Question | Meaningful at today's N? |
|---|---|---|
| **Funnel** | Are people flowing signup → onboarded → applying → hired? | Yes — counts are honest at any N (today: 6 users, 3 jobs, a handful of applications) |
| **Cohorts** | Do users who join stick around? | Partially — one or two cohorts exist; the panel renders but trend lines need ~3 months of signups |
| **Match quality** | Do higher match scores actually convert to hires? | Not yet — needs ≥ ~30 completed applications for signal; panel shows bands with low-N warning |
| **Revenue** | Listing fees + placement fees, by month/region/tier | **Empty by design until PEND-01** — built against the real `listing_fees` / `placement_fees` schema, zero rows today. An empty panel pre-launch is correct, not a bug. No fake data. |

## 2. Metrics, precisely

### 2.1 Funnel (per role, with date-range filter)
Mapped to columns that exist today:

| Stage | Source |
|---|---|
| Signed up | `user_roles.created_at` (+ `role`) |
| Onboarding complete | `seeker_profiles.onboarding_complete` / `employer_profiles.onboarding_complete` |
| First action | seekers: first `applications.created_at`; employers: first `jobs.created_at` (status != 'draft') |
| Pipeline depth | `applications.status` distribution across the real state machine: applied → review → interview → shortlisted → offered → hired (domain.ts VALID_TRANSITIONS) |
| Placed | `applications.status = 'hired'`; commercial confirmation via `placement_fees.confirmed_at` |

Output: stage counts + stage-to-stage conversion %, split seeker/employer.

**Known gap (deferred, do NOT build now):** `applications` has no
status-transition timestamps (only `created_at`, `viewed_at`), so
*time-in-stage / velocity* is not computable. Fixing that needs an
`application_status_history` table + trigger — a WRITE path, which violates
this phase's read-only constraint. Goes on the backlog as its own decision;
v1 funnel is a snapshot, clearly labelled as such.

### 2.2 Cohort retention
Cohort = signup month (`user_roles.created_at`), per role.

**Honest limitation:** `analytics_events` exists but has **zero rows ever** —
there is no activity event stream to compute true month-over-month retention
from. Two proxies are computable read-only today:
- `auth.users.last_sign_in_at` (readable inside a definer RPC) → "active in
  the last 30/60/90 days" per cohort. Coarse — it's last-touch, not
  month-by-month presence.
- Action-based: cohort members with any application / job posted in month X+1,
  X+2, X+3 (timestamps exist for these).

v1 ships: cohort size × {pct active ≤30d / ≤90d (sign-in proxy), pct with
action in X+1..X+3 (action proxy)}. True retention curves require
instrumenting `analytics_events` — separate, write-path decision; flagged,
not built.

### 2.3 Match quality
`match_scores.total_score` (and `breakdown`) joined to application outcome:
placement rate per score band (e.g. <50 / 50–69 / 70–84 / 85+), plus mean
score of hired vs declined. Computable read-only today. Caveat rendered in
the UI when completed-application count < 30: "insufficient volume for
signal". Watch-out documented: `match_scores` has a cleanup trigger
(migration 027) — scores for closed jobs may be deleted, so the join is on
historical applications and the panel must tolerate missing scores
(LEFT JOIN, "unscored" band) rather than silently dropping rows.

### 2.4 Revenue (post-PEND-01)
- Listing fees: `listing_fees` (written by the now-working stripe-webhook) —
  monthly totals, by tier.
- Placement fees: `placement_fees.amount_nzd`, `fee_tier`, `confirmed_at`,
  region via employer join — monthly totals, by region and tier; plus
  acknowledged-but-unconfirmed balance (pipeline revenue).
- All `count`/`sum` aggregates; zero rows until launch → zeros render as
  zeros with a "pre-launch — no live billing" caption.

## 3. Data model: existing vs new

**Queryable today (no schema change):** everything in §2 marked computable —
user_roles, seeker/employer_profiles, jobs, applications, match_scores,
placement_fees, listing_fees, auth.users.last_sign_in_at (definer-side).

**New objects: 4 SECURITY DEFINER RPCs, nothing else.** No new tables, no
triggers, no views, no writes, no new policies:

| RPC | Returns (aggregates only) |
|---|---|
| `admin_analytics_funnel(p_from date, p_to date)` | jsonb: per-role stage counts + conversion rates |
| `admin_analytics_cohorts()` | jsonb: rows of {cohort_month, role, size, active_30d, active_90d, acted_m1..m3} |
| `admin_analytics_match_quality()` | jsonb: rows of {score_band, applications, hired, placement_rate} + means |
| `admin_analytics_revenue(p_from date, p_to date)` | jsonb: monthly {listing_fees_nzd, placement_fees_nzd, by_tier, by_region}, pipeline balance |

Each: `SECURITY DEFINER` + `SET search_path = public` + `PERFORM
public._admin_gate()` first line + `GRANT EXECUTE TO authenticated` only —
byte-for-byte the 023 pattern. No anon grant (and note: staged 037 already
revokes anon on the existing admin family; these are born compliant).
**PII rule:** no RPC returns names, emails, user_ids, or any row-level
record — counts, sums, rates, and month buckets only. Enforced by shape
tests (§5).

**Empty-until-volume map (explicit):** revenue = empty until PEND-01;
match-quality = low-N warning until ~30 completed applications; cohorts =
1–2 cohorts until ~3 months of signups; funnel = honest at any N.

## 4. Access tier — RECOMMENDATION: reuse the existing `admin` role

**Decision needed from operator before build.**

**Recommend: reuse `admin`.** Reasons:
- There is exactly one admin human today — the founder (admin@topfarms.co.nz,
  Phase 20.1 bootstrap). A founder tier above admin would today protect the
  founder from… the founder.
- A second tier means a new role value through the whole gate chain
  (`get_user_role`, `_admin_gate` variants, ProtectedRoute, user_roles CHECK,
  every RLS audit from now on) — exactly the kind of new security surface the
  pre-launch queue is trying to shrink, added at the moment we're hardening.
- The real trade-off arrives when a second human gets admin (a hired
  document-verifier seeing revenue). That is post-launch by definition.

**Mitigation that keeps the door open:** name all four RPCs with the
`admin_analytics_` prefix and keep them in one migration. If/when a
moderator role is hired, splitting the tier is one migration: create
`founder` role + `_founder_gate()`, flip four `PERFORM` lines and four
GRANTs. The dashboard route moves with one `requiredRole` prop. Documented
here so future-us doesn't re-derive it.

**Alternative (not recommended now):** distinct `founder` tier. Buys
verifier/revenue separation immediately; costs a third role in every gate
and RLS audit pre-launch, for a separation no current human needs.

## 5. Build plan (Step 2, after tier decision)

1. Migration 039: the 4 RPCs (023 pattern). Applied via the established
   Management-API path with operator authorization; registry-repair list gets
   039 appended.
2. `/admin/analytics` route: ProtectedRoute (chosen tier) + AdminLayout +
   sidebar entry. Four panels using existing primitives (Card, Tag,
   AdminTable for band/cohort tables; CSS-only bars — **no chart library, no
   new dependencies**). Revenue panel renders zeros with pre-launch caption.
3. Tests (existing adversarial style):
   - gate: each RPC surfaces 'Not authenticated' / 'Forbidden' (admin-rpc-gate pattern)
   - rls-not-widened extension: migration 039 contains no anon grant, no
     policy changes, no table DDL
   - PII shape: returned jsonb contains no keys matching
     /email|name|user_id|phone/ and no arrays of per-user records
   - e2e: admin storage-state opens /admin/analytics, sees four panels
     (cred-gated like the other admin flows)
4. Bookkeeping: audit-state.json notes this as additive feature work (not
   audit remediation); ROADMAP/REQUIREMENTS entry per GSD convention.

**Out of scope, restated:** CRM/relationship tables, outreach, pipeline
writes, message analytics, training providers (no data model exists —
Phase 25, gated), event instrumentation (write path), status-history
timestamps (write path).
