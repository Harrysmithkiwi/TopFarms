# Operator guides — Sentry, and the first real job listing

Written 2026-08-13. Followable version published as an artifact:
<https://claude.ai/code/artifact/0260b054-0baa-44a7-9671-e7eda649c270>

Both tasks are operator-owned. The second doubles as the first live test of the match alert
shipped in `cf3ebcd` (migration 084) — publishing a job is what makes it send.

---

## 1. Switch on Sentry (~10 min)

Sentry is already wired in and dormant. `src/lib/observability.ts:20` reads
`import.meta.env.VITE_SENTRY_DSN`; with no DSN the module is a complete no-op.

1. **Create a Sentry account and project** at sentry.io. Free tier is fine. Platform: **React**.
2. **Copy the DSN.** Shown during setup, or later at *Settings → Projects → [project] →
   Client Keys (DSN)*. Shape: `https://<key>@o<org>.ingest.sentry.io/<project>`.
3. **Add it to Vercel.** Project **top-farms**
   (team `harrysymmanssmith-gmailcoms-projects`) → *Settings → Environment Variables → Add New*.
   Name exactly **`VITE_SENTRY_DSN`**. Tick **Production** and **Preview**.
   CLI equivalent: `vercel env add VITE_SENTRY_DSN production --project top-farms`.
4. **Redeploy.** *Deployments → latest → `⋯` → Redeploy.*
   **This is the step that gets missed.** `VITE_` values are inlined into the bundle at build
   time, not read at runtime. Without a rebuild the variable exists in Vercel and changes
   nothing, which is indistinguishable from Sentry being broken.
5. **Verify.** Load www.topfarms.co.nz; the Sentry project should stop saying *"Waiting for
   first event"*. Verified state before this work: production env holds only
   `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — no DSN.

---

## 2. Post the first real job (~15 min)

### Preconditions (verified in prod 2026-08-13)

- **Log in as `harryssmith11@icloud.com`** — the *Corebeef farms* profile, Hawke's Bay,
  `onboarding_complete = true`. It is the **only** employer that can reach the wizard.
  `+ci-employer` ("UAT TEST Farm") sits at `onboarding_step 3`, and `PostJob.tsx:139-151`
  bounces an incomplete profile back to `/onboarding/employer`.
- **All 3 seeker profiles have `sector_pref = {dairy, sheep_beef}`** and belong to the
  operator's own addresses.

### Steps

1. Go to **`/jobs/new`** (`src/routes.ts:33`), or *Post a Job* on the dashboard. Eight steps.
2. **Step 1 Basics.** Title, role type, contract type, region, and **Sector → `Dairy` or
   `Sheep & Beef`**.
   **This choice decides whether the test proves anything.** `trigger_recompute_job_scores`
   filters on `NEW.sector = ANY(sp.sector_pref)` and nothing else
   (`072_match_scoring_v2.sql:491`), so Cropping/Deer/Mixed/Other yields zero matches, no
   email, and no signal.
3. **Step 2 Farm details.** Only **Shed type** is required — and it is required even for
   Sheep & Beef, where it is meaningless (`JobStep2FarmDetails.tsx:111-112`, unconditional).
   Worth fixing; a real employer would stumble here.
4. **Steps 3–4 Skills / Compensation.** Nothing required.
5. **Step 5 Description.** **Role Overview required, 20–175 chars**
   (`JobStep5Description.tsx:7-10`). The other three optional.
6. **Step 6 Preview.** Button reads *"Looks good — choose a listing plan"*
   (`JobStep6Preview.tsx:382`) — **stale copy**. There is no plan and no card; listings are
   free and unlimited under directive 1.19.
7. **Step 7 → "Publish listing".** **This click is the test.** Steps 1–6 leave the row at
   `status = 'draft'` and invisible (public RLS is `USING (status = 'active')`). Publish
   invokes `create-payment-intent`, which flips it to `active`
   (`create-payment-intent/index.ts:105-113`), and that UPDATE fires the alert.
8. **Check `admin.topfarms@gmail.com`** within a minute or two. Subject shape:
   `3 matches: <title> at Corebeef farms (Hawke's Bay)`.

### What to expect in the alert

A table of 3 seekers ranked by score, with email, phone, region, role prefs and a link to the
listing. **Every row will read "(no name on file)"** — correct, not a defect: all three
profiles have `seeker_contacts.first_name = NULL`. The addresses are all the operator's own.

**If no email arrives:** first confirm the listing is actually live (open `/jobs` in a private
window). A job stuck at draft means publishing failed and the trigger never fired — a
different fault from the email failing.

### Why the ordering is safe (verified, not assumed)

Four triggers sit on `jobs`. Postgres fires AFTER triggers in name order, so
`job_match_rescore` writes `match_scores` **before** `on_job_activated_notify_matches` posts,
and `pg_net` only delivers after commit — the function cannot race the engine.
`cleanup_match_scores_on_status_change` deletes scores only when a job *leaves* active
(`OLD.status = 'active' AND NEW.status IS DISTINCT FROM 'active'`), so it cannot empty the
list on the way in.
