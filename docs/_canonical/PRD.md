# TopFarms — Product Requirements (Canonical)

> **Status:** CANONICAL · **Consolidated:** 2026-06-20
> **Authoritative live source:** `.planning/REQUIREMENTS.md` + `.planning/PROJECT.md` (these win on any detail).
> **Consolidated from:** `PRD.md` (as-built v1.0/v1.1), `.planning/snapshots/PRD-2026-05-01.md` (v2.0 mid-flight snapshot), `.planning/REQUIREMENTS.md` + `PROJECT.md` (live, v2.1).
> **Supersedes (now archived / divergent):** `_archive/2026-06-20/TopFarms_Launch_Pack/docs/TopFarms_PRD_v3.docx`, the Drive `TopFarms_PRD_v3.docx` (scraping/subscription vision), the Drive `Engineering_Spec_v1.docx`, and all three legacy Google Docs ("FarmHands" PRD, training-platform status doc, "Revised Core Feature Set").

---

## 1. Product

**TopFarms** — a New Zealand **agricultural job marketplace**. Tagline direction: *Match · Train · Retain.*
Connects farm **employers** with farm **seekers**, using **transparent seven-dimension match
scoring** — a deterministic engine (`compute_match_score`, migration 072) that scores shed type,
location, accommodation, skills, salary, visa and couples fit against the dimensions applicable to
each role, normalised to 100. **Claude narrates the result** (`generate-match-explanation`,
`generate-candidate-summary`); it does not produce the score. That is deliberate: the score is
explainable, reproducible and auditable when an employer asks why a candidate is a 72.

> Renamed from the original **"FarmHands"** concept (2025). Any doc using "FarmHands" is legacy.

## 2. Users (two sides)

- **Employers** — post jobs, browse/shortlist matched seekers, pay listing + placement fees.
- **Seekers** — free profile + skills, browse jobs, apply, receive match scores.
- **Admin** — moderation, document verification, curated training content, leads pipeline.

**Training is admin-curated content, NOT a third marketplace side.** A provider self-service
training marketplace (courses/enrollments/commissions) was explicitly **rejected** for the
current product (it appears only in legacy FarmHands docs).

## 3. Sector scope

- **Current (v2.1): agriculture-broad** — six categories: livestock (dairy, beef, sheep, goats,
  pigs, poultry), cropping, machinery, farm-ops, management, cross-cutting (~24 competencies).
- **History:** v1.0–v2.0 shipped **dairy + sheep/beef only**; v2.1 re-broadened to ag-wide.
- **Future (v3.0+):** horticulture, viticulture, apiculture, aquaculture, forestry.

> Authoritative taxonomy detail lives in `.planning/REQUIREMENTS.md` and the skills-taxonomy
> migration (Phase 23). This doc records scope intent, not the canonical competency list.

## 4. Monetisation (v3 — decided 2026-08-04, directive 1.19)

> **The authority for pricing is `docs/design/v11-DIRECTIVE.md` §1.19**, which carries the
> verified competitive landscape, the rejected options and the revision triggers. This
> section is the summary.
>
> **Implementation status:** decision recorded, product change NOT yet built. Until
> `create-payment-intent` stops charging for a second listing, the shipped product still
> follows the v2 model below the fold. Do not publish "listings are free" copy before that
> lands.

- **Listing fees: NONE. Listings are free and unlimited**, no card ever required. This
  supersedes "first listing free, then $100 / $150 / $200", which suppressed the supply
  that creates liquidity at a stage where the incumbent competitor is $0.
- **Featured listing $99**, dormant until the median listing takes 5+ applications or job
  pages reach 1,000 weekly sessions. Top of search, highlighted card, and inclusion in the
  matched-seeker alert email.
- **Placement fees (unchanged):** flat tiers **$200 / $400 / $800**, derived **server-side**
  from the job's salary band + title. Acknowledged at shortlist, invoiced Net 14.
- **Replacement guarantee (new):** every placement fee buys one replacement for that role.
  **Permanent 90 days** (matching the trial period available to all NZ employers since
  23 Dec 2023), **fixed term 30 days**, **casual none** — a longer window would outlive a
  7-to-11-week seasonal job. One replacement per role, ever.
- **Seekers pay $0, absolutely.** No boost, no CV fee, no tier. The CV helper is free and
  exists to improve profile completeness, and therefore match quality.

<details><summary>Superseded v2 listing model (for provenance)</summary>

- Listing fees: first listing **FREE** (one per employer account, tracked as an entitlement — deleting the job does not restore it), then **Standard $100 / Featured $150 / Premium Plus $200 NZD** (per listing).
</details>
- **Placement fees:** flat tiers **$200 / $400 / $800**, derived **server-side** from the job's salary band + title (client values are display-only), billed via **Stripe Invoice (Net 14)** with day-7/14 follow-up emails. First placement is **not** free. Admin may apply a discount or waiver per fee (capability, not policy — no automatic rule).
- **Contact gate (Option C, locked 2026-07-30):** pre-placement the employer sees the structured profile, match breakdown, AI summary and a first-name label. The seeker's phone, email and CV document unlock when the placement fee is acknowledged (shortlist).
- **No subscriptions. No training commissions. No per-post $50.** (Those are archived/legacy models.)

## 5. Core feature set (MVP + shipped)

- Employer onboarding + job-posting wizard (with Stripe payment at publish).
- Seeker onboarding + skills profile; accommodation, couples, shed-type and other NZ-dairy-specific filters.
- **Transparent seven-dimension match scoring** between seekers and jobs, narrated in plain
  language by Claude (core — not deferred). The score itself is deterministic PL/pgSQL.
- Applications / shortlisting; placement-fee + shortlist-acknowledgement gating (revenue protection).
- Document verification — **both** seeker documents and employer verification submissions land
  `pending` and are approved by an admin through the queue at `/admin/documents`; the badge means
  a human checked the evidence. Signed-URL access only, and every admin document view is written
  to `admin_audit_log`.
- Saved searches.
- Admin: super-admin dashboard, analytics, leads queue.

**Auth:** email/password **plus Google and Facebook OAuth**.

**Messaging / Expressions of Interest:** **Growth Phase** — database tables exist but **no MVP UI**.

**Data scraping / leads:** a **separate admin build track** (commercial **Firecrawl** lane is live
for admin lead harvesting). It is **not** part of the public marketplace MVP and does **not**
auto-insert into the public `jobs` table — leads pass through a gated pipeline with human approval.
See [`Data_Architecture.md`](./Data_Architecture.md).

## 6. Tech stack (summary)

React 19 · TypeScript · Vite 6 · Tailwind v4 · Supabase (Postgres/Auth/Storage/Realtime/Edge
Functions) · Claude API · Stripe · Resend · Vercel. Full detail in [`Data_Architecture.md`](./Data_Architecture.md).

## 7. Status

- **v1.0 MVP** shipped 2026-03-17. **v1.1** (SPEC compliance) complete.
- **v2.0** (OAuth, email pipeline, bug-fix/hardening, super-admin) complete through Phase 22.
- **v2.1** (ag-broad skills taxonomy, admin analytics) active at Phase 23; launched / launch-ready.
- Open quality gates as of 2026-06-10 audit: `tsc -b` errors, no frontend CI, bundle size — see `AUDIT-AGENTIC-2026-06-10.md`.

## 8. Non-goals (explicitly out)

Scraping inside the public marketplace MVP · provider-side training marketplace · in-app messaging UI at MVP · subscription pricing · horticulture/viticulture verticals (deferred to v3.0+).
