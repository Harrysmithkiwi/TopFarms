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
| E-13 | 2026-07-08 | `.planning/gtm/funnel-design.md:34` | Founding-Employer line rewritten: 50%-off-for-life DEAD → points at `founding-25-offer.md` | live corpus still pitched the killed offer |
| E-14 | 2026-07-08 | `.planning/gtm/outreach-templates.md:87` | same correction in post-signup follow-up guidance | same |
| E-15 | 2026-07-08 | `CLAUDE.md` | +§9 Stage-2 artefact pointers + standing evidence-label/truth-pass rules | future sessions must find NORTH-STAR/LOG/ACTIONS first |

## Final dimension grades (Stage-2 close, 2026-07-08)

Two A-READY flavours, distinguished honestly: **[founder]** = blocked only on a real-world
human act (FOUNDER-ACTIONS); **[build]** = spec complete, engineering time remains
(founder+AI can do it; it is scheduled work, not a blocker held by a human act).

| Dimension | v1 | Final | Status |
|---|---|---|---|
| Vision / North Star | C− | **A** | decided + encoded |
| Team & automation | C | **A** | decision doc complete |
| Data/schema/architecture | A− | **A−** | already strong; 057 + PEND-02 tracked |
| Market opportunity | D | **A-READY** [founder] | FA-09/FA-10 sharpen the bands |
| Monetisation & pricing | D | **A-READY** [founder] | FA-07 lab converts [MODELLED]→observed |
| Financial model | F | **A-READY** [founder] | same lab + FA-01 live rail |
| Governance | D+ | **A-READY** [founder] | FA-02/05/11; pages live, drafts done |
| Founder brand | D | **A-READY** [founder] | FA-08 first send |
| Sales | C+ | **A-READY** [founder] | kit complete; FA-07 books the calls |
| Marketing & GTM | B− | **A-READY** [founder+build] | plans complete; SEO Stage-0 + unsubscribe are builds |
| Strategy & marketplace design | B− | **A-READY** [founder] | gates/density/expansion set; liquidity data proves it |
| Product & portfolio | B+ | **A-READY** [build] | Seasonal/prefill/profile-edit specs → build queue |
| IP & data | B− | **A-READY** [build] | Index + parser/raw_ingest specs → build queue |
| AI capability | B− | **A-READY** [build] | evals harness spec → build queue |
| Delivery system | C+ | **A-READY** [build] | retention loops + SOPs specced; unsubscribe prerequisite flagged |
| Operations | B− | **A-READY** [founder+build] | FA-03/04/06 + metrics dashboard build |
| Founder constraints | C | **A-READY** [founder] | by definition — the 12 FA items ARE the dimension |

## Adversarial pass (self-audit before tagging — what would a fresh audit catch?)

1. **Farm Source Jobs (Fonterra, free, ~360 dairy listings) was discovered during Stage 2,
   not in the v1 audit.** The audit's "Facebook is the real incumbent" framing was
   incomplete; funnel maths and the objection kit predate this find. Covered in
   `docs/expansion/COMPETITIVE-DEFENCE.md`; **known S-effort gap: add a "why not Farm
   Source Jobs — it's free?" handler to `segment-a-sales-kit.md` and ask it in every lab
   conversation.** The differentiators (seeker profiles + matching + guarantee vs a
   listings board) are real but must be tested against THIS incumbent, not only FB.
2. **The $10M path still rests on Segment-B attach in AU/UK** — named identically in
   PRICING §7, MARKET-SIZING §5.3, EXPANSION §6. Not resolvable by documents; first
   falsifiable at the first three enterprise conversations. Not papered over.
3. **Spec ≠ build.** Six product artefacts (metrics dashboard, evals harness, Seasonal
   Insights, Index, parser extension, lead-prefill) are spec-complete, build-pending —
   graded A-READY [build], not A, deliberately.
4. **6-month $70–100k MRR:** verdict stands as written (not arithmetically supported;
   base case $5–8k). No document in this repo claims otherwise.
5. **Data corrections found by agents and kept:** couples = 23% seeker / 42% employer
   (study) vs PROJECT.md's older 28%; Southland has zero rows in the n=47 sample and is
   [A] everywhere it appears.
6. **Loose ends, explicitly not silently absorbed:** `.planning/gtm/eng-issues-to-create.md`
   + `phase-1-build-notes.md` remain untracked founder drafts (pre-Stage-2; founder to
   commit or fold); `content/` carousel + `.docx` strays → FA-12; the retention
   playbook's unsubscribe prerequisite must land before ANY automated retention email.
