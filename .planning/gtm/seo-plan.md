# SEO & programmatic plan

*2026-07-08 · Stage-2 M3. The audit's "biggest omission": zero SEO in the GTM corpus for
a jobs marketplace — the compounding, founder-time-free channel. This plan is deliberately
staged: technical hygiene now, programmatic pages when there's inventory to index.
Honesty rule: pages with no real content behind them are spam — inventory gates every
stage.*

## Stage 0 — hygiene (now; S effort, no content needed)

- Per-job meta/OG tags + `JobPosting` schema.org structured data on job detail pages
  (Google Jobs eligibility — the single highest-ROI SEO act for a job board). [V — the
  job detail page exists; needs head management. Effort M in a Vite SPA: add
  prerender/SSG for public pages or react-helmet equivalent — spec before build.]
- XML sitemap (jobs + public pages), robots.txt, canonical URLs.
- Fix the SPA crawlability question honestly: Vite CSR means bot rendering risk;
  evaluate prerendering public routes (jobs, regions, legal, Index) — flag as an
  engineering decision, not assumed.

## Stage 1 — foundational pages (gate: ≥10 real active listings)

`/farm-jobs/[region]` × 16 NZ regions — but ONLY regions with live inventory get
indexable pages; empty regions 404 or noindex until stocked. Each page: live listings +
one paragraph of real regional context (Index data when available) — no lorem, no
padded "guides".

## Stage 2 — programmatic matrix (gate: liquidity gate passed in ≥1 region)

`region × role` pages (`/farm-jobs/waikato/relief-milking`) from the role vocabulary —
the Platform Audit's role_type unification (EM-1) is a **prerequisite** (one vocab, one
URL set). Titles from real search language ("relief milking jobs Waikato"), listings +
Index stats + a subscribe hook. Scale = 16 regions × ~7 roles ≈ 112 pages, opened only
as inventory exists per cell.

## Stage 3 — the Index as link engine (gate: INDEX-SPEC monthly cut live)

Monthly Index page + quarterly State of NZ Farm Work = the natural backlink magnet
(rural media cite numbers). Each Index cut cross-links the matching programmatic pages.
This — not blogging — is the content strategy. No generic "10 tips for hiring a farm
assistant" content, ever; it fails the saleyard test and builds nothing.

## Keyword posture (directional, verify in Search Console once live)

Primary: {role} jobs {region} · farm jobs NZ · dairy farm jobs · relief milker ·
calf rearing jobs · farm assistant jobs. Secondary (stance/Index): farm wages NZ ·
dairy farm worker salary · AEWV farm work. [A — validate against real query data;
do not buy tooling yet.]

## Sequencing note

Nothing in Stage 1+ starts before the Founding-25 lab produces real listings — SEO
compounds from inventory, and fabricated inventory is the one thing the truth pass
exists to prevent. AU/UK: the same matrix ports (state/county × role) at country entry.

## Measures

Indexed pages · impressions/clicks (Search Console) · organic signups attributed ·
Google Jobs inclusion status. Review monthly in the Tuesday-email production slot.
