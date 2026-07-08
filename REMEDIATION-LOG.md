# REMEDIATION-LOG — Stage 2 (started 2026-07-08)

> Tracks: (1) re-baseline vs the frozen audit, (2) per-dimension grade movement,
> (3) **every Tier-1 live-file edit and structural change** (LOCKED #12), (4) divergences
> where LOCKED decisions override audit recommendations. Baseline:
> `.planning/audits/TopFarms_Operating_Audit_2026-07-08.md` (commit 778e193).

## Locked-decision divergences from the audit (recorded per brief)

| Audit said | LOCKED decision | Note |
|---|---|---|
| Single "Model B" %-of-salary placement pricing | **Segmented**: Segment A flat (~$100 listing / ~$300–400 placement [MODELLED]) live now; Segment B % + Season Pass specced-dormant | %-pricing reads "recruiter" to owner-operators; fights the brand. B activates up-market/AU-UK |
| $10M plausibility hedged ~20-25% | $10M is **the** goal; NZ→AU→UK, all primary industries | AU/UK carry the arithmetic; NZ alone cannot — stated honestly in models |
| Kill listing fees during liquidity build (Model B) | **Keep** first-free + ~$100 Segment-A listing fee | Founder call: legibility over friction-removal; WTP-test in cohort |

## Re-baseline table (audit grade → TRUE grade at build start → target)

| Dimension | v1 grade | TRUE 2026-07-08 | Why different | Gap to A |
|---|---|---|---|---|
| Vision / North Star | C− | C− | — | NORTH-STAR.md (decision now locked) |
| Strategy & marketplace design | B− | B− | — | density plan, supply-side rebalance, expansion sequence |
| Market opportunity | D | D | — | MARKET-DATA seed + TAM/SAM/SOM pack |
| Monetisation & pricing | D | D | — | segmented pricing model + lab |
| Product & portfolio | B+ | B+ | Platform Audit already charted gaps | specs: ?lead=, profile-edit, gates |
| IP & data | B− | B− | — | Index spec + parser/raw_ingest |
| Delivery system | C+ | C+ | — | SOPs, automation boundary |
| AI capability | B− | B− | — | evals harness spec |
| Data/schema/architecture | A− | **A−** | 057 applied + PEND-02 tracked (post-audit, same day) | RLS dogfood note |
| Marketing & GTM | B− | B− | GTM corpus fresh but unexecuted | SEO/retention/referral + rush tier |
| Founder brand | D | D | — | publishing plan + list + Index |
| Sales | C+ | C+ | — | Segment-A scripts, pipeline CSV, Founding-25 re-cut |
| Operations | B− | **B** | ci.yml + e2e live post-June-audit; 476 tests green | branch protection (FA-03), dashboards spec |
| Team & automation boundary | C | C | — | staged plan vs bootstrap cash |
| Governance | D+ | D+ | strong eng substrate, zero legal layer | legal pack A-READY (FA-02/05/11) |
| Financial model | F | F | — | pricing + expansion models [MODELLED] |
| Founder constraints | C | C | — | coaching → FOUNDER-ACTIONS + weekly metric |

## Tier-1 live-file edits & structural changes

| # | Date | File | Change | Why |
|---|---|---|---|---|
| E-01 | 2026-07-08 | (branch) | Created `remediation/stage-2` off `docs/gtm-funnel-spec` | isolate Stage-2 work |
| E-02 | 2026-07-08 | `.planning/audits/` (new dir) | Froze audit v1.0 baseline | LOCKED #12 |
| E-03 | 2026-07-08 | `src/pages/Home.tsx` | **Truth pass:** unrendered `TestimonialsSection` + `TrustedByStrip` | fabricated testimonials/stats ("Sarah M.", "500+ Farms", "95% Satisfaction", fake Verified badges) and real brands (Fonterra Sharemilkers, Silver Fern Farms) falsely implied as customers, on the live site |
| E-04 | 2026-07-08 | `TestimonialsSection.tsx`, `TrustedByStrip.tsx` | DO-NOT-RENDER guard headers (files kept for layout reuse) | reinstate only with real, per-name-consented content |
| E-05 | 2026-07-08 | `tests/landing-page.test.tsx` | LAND-05/08/09 rewritten from "fabrication renders" to "fabrication stays removed" guards; 25/25 green | tests were enforcing the fabrication |
| E-06 | 2026-07-08 | `.planning/PROJECT.md:113` | Design-system constraint corrected v1 (Fraunces/soil-moss) → Brand v2 (Inter/#16A34A) | live-vs-canonical contradiction (audit §B surprise #2) |
| E-07 | 2026-07-08 | root | Deleted `download.html` (empty), `download.txt` (Drive-mirror export artefact) | junk; `.docx` strays NOT deleted → FA-12 |
| E-08 | 2026-07-08 | `.planning/NORTH-STAR.md`, `.planning/research/MARKET-DATA.md`, `FOUNDER-ACTIONS.md`, `REMEDIATION-LOG.md` (new) | M0 core docs | Stage-2 scaffolding |

*Note: mandate STEP 0 says re-read "the Executive Playbook" — it does not exist in the repo
(audit §B / `funnel-design.md:5`); the GTM corpus is the operative source. Divergence noted.*

## Dimension progress (running; updated per milestone)

| Dimension | Asset(s) built | New grade | Status |
|---|---|---|---|
| Vision / North Star | `.planning/NORTH-STAR.md` (decision, incl. liquidity gate N + Phases 24-26 gate resolution) | **A** | done M0 |
| Market opportunity | `MARKET-DATA.md` seed + `docs/commercial/MARKET-SIZING.md` (bottom-up TAM/SAM/SOM per country×vertical, banded) | **A-READY** | pending FA-09/FA-10 (real NZ workforce + DEFRA verify) |
| Monetisation & pricing | `docs/commercial/PRICING-MODEL.md` (segmented architecture, 4 models, margin/line, elasticity, B-triggers, honest §7 verdict on the 6-mo stretch) | **A-READY** | pending FA-07 lab data |
| Strategy & marketplace design | `EXPANSION-MODEL.md` (vertical order, country trigger gates, port/localise, cold-start costing) + NORTH-STAR gates | **A-READY** | pending real liquidity data |
| Governance | `docs/legal/` pack (Privacy, ToS, DPIA, breach runbook, sub-processor register) + live `/privacy` `/terms` routes + SignUp links wired; 25/25 landing tests green | **A-READY** | pending FA-02/FA-05/FA-11 (lawyer/entity/sign-off) |
| Financial model | PRICING-MODEL + MARKET-SIZING + EXPANSION-MODEL §6 ($10M path by cell, [MODELLED]) | **A-READY** | pending live conversion data (FA-01/FA-07) |
| AI capability | `docs/product/MATCH-EVALS-SPEC.md` (19-pair golden set from study rows; gate-regression rules; LLM rubric) | **A-READY** | build = M-effort follow-up; spec complete |
| Operations | `docs/product/MARKETPLACE-METRICS-SPEC.md` (North-Star dashboard, liquidity-gate widget, `application_status_history` enabler, 5 new RPCs specced) + README front door + CONTINUITY.md | **A-READY** | pending FA-03/FA-04/FA-06 + build |
| Product & portfolio | SEASONAL-INSIGHTS-SPEC (27-row [V]-sourced calendar, rolling-demand proof: ≥3 sectors every month) | B+→**A-READY** | build follow-up |
| Team & automation | `docs/ops/TEAM-AUTOMATION-PLAN.md` (bootstrap cash-triggered stages; >12-FTE margin rule) | **A** | decision doc, done |
| Founder brand | `.planning/gtm/founder-brand-plan.md` (Tuesday email, 4 pillars, signature frameworks, kill rule) | **A-READY** | pending FA-08 (first send) |
| Marketing & GTM (channels) | `.planning/gtm/seo-plan.md` (staged, inventory-gated, JobPosting schema first) | partial | M2 assets in flight |
| *(Sales, IP/data, Delivery rows land with M2 wave-2 agents)* | | | |

### Tier-1 edit log (continued)

| # | Date | File | Change | Why |
|---|---|---|---|---|
| E-09 | 2026-07-08 | `src/main.tsx` | +`/privacy` +`/terms` lazy public routes | dead footer links → real pages (agent-built, verified tsc+tests) |
| E-10 | 2026-07-08 | `src/pages/auth/SignUp.tsx` | Terms/Privacy spans → real `<Link>`s (new tab) | consent was collected against nothing |
| E-11 | 2026-07-08 | `README.md` (new) | repo front door | audit §D-17 |
| E-12 | 2026-07-08 | `FOUNDER-ACTIONS.md` | FA-07 path corrected to `.planning/gtm/` | consistency |
