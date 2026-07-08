# TOPFARMS OPERATING AUDIT — v1.0 · Run 2026-07-08

> Audited against the governing question: *could this repository, as the complete operating system of a NZ agricultural job marketplace, realistically support a business reaching $10M ARR at high gross margin?* Read-only run; nothing in the repo was modified. Evidence labels: **[V]** verified/cited · **[I]** inferred (chain stated) · **[O]** opinion · **[A]** assumption flagged for correction. Authority hierarchy respected throughout (live sources > canonical > archive; `_archive/` never cited as current).

---

# A. EXECUTIVE SUMMARY

**OS maturity grade: B−.** The engineering and documentation layers are A-grade — machine-enforced deny-by-default RLS (migration 021's `ensure_rls` event trigger), a gated human-approval leads pipeline, evidence-gated requirements, retros that changed behaviour, real CI landed post-audit [V]. But an operating system is graded on whether it can run a *business*, and the commercial layers are D-grade: **zero real revenue ever** (Stripe test-mode since inception, PEND-01 open since 2026-05-04; "1 active job (UAT test), 0 paid listings" — `.planning/ROADMAP.md:490`) [V], no pricing rationale, no financial model, no market sizing, no North Star metric anywhere in the corpus [V], and no legal layer despite holding immigration status and identity documents (the footer's `/privacy` and `/terms` links **404**) [V].

**Likelihood of $10M ARR at high margin on the current trajectory: ~3%.** [O] Reasoning: the current model's own targets (25 employers, 120 placements/yr at flat $200–$800) produce roughly **$55–70k year-one revenue** — ~0.6% of the goal — and the arithmetic ceiling of flat-fee placements in NZ ag alone is below $10M even at implausible market shares (§G). The number is not reachable by executing the current plan harder; it requires a pricing-architecture change, a data/recurring layer, and eventually adjacent verticals. **Conditional on those changes being made deliberately: ~20–25%.** [O] The raw materials — trust positioning, data capture, execution discipline — are genuinely present.

**Top 3 strengths:** (1) Engineering + documentation discipline that an agentic, low-headcount operating model actually requires — this is rare and real [V]. (2) A nascent **data moat**: the only structured, real-time NZ ag hiring dataset (leads pipeline + demand-signal study + owned FB group) [V/I]. (3) A GTM voice/measurement layer of unusual honesty — self-baselines, tripwires, self-tagged reconstructed maths [V].

**Top 3 weaknesses:** (1) **Zero commercial validation** — no live payment rail, no willingness-to-pay evidence, a pricing ladder that appears in code as a given [V]. (2) **No legal/compliance layer** while holding visa status + identity documents under NZ Privacy Act 2020 — and visa status flows to a US LLM with no DPA artefact [V]. (3) **Strategy without a destination** — no revenue target, no market size, no North Star; the roadmap gates on "liquidity" without defining the number [V].

**Top 3 opportunities:** (1) **Placement-fee re-architecture** — flat $200–$800 sits against a recruiter alternative of ~10–15% of salary (~$7–10k) [A: NZ recruiter norms, verify]; even 2–3% success-fee pricing is a 3–5× revenue lever with zero product change (§G). (2) **TopFarms Index + programmatic SEO** — the regional wage/demand data the repo already plans to give away as a Day-9 email touch is a compounding, founder-free acquisition and licensing asset [V/O]. (3) **The migrant/visa corridor** — the study's sharpest structural mismatch (14% migrant seekers × 50% visa-gated farms) is a service and data opportunity nobody in the market owns [V/O].

**Top 3 risks:** (1) **Single-account concentration**: one FB account admins the group that is simultaneously the seeker engine, the lead source, and the outreach channel; a checkpoint/ban kills three systems at once — flagged existential in-repo [V]. (2) **Founder×calving collision**: the GTM plan launched ~3 weeks before peak calving with no recorded launch-timing decision; the motion stalls in any week the founder is out [V]. (3) **Key-person totality**: no runbook, no continuity artefact, no second admin; credentials and the human approval gate are one person [V].

**Most urgent actions:** (1) Close **PEND-01** — a <30-minute operator action that separates "business" from "demo" [V]. (2) Publish **Privacy Policy + Terms** — users currently tick agreement to documents that don't exist [V]. (3) **Charge real money in the founding cohort** — redesign the Founding-25 offer so it validates placement pricing instead of discounting listings for life (§G). (4) Enable **branch protection + keep CI green** (ci.yml exists; main is unprotected) [V]. (5) Start the **owned email list** this week — the founder-brand flywheel currently has zero owned distribution [V].

---

# B. REPOSITORY MAP (Phase 1)

**What this repo is:** a two-sided NZ ag job marketplace (React 19/Vite SPA + Supabase + Claude + Stripe + Resend + Vercel), ~20k LOC, plus an unusually complete *operating* corpus: GSD planning machinery, canonical doc set, GTM playbook, brand system, leads pipeline. Domain live 2026-07-02 (correctly self-documented as a *domain* go-live, not a feature launch — `.planning/STATE.md:229-241`) [V].

**Knowledge hierarchy (works as designed):** Tier 1 live truth = `.planning/` ledgers + `supabase/migrations/` (001→057) + `src/index.css`; Tier 2 = `docs/_canonical/` (7 docs incl. this month's Platform Audit, all Drive-mirrored); Tier 3 = `_archive/2026-06-20/` + `_archive/2026-07-03/` (provenance only) [V].

**Key directories:** `supabase/migrations/` — 57 migrations, CHECK-constraint vocab style, zero native enums · `supabase/functions/` — 13 Edge Functions (payments, email, docs, leads, AI prose) · `src/` — marketplace UI incl. two wizards, admin SPA · `.planning/` — requirements/roadmap/state/retros/GTM (the de-facto company OS) · `docs/_canonical/` — the Bible · `marketing/` + `content/` — brand system, 18 posters, 2 videos, 1 carousel draft · `tests/` + `.github/workflows/ci.yml` — 476 green tests, CI gate incl. 500kB bundle budget (post-June-audit addition) [V].

**Maturity by layer:** product/schema/security — shipped and hardened; admin/leads tooling — shipping weekly; GTM — written 2026-07-02, **unexecuted**; commercial/legal/financial — largely absent.

**Genuine surprises:** (1) the "Executive Playbook" that the GTM corpus cites as its authority **does not exist in the repo** — the funnel is a reconstruction, self-tagged ⟨recon⟩ (`funnel-design.md:5`) [V]. (2) **PROJECT.md still mandates the dead v1 brand** ("Fraunces + DM Sans… soil/moss… non-negotiable", `.planning/PROJECT.md:113`) while canonical Brand v2 is single-green `#16A34A` + Inter and the compendium declares v1 "fully retired" — a live-vs-canonical contradiction in a Tier-1 source, exactly the class of drift the hierarchy exists to prevent [V]. (3) The self-corrected months-long "prod topfarms.co.nz" state drift — caught and documented honestly, but it persisted for weeks [V].

---

# C. BUSINESS AUDIT (Phase 2, severity-sorted; Phase 3/5 woven in)

## C.1 CRITICAL findings

**C-1 · Monetisation: the model cannot arithmetically reach the goal (2.4).**
(a) Flat placement fees $200/$400/$800, salary-auto-derived; listing $100/$150/$200 with first-free enforced server-side (`create-payment-intent/index.ts:66-124`) [V]. (b) No willingness-to-pay research, no competitor-price benchmarks, no pricing rationale anywhere [V]. (c) Consequence: the plan's own success case (120 placements) yields ~$55–70k/yr; scaling the flat model to $10M needs ~25,000 placements — more than the plausible number of annual ag hires in NZ [A/I]. (d) Impact: the business plan, executed perfectly, builds a lifestyle business while carrying venture-scale infrastructure. (e) **Critical.** Full blueprint in §G. *Strength worth naming: the revenue state machine itself — acknowledgement-gated contact release, Net-14 invoicing, idempotent webhooks — is well-built and ready to carry any pricing model* [V].

**C-2 · Governance: no legal layer over sensitive data (2.15).**
No Privacy Policy or ToS pages exist (`/privacy`, `/terms` 404; SignUp's "I agree" spans navigate nowhere — `SignUp.tsx:383-397`); no DPIA; no breach-response procedure despite NZ Privacy Act 2020's notifiable-breach regime; no sub-processor register while `visa_status` flows to Anthropic (US) in `generate-candidate-summary/index.ts:89,139` [V]. The *engineering* substrate (Sydney residency, retention crons, PII-strip, minimization, audit log) is strong — the consumer-facing legal layer is simply missing. Impact: existential for a trust-positioned platform in a gossip-dense market; also the cheapest Critical to fix. **Critical.**

**C-3 · Commercial state: the money machine has never processed a dollar (2.16).**
Stripe test-mode throughout; no live webhook endpoint registered; PEND-01 deferred repeatedly since 2026-05-04 [V]. There is no financial model, P&L, CAC/LTV, or forecast anywhere in the repo [V]. Impact: every commercial assumption (pricing, conversion, WTP) remains untested while engineering compounds. **Critical.**

**C-4 · Concentration risk: one Facebook account is three systems (2.2/2.10).**
The account that admins "NZ Dairy Jobs" is simultaneously: the seeker acquisition engine (~55–75% of the 90-day seeker target), the primary lead source, and the outreach channel — and in-repo research already calls a ban existential [V]. No owned email list exists as a hedge [V]. Impact: a single platform-policy event ends the GTM plan. **Critical.**

## C.2 HIGH findings

**C-5 · Strategy: acquisition effort points at the wrong side of a labour-shortage market (2.2).**
[O/I] In NZ dairy, *workers* are the scarce asset — employers with unfilled rosters follow supply. Yet founder time is ~90% employer-pointed while the seeker engine is delegated to one FB group and reconstructed assumptions (referral "~0.3/signup" has no product surface behind it) [V]. In a supply-constrained market, owning verified supply *is* the moat; the current plan treats supply as ambient. **High.** *Counterpoint honestly held: employers are where revenue is, and application-pull does recruit seekers — but the asymmetry of effort vs strategic value is still inverted.* [O]

**C-6 · Vision: no destination (2.1).**
Crisp product vision ("match quality that justifies switching from Facebook groups" — PROJECT.md:7-9) and brand pillars, but **no revenue target, no North Star metric, no stated ambition anywhere** [V]. The liquidity gate for Phases 24-26 is "≥ N real employer-posted jobs (N TBD)" — even the gate lacks a number [V]. Impact: prioritisation has no denominator; "ship Phase 23" and "get 25 employers" can't be traded off. **High.**

**C-7 · Delivery: the founder is in every loop (2.7/2.17).**
Every outreach message manually approved and sent ("this gate never goes away"); doc verification, lead approval, demos, farm visits, group posts — all founder [V]. The docs concede "founder time is the bottleneck." No SOP survives him being sick in calving week. **High.** (Automation boundary in §I.)

**C-8 · Marketplace design: liquidity strategy lacks density sequencing (2.2/2.3).**
Dairy-first is right (86% of FB ag job posts are dairy — PROJECT.md:104) [V], but there is no region-by-region rollout plan; qualification scores "region with seeker density" without defining target regions [V]. Simultaneously, v2.1 broadened the taxonomy to 24 ag-broad competencies while the demand data argues for going *deeper* into dairy (shed/system/roster granularity — the platform audit's whole gap table) [V]. Second-order (Phase 5): breadth pre-liquidity dilutes match precision exactly where the 86% lives. **High.**

**C-9 · GTM: compounding channels absent (2.10).**
Zero SEO/programmatic plan for a *jobs marketplace* (the canonical compounding channel); no retention/re-engagement loops in a business where every spring re-creates demand; no referral product; founder-brand mechanics are names only (no email list; "TopFarms Index" appears twice as a phrase, never as an artefact) [V]. What exists (voice config, cadence, tripwires) is excellent but is all *push*. **High.**

**C-10 · The calving collision (2.10/Phase 5).**
GTM written 2026-07-02; NZ dairy calving runs ~late July–September [A: calendar, verify locally]. Peak hiring pain and worst cold-approach window coincide, and the docs never resolve whether calving is the best or worst time to sell [V]. No launch-timing decision is recorded. Impact: the 90-day maths may be tested in the single hardest quarter. **High.** *Resolution [O]: sell the seasonal wedge (relief milkers, calf rearers — urgent, small-ticket, fast placement) during calving; book demos for October.*

## C.3 MEDIUM findings

**C-11 · Product (2.5):** Two healthy wizards, strong search, shipped admin—but no post-onboarding profile editing (audit SK-7), no employer-facing seeker search, `saved_searches` stores an opaque URL string, and the match engine has **no hard gates** (visa = soft 5/100) — already documented with fixes in `docs/_canonical/TopFarms_Platform_Audit.md` [V]. The pre-seeded "post this job" lead→listing flow — named in-repo as "where the real conversion gain lives" — is unbuilt [V]. **Medium** (paths are already specced).

**C-12 · AI capability (2.8):** Sensible split — deterministic SQL scoring, Claude for prose (Sonnet) and lead parsing (Haiku), cache-first summaries [V]. But **no evals harness, no match-quality measurement loop** (admin match-quality RPC exists but n≈0), and prompt versions live inline in functions [V]. Where AI is a moat vs cost is untested. **Medium.**

**C-13 · Ops/quality gates (2.13):** June audit's F1-F3 (tsc fail, lint broken, no CI) now structurally addressed by `ci.yml` [V]; but **main has zero branch protection** [V], leaked-password protection likely still off [I], `react-router` CVEs open [V], migration pipeline in "managed drift" [V]. **Medium** — trending well.

**C-14 · Sales instrumentation (2.12):** Scripts and cadence are operational-grade; but the 200-name target list doesn't exist yet, follow-ups are hand-driven with no scheduler, and the CRM design drifted between two docs a day apart (Asana MCP in/out) [V]. **Medium.**

**C-15 · IP/data (2.6):** The dataset asset is real but young: `lead_staging.structured` is a jsonb blob, parser drops accommodation/roster/right-to-work fields, raw text is discarded post-extraction (no re-extraction possible), phone-dedup designed-not-built [V]. The Index cannot be built from what's currently retained. **Medium** — high leverage to fix (§K sketch 3).

## C.4 Healthy dimensions (one sentence each)

- **Security architecture (2.9):** genuinely strong — event-trigger RLS, definer discipline, three-layer identity-doc exclusion, vault secrets, signature-verified webhooks [V].
- **Brand & design (2.10 partial):** tight, single-sourced, propagated identically across every asset; if anything over-invested for stage [V].
- **Docs discipline (2.13 partial):** independently rated "genuinely excellent"; the retro culture visibly changed behaviour [V].
- **Scope discipline (2.5):** messaging deferred, training-marketplace rejected with reasoning, verticals sequenced — the "what not to build" muscle is real [V].

## C.5 Phase 3 deep-cuts (direct answers)

- **Software/paid feature:** the `?lead=` pre-seeded listing flow; farm-profile completeness score as a listing-quality upsell; featured placement in seeker feeds. [O]
- **Agent:** follow-up cadence scheduling; weekly funnel report from Supabase→email; harvested-batch coding against the dataset template. (Lead parsing and outreach drafting already are agents.) [O]
- **Data product:** **TopFarms Index** — regional wage/demand/fill-time benchmarks from the leads+listings dataset; licensable to rural banks, insurers, DairyNZ/industry bodies; the repo already uses its raw material as an email touch [V/O].
- **Recurring revenue:** employer "Season Pass" (annual listing bundle + workforce tools); Index subscriptions. [O]
- **Single highest-leverage pricing change: placement fee → % of first-year salary (2.5–3.5%, floor $500), success-billed.** Zero product change; ~3–5× blended fee (§G). [O]
- **Founder assumptions probably wrong:** flat placement pricing is "simple and transparent" but leaves 80%+ of recruiter-anchored value uncaptured; "match scoring justifies switching" (the moat is trust+liquidity+data — scoring is replicable); the 90-day funnel numbers (self-tagged as reconstructed from a document that doesn't exist); "compliance is handled" (asserted, not evidenced) [V/O].
- **Documents contradicting one another:** PROJECT.md v1-brand constraint vs canonical Brand v2 [V]; `system-architecture.md` vs `phase-1-build-notes.md` on Asana [V]; PROJECT.md "Validated ✓" tracked *built*, not *deployed* (AUTH-retro DEPLOY-01) [V]; archived Revenue Journey ("% or flat", message-scanning) vs shipped flat-only reality — correctly archived, worth noting the scanning layer was never built [V].
- **Highest-enterprise-value IP today:** the owned FB group audience + the structured leads dataset + the outreach voice config, in that order — all distribution/data, none of it code. [O]
- **What an IC would conclude:** exceptional solo execution, real founder-market fit signals, disciplined scope; but pre-revenue, unvalidated pricing, single-founder key-person totality, and an unsized TAM that is *probably small for the current model* — pass or deep discount until ≥25 *paying* employers and a placement-pricing proof point. [O]
- **What Seek/Trade Me would do:** add an ag filter-pack and rural marketing spend within a quarter of TopFarms being visible; they cannot cheaply replicate accommodation/shed/roster depth, verified trust, or FB-group-native supply. **Defence = density + verified supply + data + speed.** [O]
- **AI commoditisation over 5 years:** scoring/prose fully commoditise (already deterministic + prompt); parsing commoditises; the durable assets are proprietary structured data, verified profiles, and liquidity. Plan accordingly: the moat is never the model. [O]
- **Never build:** in-app messaging pre-liquidity (already deferred — keep it that way); training-provider marketplace (already rejected — correct); native apps; international pre-NZ-density; a general-purpose ATS. [O]
- **Kill immediately:** the Founding-Employer "50% off Featured **for life**" clause (§G — lifetime discount on the wrong lever, in a market where discounts travel by word of mouth); the Asana-MCP integration ambiguity (finish the simplification already begun); poster/video production until distribution exists. [O]
- **The Operating System vs the Bible:** OS = `.planning/` machinery + CLAUDE.md house rules + CI + the admin/leads tooling; Bible = `docs/_canonical/`. Both genuinely exist — rare. What's missing from the OS is the commercial half (§D). [V/O]
- **Replace vs augment:** replace — parsing, drafting, reporting, follow-up scheduling, batch coding; augment — farm visits, phone trust, verification judgement, pricing conversations. Never automate the saleyard voice. [O]
- **What compounds:** the dataset, SEO pages, the email list, placed-worker alumni, regional density, the Index. **What merely feels productive:** more posters, more admin polish, more retro depth, taxonomy breadth. [O]

---

# D. MISSING REPOSITORY ASSETS (Phase 4 — the register)

**CRITICAL (absence is actively dangerous or blocks the governing question):**
1. **Privacy Policy + Terms of Service pages** — links exist and 404; agreement collected against nothing. Breaks: legal exposure, trust positioning, enterprise/partner readiness.
2. **Pricing model & willingness-to-pay analysis** — the ladder is uncaught assumption in code. Breaks: §G; every revenue projection.
3. **Financial model (P&L, unit economics, CAC/LTV per side, placement contribution margin)** — none exists. Breaks: any investment conversation; the $10M question itself.
4. **TAM/market-sizing doc (NZ farm counts, annual ag hires, current spend on FB/Seek/recruiters)** — zero in-repo numbers. Breaks: strategy has no denominator.
5. **North Star + operating-targets doc** — no metric, no revenue goal, undefined liquidity gate "N". Breaks: prioritisation.
6. **Incident-response / breach-notification runbook** — mandatory-notification regime, no procedure. Breaks: first bad day becomes existential.
7. **Business-continuity / key-person runbook** (credentials, admin succession, "founder unavailable" SOP). Breaks: the company is one flu away from frozen.
8. **Sub-processor register + DPAs** (Anthropic, Stripe, Resend, Firecrawl, Apify, Vercel, Supabase). Breaks: Privacy Act posture; partner diligence.

**IMPORTANT (needed within 1–2 quarters):**
9. Marketplace-metrics dashboard spec — liquidity, fill rate, time-to-placement, supply/demand per region (admin analytics measures ops, not marketplace health).
10. Retention/re-engagement playbook — seasonal call-backs, dormant winback; ag hiring is cyclical and nothing captures the cycle.
11. Referral mechanics spec + product surface — currently a number (0.3/signup) with no mechanism.
12. Region density plan — sequenced rollout with liquidity thresholds per region.
13. Match-quality evals harness — golden pairs + gate-collision fixtures (the audit's §5.2 fixture proposal is the seed).
14. Data-product spec (TopFarms Index) — schema, cadence, licensing model.
15. SEO/programmatic plan — regional/role landing pages fed by listings + Index data.
16. Support SOP + FAQ — pre-empting the founder-in-every-loop support burden.
17. README.md — the repo has world-class internal docs and no front door.

**FUTURE:** partnership playbook (DairyNZ, Federated Farmers, rural banks/insurers); vertical-expansion criteria (the v3.0 hort gate, quantified); hiring plan tied to §I triggers; capital plan.

---

# E. GRAND STRATEGY (Phase 6)

**What this should become:** the **workforce operating system for NZ primary industries**, entered through dairy hiring — where "OS" means: the verified supply pool, the placement rail, the retention/credential layer, and the industry's workforce data (the Index). **What it should not become:** a generic job board with ag paint; a subscription ATS; a training marketplace; an international platform before NZ density; a headcount business.

**The strategic inversion the plan needs [O]:** stop treating employers as the scarce side. In a structural labour shortage, **verified supply is the asset**; employers pay for access to it. Every strategic choice — GTM effort, product depth, pricing — should be re-checked against "does this grow or monetise the supply pool?"

**Fastest credible path (mechanisms, not just numbers; all revenue figures [A] pending the WTP work in §G):**
- **→ $1M ARR (18–30 months):** Waikato + one South Island region dense; ~400–600 placements/yr at a re-architected ~$1,500–1,800 blended success fee + early Season Pass revenue. Mechanism: seasonal wedge (relief/calf-rearing) → full-season placements; owned email list + group; the Index as monthly public artefact driving inbound.
- **→ $3M ARR (3–4 years):** national dairy coverage + sheep/beef; ~1,200–1,500 placements; Season Pass at 20–30% employer attach; first Index licensing (2–4 institutional buyers). Mechanism: SEO + Index inbound replaces founder push; retention loops convert every placement into next-season demand.
- **→ $10M ARR (5–7 years):** placements ~$4–5M + recurring employer layer ~$2.5M + data ~$1–1.5M + horticulture vertical ~$1.5–2M (§J). Mechanism: replicate the dairy playbook per vertical, each with its own seasonal wedge; the Index becomes the industry reference.

**Largest risks:** platform-policy (FB) concentration; Seek/Trade Me fast-follow before density; founder capacity; NZ-market ceiling if pricing stays flat. **Compounding leverage:** dataset → Index → SEO/PR → inbound → more placements → better data. **Complexity to remove:** taxonomy breadth pre-liquidity, Asana ambiguity, lifetime discounts, asset production ahead of distribution.

---

# F. SEGMENT & REGION RECOMMENDATIONS

Grounded in the only in-repo demand data (n≈47, dairy-skewed — treat rankings as directional [V/A]):

**Segments — prioritise:**
1. **500+ cow owner-operators and multi-farm/corporate dairy** — repeat hirers, accommodation stock (83% offer it), roster structure, highest WTP for success fees; the study's E02/E04/E07/E09/E10 profile [V].
2. **Calving-season seasonal hirers** (calf rearers, relief milkers) — urgent, recurring, fast-cycle; the wedge that works *during* calving [V/O].
3. **Visa-capable/accredited employers + migrant seekers** — the structural mismatch (14%×50%) both sides will pay to resolve; also a policy-data story [V/O].
4. **Couples-friendly farms** — 28% of seekers are couples; 42% of listings offer partner work; a differentiated match nobody else structures [V].

**Decline/defer:** horticulture/viticulture (already correctly gated to v3.0+); one-off micro-hires with no repeat potential (the GTM's own time-sink list); sub-200-cow rare hirers; anything requiring recruitment-agency-style shortlisting labour.

**Regions:** 1. **Waikato** — the data's centre of gravity, the owned group's heartland, highest density [V]. 2. **Canterbury** — large herds, corporate structures, high automation, strong in both study sides [V]. 3. **Southland** [A — large dairy region by industry knowledge; no in-repo data — verify before committing]. 4. Taranaki/Manawatu as fast-followers [V — present in seeker clusters]. Rule: **do not open region N+1 until region N clears a defined liquidity bar** (e.g. ≥15 active listings and ≥150 open-to-work seekers — numbers to be set in the North Star doc, §D-5).

---

# G. PRICING & MONETISATION BLUEPRINT (headline section)

**Where value actually sits [V]:** the platform's own mechanics say it — contact details are RLS-locked until the placement fee is acknowledged. The *placement* is the value event. Yet pricing is listing-weighted in attention and placement fees are flat and low.

**The anchor stack the current model ignores [A — verify all externally]:** FB group post $0 · Seek ag listing ~$200–400 · TradeMe Jobs ~$100–200 · rural recruiter placement ~10–15% of first-year salary (~$7,000–10,000 on a $70k role) · cost of an unfilled roster during calving: weeks of owner 4am milkings — the real WTP driver.

**Three architectures modelled** (Year-3 steady-state; volumes/attach rates are [A] planning parameters, not forecasts):

| | **A. Current (flat)** | **B. Success-fee primary (recommended)** | **C. Hybrid subscription** |
|---|---|---|---|
| Listing | 1st free, then $100/$150/$200 | **$0 during liquidity build** (kill listing friction; reinstate as premium placement later) | Season Pass $990/yr unlimited listings |
| Placement | $200/$400/$800 flat | **2.5–3.5% of first-year salary, floor $500, soft cap $3,000**; Net-14 success-billed | 50%-discounted success fee for Pass holders |
| Blended fee/placement | ~$400 | **~$1,700** (3% × $57k median [A]) | ~$1,300 effective + Pass |
| 1,500 placements/yr | ~$0.6M + listing ~$0.1M ≈ **$0.7M** | **~$2.55M** | ~$1.95M + (800 passes × $990) ≈ **$2.75M** |
| Margin shape | High margin, tiny top line | High margin, value-indexed | Highest predictability; risks Pass-cannibalising success fees |
| Elasticity risk | Underprices 4–17× vs recruiter anchor | Sticker-shock vs FB-free → mitigate with success-only billing + fill-guarantee | Subscription is a hard sell pre-trust |

**Recommendation [O]: B now, layering C's Season Pass at ~$3M ARR once repeat-hiring behaviour is proven.** Assumptions B rests on: employers anchor against recruiters and vacancy cost, not against free FB (test explicitly); success-only billing removes downside risk; the acknowledgement-gate UX already implements the "moment of value" cleanly. **Validation plan:** re-cut the Founding-25 as the pricing lab — full-price success fees with a fill guarantee and founder service, in exchange for case-study rights; **kill "50% off Featured for life"** (lifetime discount, wrong lever, travels by gossip in a reputation-driven market [V — PROJECT.md:102]).

**Path to high-margin $10M:** §J. The critical margin note: every revenue line here is software/data margin (85–90%) *except* anything requiring shortlisting labour — decline that work structurally; the founder-service layer in the pricing lab is a temporary, deliberate exception.

---

# H. FOUNDER BRAND STRATEGY

Current state: strongest voice guide in the repo (saleyard test, no-AI-pitch, NZ-plain), **zero owned distribution** — no email list, Index is a phrase, LinkedIn cadence is one line [V].

**Positioning:** *the person who actually knows what's happening in NZ farm hiring* — workforce thinker, not vendor. **Pillars:** (1) the numbers (Index cuts: wages, demand, fill times by region); (2) the stories (anonymised placement/mismatch tales — consent rules already written [V]); (3) the stance ("workers never pay"; migrant-corridor fairness); (4) the build (solo+AI operating notes — differentiating with the tech-adjacent audience and future hires).

**The flywheel:** weekly **Tuesday email** (the repo's own persona hook [V]) → monthly public **Index post** (programmatic SEO pages + PR bait) → quarterly **State of NZ Farm Work** report (licensing teaser + media moment). Every group post, DM signature, and invoice footer feeds the list. **Cadence:** email weekly; LinkedIn 2×/week recycled from the email; one industry-event talk per quarter once the Index exists. **Signature frameworks to name and own [O]:** *The TopFarms Index*; *the Match Gap* (migrant-seekers vs visa-gated farms); *Never-Pay Guarantee* (worker-side promise, already implicit).

---

# I. TEAM & AUTOMATION STRATEGY

Boundary: founder + AI to ~$1M; the first hire is ops, not engineering. Advisors count and come first.

**→ $1M ARR:** Automate: follow-up cadences, funnel reporting, lead coding, doc-queue triage assist, seasonal re-engagement emails. Outsource/fractional: bookkeeping + GST; privacy/employment lawyer (one-off artefacts §D-1/6/8); VA for verification-queue first-pass (**requires clear SOP — write it before delegating**). Advisors: one marketplace operator, one rural-industry name. **Hire: none.**
**→ $3M ARR:** Hire 1: **Marketplace Ops / Community** (verification, support, group ops, seeker success) — removes the founder from daily loops. Hire 2: **Partnerships/Sales** (corporate farm groups, Index licensing). Fractional CFO. Engineering stays founder+AI (the repo's discipline makes this credible [V]).
**→ $10M ARR:** ~8–12 FTE total: 2–3 eng, 2–3 ops/support, 2 sales/partnerships, 1 data (Index product), 1 finance/ops. Anything beyond this headcount at $10M signals margin architecture failure — revisit before hiring.

---

# J. $10M ARR BLUEPRINT (arithmetic explicit; all parameters [A] until the §D-2/3/4 models exist)

**Revenue mix at $10M (Year 5–7):**
| Stream | Mechanism | Arithmetic | ARR |
|---|---|---|---|
| Placements — dairy + ag-broad | 2,500–3,000/yr × ~$1,700 blended success fee | 2,750 × $1,700 | **$4.7M** |
| Employer recurring (Season Pass / workforce tools) | 2,000 employers × ~$1,200/yr effective | 2,000 × $1,200 | **$2.4M** |
| Data (Index licensing + subscriptions) | 6–10 institutional licences ($50–150k) + long-tail subs | ~$0.8M + $0.4M | **$1.2M** |
| Horticulture vertical (v3.0 replay) | ~800 placements × ~$1,500 + passes | | **$1.7M** |
| **Total** | | | **~$10.0M** |

**Reality checks:** 2,750 ag placements/yr implies meaningful share of NZ's annual ag hiring — plausible only with category leadership and must be validated against the missing TAM doc (§D-4) before this blueprint is bankable [A]. Gross margin: ~85%+ (Claude/Firecrawl/Stripe COGS are single-digit %; the margin threat is *labour* creeping into delivery — the §I headcount ceiling is the control). **Milestones:** Yr1 $150–250k (pricing lab + wedge) → Yr2 $700k–1M (two dense regions) → Yr3 $2–3M (national dairy + Pass) → Yr4 $4–6M (Index licensing + sheep/beef) → Yr5–7 $10M (hort replay). **Capital:** bootstrappable in principle on success-fee cash (Net-14 inflow, near-zero COGS); a small seed only to compress the density-building years — a founder decision (§N).

---

# K. EXECUTION ROADMAP & TASK PLAN (Phase 7)

**Five phases:** **Foundation** (wks 0–4: commercial + legal rails live) → **Liquidity** (wks 2–14: Waikato density, pricing lab) → **Monetisation** (mo 3–9: success-fee proof, Pass design) → **Scale** (mo 6–18: SEO/Index, region 2–3, retention loops) → **Category Leadership** (yr 2+: licensing, verticals). Owner: founder throughout; dependencies and metrics per task below.

**Milestone 0 — Safety net (this week):**
| Task | Effort | Notes |
|---|---|---|
| PEND-01 Stripe live swap (existing 9-step checklist) | S | Blocks all revenue; checklist already written [V] |
| Branch-protect `main`; require ci.yml green | S | CI exists; gate it [V] |
| Enable leaked-password (HIBP) toggle | S | One dashboard switch [V] |
| Credentials/continuity note (password manager + second trusted admin) | S | §D-7 seed |

**Milestone 1 — Critical fixes (wks 1–3):** Privacy Policy + ToS pages (sketch 1, S/M) · breach-response one-pager (S) · sub-processor register (S) · North Star + liquidity-gate numbers doc (S — a decision, not research) · kill lifetime-discount clause, redesign Founding-25 as pricing lab (M) · email capture on landing + first Tuesday email (S).

**Milestone 2 — High-leverage (wks 2–10):** Pricing v2 experiment design + WTP interviews in founding cohort (sketch 2, M) · `?lead=` pre-seeded listing flow (M — in-repo "real conversion gain" [V]) · parser field extension + raw_ingest landing zone (M — feeds Index; already designed [V]) · seasonal wedge campaign (calf/relief) (M) · TAM + financial model docs (M, external data) · region density definition (S).

**Milestone 3 — Compounding (mo 2–6):** Index MVP (sketch 3, L) · programmatic SEO pages (region × role) (L) · retention/seasonal re-engagement automation (M) · referral surface (M) · match-gate work per Platform Audit MA-1/PEND-02 (M) · evals fixture set from the study data (M — spec already in canon [V]).

**Quick wins (do regardless):** PEND-01 · legal pages · HIBP toggle · branch protection · email capture · first Index teaser post from existing study data.

**Implementation sketches (top 3):**
1. **Legal pages:** static `Privacy.tsx`/`Terms.tsx` + routes in `main.tsx`; wire SignUp spans to real links; content scope already enumerated in the archived launch checklist (residency, signed URLs, identity-doc handling, retention — lawyer-review the draft; NZ Privacy Act 2020 framing). Gotcha: cover the *leads* lifecycle (suppression/anonymisation crons are your evidence of good practice — say so).
2. **Pricing lab:** 10–15 founding employers; offer = success-only 3% (floor $500) + fill guarantee + founder service, full price, case-study rights in return; instrument acknowledge→invoice→paid conversion (webhook currently only logs `invoice.payment_succeeded` — flip a paid flag [V]); decision rule pre-written (e.g. ≥60% accept 3% → adopt; 30–60% → test 2.5% or stronger guarantee; <30% → investigate anchor framing before retreating on price).
3. **Index MVP:** extend `lead-intake` to emit the four dropped fields + add `raw_ingest` (both already designed in-repo [V]); monthly aggregation RPC over `leads`+`jobs` (demand by role/region, wage bands, accommodation rate, RTW-restriction rate — the exact cuts the Master Report already computes by hand [V]); output = one public HTML page + email section. Gotcha: n is small — publish counts and directions, not precision claims; the small-n honesty *is* the brand.

---

# L. FOUNDER COACHING (Phase 8)

**What you're overthinking:** internal excellence. The repo is a cathedral — retros, canon, verification gates — while the market-facing surface is a tent: dead legal links, an unsent first email, an unbuilt target list. The instinct that built §8 of CLAUDE.md is world-class *defensive* discipline; the next twelve months are won on *offensive* discipline — conversations, price tests, published numbers.

**What you're underestimating:** (1) your pricing power — you've anchored on Facebook-free instead of recruiter-cost and vacancy-pain; (2) the strategic weight of the supply side; (3) how much of your "documentation energy" is comfort work. **What you're wasting energy on:** visual asset polish ahead of distribution; process refinement past the point of behaviour change; deferring PEND-01 — a 30-minute task deferred for two months is not a task problem, it's a threshold-crossing problem: flipping it makes the business real, and real means testable, and testable means failable. Flip it anyway.

**Thinking too small:** revenue architecture, the Index, the category ("workforce OS", not "job board"). **Thinking too big (for now):** ag-broad taxonomy, six GTM channels at once, v3.0 verticals. Sequence: dairy-deep → dense → priced → then broad.

**Habits with disproportionate leverage:** one weekly *revenue conversation count* as the only headline metric (vanity-proof, calving-compatible); publish every Tuesday no matter how thin; write the decision rule *before* each experiment (you already do this in engineering — port it to commerce); one monthly "what would break if I disappeared" hour against §D-7.

**This quarter:** 25 employers *at real prices*, one region, list started, legal live. **This year:** two dense regions, success-fee model proven or disproven with data, $150k+ real revenue run-rate, Index public. **Five years:** the reference dataset and placement rail for NZ primary-industry work — or a well-documented small business; the difference is almost entirely pricing courage and supply-side focus, not code.

**The single change that most alters the trajectory: charge real, value-indexed money to the first 25 employers instead of discounting them.** Everything else compounds off what that experiment teaches.

---

# M. 90-DAY ACTION PLAN (from Monday)

**Wk 1:** PEND-01 live + $0.50 smoke test · branch protection + HIBP · legal pages drafted → lawyer · email capture live · first 50 target-list rows · first Tuesday email.
**Wk 2:** Legal pages live · Founding-25 offer rewritten (pricing lab, no lifetime discount) · first 10 outreach touches (cadence per funnel-design) · North Star doc (incl. liquidity-gate N).
**Wk 3–4:** 10 touches/wk · first WTP conversations logged · wedge campaign (calf-rearer/relief) in group · breach one-pager + sub-processor register · baseline reply-rates (the tripwire discipline is already written [V]).
**Wk 5–8 (calving-aware):** outreach in 10am–2pm windows only · wedge placements prioritised; demos booked for Oct · `?lead=` flow built · parser fields + raw_ingest landed · Tuesday email weekly · 2 group posts/wk.
**Wk 9–12:** first success-fee placements invoiced **live** · pricing decision per pre-written rule · Index MVP from Q1 data · TAM + financial model drafted · quarter review against funnel maths — replace every ⟨recon⟩ number with observed data · set next-quarter gate numbers.
**Dependencies:** legal before scale-outreach; PEND-01 before any invoice; wedge before demos (calving); list before touches.

---

# N. OPEN QUESTIONS (founder decisions the repo cannot answer)

1. **Ambition:** is $10M ARR / category leadership actually the goal, or is a $300–500k/yr founder-plus-AI business the honest target? Both are legitimate; they diverge at pricing, verticals, and capital. Everything in §E–K assumes the former.
2. **Pricing courage:** will you charge the founding cohort real success fees (§G-B), accepting slower signups for real validation?
3. **Capital:** bootstrap on placement cash flow, or raise a small seed to compress the density years? (Changes region sequencing and §I hiring timing.)
4. **Risk tolerance on scraping/outreach:** the FB concentration risk is documented — what's the acceptable exposure while the email list builds?
5. **Founder capacity:** real hours/week available July–September (calving), honestly? The 90-day plan flexes on this.
6. **Exit posture:** is Seek/Trade Me/Fonterra-adjacent acquisition an acceptable outcome (shapes how visibly the Index/data asset is built)?
7. **The liquidity gate "N":** Phases 24–26 wait on a number that was never set — set it in the North Star doc (§D-5).
8. **Second admin:** who is the trusted person for continuity (§D-7)? Advisor, family, lawyer-held escrow — pick one this month.

---

*Run 2026-07-08 · evidence base: 9 parallel workstreams over migrations 001–057, 13 Edge Functions, `src/`, `.planning/` (incl. GTM corpus 2026-07-02), `docs/_canonical/`, live-DB read-only checks (project `inlagtgpynemhipnqvty`) · re-run quarterly and diff.*
