# Map: a seeker lane for lead staging, and why the duplicate alert never fires

Charted 2026-08-11. Two questions from the operator, both answered against live prod, plus the
funnel design that follows from them.

---

## Q1 — Is there lead staging for job seekers?

**No. All 93 staging rows are `type: 'employer'`.** There is no seeker capture, no seeker lane,
no seeker outreach tracking.

**But the data model already anticipated one.** `leads_type_check` is:

```sql
CHECK (type = ANY (ARRAY['employer'::text, 'seeker'::text]))
```

`'seeker'` has been permitted since migration 041 and never used. `_lead_fingerprint()` already
takes `type` as a parameter, and `structured->>'type'` is how staging rows carry it. So this is a
**build-out, not a schema rewrite** — the tables, the dedupe function, the review workflow and the
outreach columns (`outreach_status`, `drafted_reply`, `sent_at`, `responded_at`) are all type-agnostic
today.

---

## Q2 — Does the employer lane flag duplicates?

**The UI does. The detector doesn't.** `AdminLeadsStaging.tsx` renders `suspect_duplicate` in four
places (`:473`, `:533`, `:540`, `:871`). It has never had anything to render:

```
all 93 rows: dedupe_status = 'unique'
```

Meanwhile there are **six real duplicate pairs in the current data**, including the two Beckenham
Hills Ltd rows visible in the operator's screenshot:

| Name | Rows | Regions | Flagged |
|---|---|---|---|
| Beckenham Hills Ltd | 2 | Canterbury \| Otago | unique |
| HIRING FARM | 2 | Canterbury \| Southland | unique |
| Moeangiangi Station | 2 | Hawke's Bay \| **null** | unique |
| Patunga Farms Ltd | 2 | Taranaki \| Waikato | unique |
| Wairio | 2 | **null** \| Wellington | unique |
| Waverley Station | 2 | Taranaki \| Tasman | unique |

### Two independent root causes

**1. The fuzzy check compares staging against `leads`, never against `lead_staging`.**
`041_leads_pipeline.sql:139-148`:

```sql
SELECT l.id INTO v_suspect_id FROM leads l          -- ← leads, the PROMOTED table
WHERE l.type = v_type
  AND coalesce(l.region,'') = coalesce(v_region,'')
  AND similarity(l.display_name, v_name) >= 0.6
```

`leads` holds **2 rows**. `lead_staging` holds **93**. Every duplicate above is staging-to-staging,
so the fuzzy pass cannot see any of them. It is looking in an almost-empty table.

**2. The exact-duplicate fingerprint keys on `region`, which the harvester often leaves null.**
The staging-vs-staging exact check (`:130-136`) does exist, but compares
`_lead_fingerprint(display_name, region, type)`. Moeangiangi Station was harvested with region
`Hawke's Bay` on 30 Jun and region `null` on 17 Jul — different fingerprints, so the same farm
inserts twice. Wairio is the same story (null on 30 Jun, `Wellington` on 9 Aug).

**So the region field, which is unreliable, is load-bearing for identity.** That is the deeper bug:
7 of 77 harvested rows carry no region at all.

### The lazy fix

Widen the existing fuzzy pass to also scan `lead_staging`, and stop making a null region look like
a distinct farm:

```sql
-- staging-vs-staging suspect, region-insensitive when either side is null
SELECT st.id INTO v_suspect_id FROM lead_staging st
WHERE st.review_status = 'pending'
  AND st.structured->>'type' = v_type
  AND (v_region IS NULL OR st.structured->>'region' IS NULL
       OR st.structured->>'region' = v_region)
  AND similarity(st.structured->>'display_name', v_name) >= 0.6
LIMIT 1;
```

No UI work — the four render sites already exist and light up the moment the column is populated.
A backfill pass over the 93 existing rows surfaces the six pairs immediately.

> **ponytail:** `similarity() >= 0.6` on the whole staging table is an O(n) scan per insert. Fine at
> 93 rows and at 10,000. Add a trigram index on `display_name` if intake ever runs hot.

---

## The seeker lane — funnel map

### The real-world flow the operator described

```
someone posts "looking for work" in an NZ farming FB group
   ↓  operator comments: "hi @james, message me"
   ↓  they DM
   ↓  operator sends https://www.topfarms.co.nz/signup?role=seeker
   ↓  they sign up
   ↓  "you're on the list — jobs go live in a few weeks"
```

`?role=seeker` **already works** — `SignUp.tsx:85-103` reads the param and pre-selects the role,
and fires a `signup_start` analytics event.

### What is missing, in priority order

**1. Nothing records the middle of that funnel.** The employer lane tracks
`outreach_status → drafted_reply → sent_at → responded_at`. The seeker side has none of it. DM
twenty people and there is no record of who was approached, who replied, or who converted — so
there is no way to know whether the channel works.

**2. A signup cannot be attributed to the outreach that caused it.** `SignUp.tsx` reads `role` and
nothing else — no `ref`, no `utm_*`, no lead id. So even with a seeker lane, the loop never closes.
The cheapest fix is a `?ref=<staging_id>` on the link, stored on the new profile, which turns
"91 to review" into a measured conversion rate.

**3. The capture is worth far more than tracking — it pre-fills the profile.** This is the part
that changes the product, not just the admin. Take the operator's real example post:

| From the post | Maps to |
|---|---|
| "Dairy Farm Assistant/Herd manager or 2ic" | `role_type_pref[]` |
| "3-4 bedroom will be a must" | `accommodation_needed`, `housing_type_pref` |
| "partner and I have 3 kids as well as my partners Mum" | `family`, `couples_seeking` |
| "Herringbone Sheds and Rotary" | `shed_types_experienced[]` |
| mixer wagons · plant/vat washes · break fencing · mastitis & lameness · calving · calf feeding · undersow/tractor | `seeker_skills` (the 24-competency taxonomy) |
| "class 1 licence" | `licence_types[]` |
| "need to stay in the Cambridge area as our kids are at school" | `region`, `preferred_regions[]`, `open_to_relocate = false` |
| "partner… doesn't have much experience but her end goal is to be able to milk by herself" | **`training_demand`** — a skills gap, stated voluntarily |

That is roughly 80% of a `seeker_profiles` row, sitting in public text.

**This directly attacks the 7-step onboarding friction** flagged in `NEXT-SESSION.md` Part B: a
cold Facebook click faces seven wizard steps and most will bounce. If the lead was captured first,
onboarding becomes *"we read your post — confirm this is right"*, which is a different and much
shorter product.

**4. The last row is the government-funding thesis in miniature.** A stranger volunteered a
skills gap and a career goal in a public post. Capturing that at scale across 1000 seekers is
exactly the evidence base described in the funding plan — and it does not require them to sign
up first.

### Sequencing

1. **Fix dedupe first.** Seekers duplicate far worse than employers — the same person posts across
   several groups and re-posts weekly. Launching a seeker lane onto a detector that never fires
   would bury the queue.
2. **Add `type: 'seeker'` capture** to the existing paste-post flow. No new table; the structuring
   prompt and the review columns change, the pipeline does not.
3. **Add `?ref=` attribution** to the signup link and store it. One param, one column.
4. **Then** pre-fill from the captured post — the largest piece, and the only one that touches
   onboarding.

### ⚠️ The constraint that is not technical

Employer staging holds **business** contact details. A seeker lane holds **personal information
about identifiable individuals** — names, family composition, children's schooling, immigration
status — scraped from posts they wrote for a different audience.

That is a materially different obligation under the Privacy Act 2020 (IPP 1–4 on collection, and
notification that you hold it). It is not a blocker and the founder is a lawyer, but it is a
**ruling to make before the first capture, not after 1000 of them**. It also interacts with the
existing `lead-dead-anonymise` cron and the retention windows in migration 075.

---

## Open questions for the operator

- Confirm the dedupe fix scope: staging-vs-staging fuzzy + region-insensitive matching, with a
  backfill over the existing 93 rows.
- Privacy ruling on capturing individuals (above) — needed before any seeker capture ships.
- Does the seeker lane need outreach *drafting* (like Lane A employers) or is DM-by-hand fine at
  the volumes involved?
