# TopFarms — Master Compendium

> **Status:** CANONICAL INDEX · **Consolidated:** 2026-06-20 · **Product state:** v2.0 complete (through Phase 22), v2.1 active (Phase 23, ag-broad taxonomy), launched.
>
> This is the single entry point to TopFarms documentation. It indexes and summarises
> everything and points to the authoritative source for each topic. When this document
> and a **live source** disagree, the **live source wins** — this compendium is a map,
> not a second copy.

---

## How authority works here

There are three tiers. Always resolve top-down:

1. **Live ground truth (code & live planning ledgers)** — the real, current state.
   - Product / requirements: `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`
   - Database schema: `supabase/migrations/` (001 → latest)
   - Brand tokens: `src/index.css` (Tailwind v4 `@theme`)
2. **Canonical consolidated docs (this folder, `docs/_canonical/`)** — human-readable
   summaries that resolve the old conflicts and point back to tier 1.
3. **Archived historical docs (`_archive/2026-06-20/`)** — superseded; kept for provenance
   only. **Do not cite.** See `_archive/2026-06-20/MANIFEST.md`.

---

## The canonical set

| Doc | Covers | Authoritative live source it points to |
|---|---|---|
| [`PRD.md`](./PRD.md) | Product definition, users, scope, pricing, feature set | `.planning/REQUIREMENTS.md` + `PROJECT.md` |
| [`Brand_and_Design.md`](./Brand_and_Design.md) | Brand (v2), design tokens, typography, voice | `src/index.css`; `.planning/v2-migration/TopFarms_Brand_Spec_v2.md` + `DESIGN.md` |
| [`Data_Architecture.md`](./Data_Architecture.md) | Stack, schema, leads/ingestion pipeline, integrations | `supabase/migrations/`; `SPEC.md` (feature ref) |

---

## What TopFarms is (one paragraph)

TopFarms is a New Zealand **agricultural job marketplace** connecting farm **employers**
(who pay) with farm **seekers** (free), with **Claude-powered match scoring**. Revenue is
**listing fees** (first free, then $100 / $150 / $200 NZD) plus flat **placement fees**
($200 / $400 / $800, Stripe Invoice Net 14). As of **v2.1** the taxonomy is
**agriculture-broad** (livestock / cropping / machinery / farm-ops / management /
cross-cutting). Training is **admin-curated content**, not a third marketplace side.
A separate **admin leads-harvesting** track (Firecrawl) feeds a gated lead pipeline; it is
**not** part of the public marketplace MVP.

---

## Resolved conflicts (what the old docs got wrong)

These were the live contradictions across the pre-consolidation document set. The
**resolved / current** column is what's true now; everything else is archived.

| Topic | Superseded claims (archived) | Resolved / current truth |
|---|---|---|
| **Product name** | "FarmHands" (2025 GDocs) | **TopFarms** (renamed) |
| **Monetisation** | employer subscriptions; $50/post; $100-only; training commissions | **Listing tiers (free/$100/$150/$200) + placement fees $200/$400/$800.** No subscriptions, no training commissions. |
| **Sector scope** | "dairy + sheep/beef ONLY" (v1.0–v2.0); 13-sector broad (FarmHands) | **Ag-broad (6 categories) as of v2.1.** Horticulture/viticulture/apiculture/aquaculture/forestry = future v3.0+. |
| **Data scraping** | Apify scraping as MVP-core pillar | **Out of the marketplace MVP.** Separate admin track, Firecrawl-based. |
| **Training marketplace** | full third side (Courses/Enrollments, provider dashboard "complete") | **Rejected.** Admin-curated content only. |
| **AI matching** | "❌ not in MVP" (one cut list) | **Kept — core.** Claude-powered match scoring. |
| **Brand** | v1 soil/moss earth-tones + Fraunces/DM Sans (`docs/design-system.md`) | **v2: single green `#16A34A` + Inter.** v1 fully retired. |
| **Schema / ingestion** | `raw_posts`/`parsed_jobs` + Apify (Data_Architecture.html, eng-spec) | **`lead_staging`/`leads`/`lead_suppression` + Firecrawl**, gated via SECURITY DEFINER RPCs (migrations 041–046). |
| **Messaging** | core MVP epic (Sprint 4) | **Growth Phase** — tables only, no MVP UI. |
| **Auth** | email/password only | **email/password + Google + Facebook OAuth.** |

---

## Where the rest of the docs live

- **Live planning ledger & roadmap:** `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`
- **Per-phase history (GSD machinery):** `.planning/phases/`, `.planning/milestones/` — git-managed process record, out of audit scope.
- **Dated audit snapshots (historical records, kept in place):** `SENSE_CHECK_AUDIT_2026-05-01.md`, `AUDIT-AGENTIC-2026-06-10.md`, `.planning/TOPFARMS-REPO-OVERVIEW.html`, `.planning/v2-migration/TopFarms_Migration_Audit.md`, `.planning/v2-migration/PHASE-19-KNOWN-STATE.md`.
- **Archived superseded docs:** `_archive/2026-06-20/` (+ `MANIFEST.md`).

## Out-of-repo follow-ups (manual)

- **Google Drive:** collapse duplicate `TopFarms_PRD_v3.docx` copies; archive/delete the divergent Drive PRD, `Engineering_Spec_v1.docx`, `Rejuvenation_Guide.docx`, the three legacy GDocs, and the `Untitled document` orphan. (Full list in `_archive/2026-06-20/MANIFEST.md`.)
- **Claude Project knowledge:** re-upload only this `docs/_canonical/` set; remove stale uploads.
