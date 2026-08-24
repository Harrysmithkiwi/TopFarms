# TopFarms — launch in 48h, then the path to $50k MRR

Written 2026-08-24 against the repo, the pre-launch checklist (score 72/100), and the
lead pipeline (132 harvested farms, 9 UEMA-clean drafts, 0 contacted). Companion to
`.planning/PRE-LAUNCH-CHECKLIST.md`, which stays the pass/fail authority.

**The one sentence:** nothing blocking launch is code; the blocking item is sending
tranche 1, and the path to $50k MRR is not placement fees alone — it is placement fees
plus an employer compliance product only a lawyer-founder can ship.

---

## 1 · The 48-hour launch plan

### Day 1, morning (90 min, phone in hand) — checklist B1–B4
- Employer signup on a PHONE, all 8 steps, every optional number left blank. Publish.
- Verify: job on `/jobs` logged-out within a minute; blanks are `NULL` not `0` in the DB.
- Seeker signup on a phone, apply to that job, confirm it lands in the applicant list.
- Request a password reset, walk the link.
If any of these fails, that is the day's work. Nothing else jumps the queue.

### Day 1, afternoon — the actual launch
- **Send tranche 1** (9 drafts, `.planning/outreach/TRANCHE-01-DRAFT.md`). Your hand.
- Mark each send (`admin_lead_mark_contacted` / `admin_outreach_mark_sent`).
- Post once, as yourself, in 2–3 NZ farming Facebook groups (the seeker corpus proves
  that is where both sides already are). Founder voice, not ad voice.

### Day 2 — hold and watch
- 24h hold per the warm-up plan. Read the Resend log: bounce rate under 5% or stop.
- Reply to anything that comes back within the hour. Speed of reply IS the product demo.
- Draft tranche 2 (next 15 leads) so it goes the moment the hold clears.
- First real listing arriving triggers checklist E first-runs (expiry, notify-job-matches,
  duplicate-send guard) — watch them fire, don't assume.

**Launch definition:** one real employer with one real listing and one real seeker
application, none of them you. Everything else is theatre.

---

## 2 · Repo audit — what is actually missing

### Missing for LAUNCH (all human, no code)
| Gap | Owner |
|---|---|
| Tranche 1 never sent (demand-side = 1/10 on the scorecard) | Operator |
| B1–B4 human walks (match-corruption fix never proven on a real submit) | Operator |
| First-run risks: job expiry, notify-job-matches, filled-guard, doc upload (E-list) | Fire with first real data |

### Found by UAT on live prod, 2026-08-24 (fixed same day)
- **`/jobs/:id` returned 500 to every visitor** on any listing whose employer left an
  optional number blank. `JobDetailSidebar` guarded with `!== undefined`; Postgres sends
  NULL, and `null !== undefined` is true, so it rendered and `null.toLocaleString()` threw
  during SSR. This is the second half of the blank-number work: storing NULL instead of 0
  was correct, and it moved the failure into consumers that assumed a number. Regression
  test added (`tests/job-detail-sidebar-nulls.test.tsx`) which reproduces the exact
  production error without the fix.
- **Latent, not yet fixed:** `employer_verifications` has an `anon view employer
  verifications` RLS policy but **no SELECT grant to anon**, so the SSR loader's
  verification fetch 401s and the trust badge server-renders as unverified for logged-out
  visitors. Every sibling table the loader reads has the grant. One-line migration.

### Missing for SCALE (code, post-launch, ranked by leverage)
1. ~~Google for Jobs structured data — absent~~ **CORRECTION 2026-08-24: it ALREADY
   EXISTS** and is verified rendering in production SSR HTML (`src/routes/job-detail.tsx`
   emits `JobPosting` JSON-LD, og tags and canonical). My earlier "confirmed absent" claim
   was wrong: I piped the grep through `head -5` and truncated the matches off, then
   asserted the negative. The remaining work here is not building it, it is **submitting
   the sitemap to Google Search Console and confirming listings get indexed** — a
   30-minute operator task, not an engineering one.
2. **Funnel measurement.** `@vercel/analytics` is wired with some `track()` calls
   (SignUp, JobDetail). Define THE funnel — land → signup start → verified → onboarded →
   listing/application — and make sure each step fires. You cannot steer to $50k MRR
   without knowing which step leaks.
3. **Share artefact per listing.** Farmers recruit by sharing into FB groups. Each
   listing needs a clean OG card + one-tap share so every employer becomes distribution.
4. **Stripe end-to-end** (checklist C) — needed before the FIRST INVOICE, not before
   launch. The fee fires on hire, which is weeks after launch. Do it in week 1–2.
5. **Job alert emails at volume** — saved-search + notify-job-matches exist; they've
   only rehearsed. They become the retention loop once listings flow.

### Explicitly NOT missing (stop tinkering)
Auth (proven E2E), RLS (0 advisor errors, two-layer deny), matching, scored applicants,
onboarding wizards, admin outreach pipeline, mail stack (DMARC verified), monitoring
(Sentry with user ids), CI (1,070 tests). The engineering ceiling was ~81/100; you are
at it. The remaining points need a market.

---

## 3 · Vitamins vs painkillers

### Employer painkillers (what they'll pay for)
1. **"My FB post got 40 unusable replies"** → scored, ordered applicants. Built.
2. **AEWV / Job Check compliance.** Any farm hiring a migrant (a huge share of NZ dairy)
   must prove a genuine advertising effort. TopFarms IS that artefact. Productise it:
   an auto-generated **"Advertising evidence pack"** PDF per listing — dates live,
   reach, applicant summary, NZ-applicant outcomes. No generalist job board can follow
   you here, because the credibility comes from the founder being an immigration lawyer
   (IALA-exempt, advice in-house). **This is the moat. Charge for it.**
3. **Relief urgency** ("milker walked out, calving starts Monday") → later: urgent
   listing + notified matched seekers within the hour. Premium-priced when it exists.

### Seeker painkillers (what makes supply stick — keep FREE)
1. Visa clarity — "can I actually take this job?" No competitor can answer in-house.
2. One profile instead of re-typing life story into every FB comment thread.
3. Verified employers (D4 register check shipped) — protection from the horror-story farm.

### Vitamins (nice, monetisable later)
CV polish, profile boosts, featured placement, training suggestions.

**⚠ Brand collision to rule on:** the live Pricing page says **"Free, always. Workers
never pay."** A $20 seeker CV-optimisation breaks that promise. Recommendation: keep
workers 100% free — free supply is the growth engine and the promise is a moat in a
market full of exploitative recruiters. Take every dollar from the employer side (CV
polish can exist as an employer-funded feature: "we tidy shortlisted candidates' CVs").
If you decide workers-pay-for-extras anyway, the Pricing copy and directive must change
in the same commit — do not let the site lie.

---

## 4 · Revenue model — honest math to $50k MRR

Placement fees alone: avg ~$400 ⇒ $50k needs **125 hires/month**. NZ ag isn't that big.
Layer it:

| Stream | Price | Volume at maturity | MRR |
|---|---|---|---|
| Placement fees (core, live) | $200–800/hire | 30 hires/mo | $12k |
| **TopFarms Pro** (employer sub: urgent badge, evidence pack included, candidate search, multi-farm) | $149/mo | 100 farms | $15k |
| **Immigration/Job Check service** (founder-delivered, fixed fee, in-house legal) | ~$1,000/matter | 12/mo | $12k |
| Training-provider listings/leads (demand already validated by `training_demand`) | $250/mo or per-referral | 20 providers | $5k |
| Featured/urgent listings (à la carte) | $79/listing | 40/mo | $3k |
| Evidence pack à la carte (non-Pro) | $129 | 25/mo | $3k |
| **Total** | | | **~$50k** |

Sequence: **placements first** (proves the core), **evidence pack + immigration service
second** (moat, high margin, founder-limited), **Pro sub third** (once ≥50 active
farms), **training fourth** (v2.1 phases 24–26 already sketched). Realistic horizon:
12–18 months, ~300–400 active farms, seeker side free throughout.

Rule of thumb: every stream charges the side with money and compliance risk (employers,
training providers). The seeker side is your inventory — never tax inventory.

---

## 5 · Product optimisations (asked)

### Seeker onboarding (7 steps)
- **Biggest lever: apply-first, complete-later.** A worker arriving from a FB share
  wants to apply to THAT job. Let them: email + name + phone + visa status, apply, then
  progressively complete the profile. Every extra pre-application step is lost supply.
- Move **visa status (Step 6) earlier** — it is the matching + compliance gold and the
  question they most want answered; asking it early also signals "we get it".
- Phone/WhatsApp contact preference — rural workers answer calls, not inboxes.
- Keep everything else. Do not add steps.

### Employer dashboard
- **Post-publish expectation-setting**: after publishing, say what happens next ("Your
  ad is live on /jobs and in Google within X. We email you as applicants arrive and
  they'll arrive scored."). An employer who knows what to expect doesn't churn in week 1.
- **Renewal at day 30**: expiry has never run in prod; when it first fires, the employer
  must get a one-tap "relist" email, or expiry = silent churn.
- Applicant row: one tap from score → shortlist → contact reveal. Fewer clicks to the
  phone call.

### Admin dashboard
- You are the only admin: build nothing new. Add one **funnel counter strip** (leads
  contacted → replies → signups → listings → applications → hires) so every morning
  answers "is it working" in five seconds. Everything else the outreach pipeline
  already does.

---

## 6 · The don't-build list (permission to stop)

Until 10 real employer conversations have happened: no new features, no redesigns, no
refactors. The next 28 points on the scorecard are market points. The only engineering
worth queueing this week, after the first sends: Google Jobs JSON-LD (½ day), funnel
events (½ day), Stripe C-checklist walk (½ day).
