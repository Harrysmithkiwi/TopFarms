# TopFarms GTM Priority Roadmap

Mapped from the full GTM playbook tree against reality on 2026-07-29: two-sided NZ farm-jobs
marketplace, founder-led, quiet launch (Option A), DB at cold-start (6 users / 0 jobs), **zero product
analytics**, canonical brand/positioning docs already exist in `docs/_canonical/`.

Ruling principle: **for a jobs marketplace, engineering IS the primary channel** (Google Jobs
indexation via JobPosting schema, per-job SEO pages) and **the leads pipeline IS the CRM**. Most of the
playbook tree is a scale-stage artifact — explicitly killed below so it doesn't creep back.

---

## Horizon 0 — Launch week (now)

| # | Playbook node | TopFarms move | Status / effort |
|---|---|---|---|
| 0.1 | Metrics → GTM Dashboard | **Vercel Analytics + minimal funnel events** (signup start/complete per role, job view, apply, post-job publish). Everything downstream is blind without it. | Not started — S (audit dim 17) |
| 0.2 | Launch Plan → Launch Tiers/Timeline | Execute Option A: operator approves ~19 staged farms in `/admin/leads/staging`, hand-sends Lane-A outreach (template: `docs/OUTREACH-EMAIL.md`, drafts via `lead-draft-email`). | Tooling shipped; **human sends** |
| 0.3 | Foundation (ICP / Personas / JTBD) | Codify the 1-pager from what's already implicit in `_canonical/PRD.md` + `Brand_and_Design.md`: employer ICP = NZ dairy/pastoral farm owner-operators; seeker ICP = farm workers incl. migrant workers. JTBD: employer = "relief from hiring"; worker = "be seen for what I can do". | ~1 hr writing, not a project |
| 0.4 | Pipeline → CRM Setup | Leads admin (`/admin/leads/*`) is the CRM. Asana boards per `phase-1-build-notes.md` locked constraints. **Do not add a real CRM.** | Done — resist expansion |

Gate: audit P0s closed (incl. red CI + branch protection) before 0.2 sends a single email.

## Horizon 1 — Weeks 2–8 (first real listings live)

| # | Playbook node | TopFarms move | Effort |
|---|---|---|---|
| 1.1 | Channels → Inbound | **Engineering-led SEO**: JobPosting JSON-LD on `/jobs/:id`, auto-generated sitemap incl. job URLs, per-route OG/canonical (needs prerender or edge OG injection — decide once). This is THE channel: Google Jobs indexes listings free. Doubles as audit P1 fixes. | M |
| 1.2 | Content Engine → SEO Content | 2–3 pages targeting "farm jobs NZ / dairy jobs [region]" queries; the router currently has **no blog/about/content hub** — smallest viable: static content routes. | M |
| 1.3 | Demand Gen → Social Selling | Ship the finished LinkedIn carousel sitting unpublished in `content/carousels/2026-06-27-why-good-workers-leave/`; founder posts weekly. Zero build cost. | S |
| 1.4 | Messaging → Objection Handling | Ground it in real Lane-A/Lane-B replies (`TopFarms_Outreach_Reply_Config.md` exists). Update outreach template from what actually gets responses. | S, ongoing |
| 1.5 | Conversion → Trial/Funnel | Onboarding + activation fixes driven by 0.1 funnel data + audit findings (empty states that convert, not dead-end). | M |

## Horizon 2 — Months 2–4 (after first placements)

| # | Playbook node | TopFarms move |
|---|---|---|
| 2.1 | Content Engine → Case Studies | First placement → testimonial → case study → social proof on landing. The single highest-leverage content asset; impossible before a real placement. |
| 2.2 | Customer Success → Advocacy | Placement follow-up call → testimonial ask → **worker-refers-worker referral loop** (rural word-of-mouth is the native channel). |
| 2.3 | Pricing → Pricing Research | Validate the placement fee against real invoice behaviour (paid fast? negotiated? churned?). Don't redesign pricing on zero data. |
| 2.4 | Metrics → CAC/LTV, Win/Loss | Only now meaningful — needs closed placements + the H0 measurement. |

## Horizon 3 — Month 4+ (only after matching is proven)

- **Positioning → Differentiation / Category Design**: the parked **immigration phase is the play** —
  founder-lawyer moat, accredited-employer badge (INZ list feasibility confirmed). Unpark when
  placements repeat.
- **Demand Gen → Paid Ads**: only after organic converts and CAC is measurable.
- **Scale → New Segments/Geographies**: other farm types / regions after dairy-pastoral works.

## Kill list (explicitly not doing — do not let these creep in)

ABM, webinars, events, enterprise motion, seat expansion, sales-led motion + demo scripts, QBRs,
proposal/negotiation playbooks, GTM team hiring, RevOps, attribution tooling beyond Vercel Analytics,
category-design campaigns. TopFarms is self-serve + founder outreach; revisit this list at repeatable
placements, not before.

## Dependency spine

Audit P0s → 0.1 measurement → 0.2 quiet launch → 1.1 SEO channel → real listings → 2.1 social proof →
H3 differentiation. Nothing in H1+ is worth starting before its upstream exists.
