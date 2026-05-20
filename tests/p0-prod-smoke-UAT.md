# Phase 22 — P0 Prod Smoke UAT

**Purpose:** Operator-driven verification of all 5 P0 fixes against the deployed production frontend at `https://top-farms.vercel.app/`. Executed in plan 22-04 Wave 2 AFTER Wave 1 fixes (22-01, 22-02, 22-03) have been pushed to main and Vercel deployment is confirmed live.

**Prerequisite:** Operator has typed `authorize push` in chat and Wave 1 fixes are deployed live (Vercel deployment URL returns 200 on `/`).

**Test accounts required:** None for steps 1-4 (anonymous). Step 5 requires sign-in as an employer test account (use any existing UAT employer; if onboarding is already complete, navigate via `/dashboard/employer` → edit profile to reach Step 4).

---

## Step 1 — SIGNUP-01 (toast persistence)

**URL:** `https://top-farms.vercel.app/signup`

**What to do:**
1. Open the URL in a fresh incognito/private window.
2. Click the role selector (either "Seeker" or "Employer" — does not affect SIGNUP-01).
3. In the email field, enter an obviously-undeliverable address: `not_an_email@example.test`
4. In the password field, enter a valid-shape password: `ValidPass123!`
5. Click **Create account**.
6. Open DevTools → Network tab BEFORE clicking. Find the `POST .../auth/v1/signup` request after click.

**Network expectation:**
- `POST https://inlagtgpynemhipnqvty.supabase.co/auth/v1/signup` returns status `400` with response body containing `"code":"email_address_invalid"` OR `"error_code":"email_address_invalid"` OR message `"Unable to validate email address"`.

**DOM expectation:**
- A Sonner toast appears at top-right with red error styling and text like `"Unable to validate email address: invalid format"` (exact text depends on Supabase response).
- **CRITICAL: the toast remains visible for at least 10 seconds without auto-dismissing.**
- The toast has a close affordance (X button or click-to-dismiss area).
- The submit button reverts from loading state back to "Create account".

**Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

---

## Step 2 — HOMEBUG-02 (featured listings query)

**URL:** `https://top-farms.vercel.app/`

**What to do:**
1. Open the URL in a fresh incognito/private window.
2. Open DevTools → Network tab → filter by `jobs?` BEFORE the page finishes loading (refresh if needed).
3. Scroll to the "Live Listings" / featured-jobs section.

**Network expectation:**
- `GET https://inlagtgpynemhipnqvty.supabase.co/rest/v1/jobs?select=...&status=eq.active&listing_tier=in.%282%2C3%29&order=created_at.desc&limit=6` returns status `200` (NOT 400).
- The URL must contain `listing_tier=in.(2,3)` (URL-encoded as `listing_tier=in.%282%2C3%29`), NOT `listing_tier=in.("featured","premium")`.
- The response body is a JSON array (possibly empty if no featured jobs in DB — empty array is acceptable; the bug is the 400, not the count).

**DOM expectation:**
- The featured listings section renders WITHOUT a blank/broken-image state. If at least one featured/premium job exists, cards render with Title + Region + Salary + Premium/Featured badge.
- If no featured jobs exist, the fallback query fires and renders up to 3 recent active jobs (per FeaturedListings.tsx:144-151 fallback path).

**Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

---

## Step 3 — HOMEBUG-03 (accommodation filter)

**URL:** `https://top-farms.vercel.app/jobs`

**What to do:**
1. Open the URL in a fresh incognito/private window (anonymous is fine).
2. Open DevTools → Network tab → filter by `jobs?` BEFORE toggling any filter.
3. Open the FilterSidebar (left side on desktop; tap "Filters" on mobile).
4. Under "Accommodation" section, toggle the **Couples welcome** checkbox.
5. Observe the URL parameter change and the resulting Network request.
6. Then toggle the **Pet-friendly** checkbox in addition.
7. Observe the URL parameter change and the resulting Network request.

**Network expectation:**
- After toggling Couples: the URL bar shows `?accommodation_type=couples`. The PostgREST `GET .../jobs?...employer_profiles.accommodation_extras=ov.{Couples+welcome}` (URL-encoded as `ov.%7BCouples+welcome%7D`) returns status `200`.
- After toggling Pet-friendly: URL becomes `?accommodation_type=couples&accommodation_type=pet_friendly`. PostgREST request has `accommodation_extras=ov.{Couples+welcome,Pets+allowed}` (URL-encoded) and returns `200`.
- Neither request returns `400`.

**DOM expectation:**
- The job listing area renders results (or shows the empty-state "No jobs found" copy if filter produces zero matches — empty is acceptable; the bug is the 400, not the count).
- No console errors related to PostgREST 400.

**Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

---

## Step 4 — HOMEBUG-01 (platform stats RPC)

**URL:** `https://top-farms.vercel.app/`

**What to do:**
1. Open the URL in a fresh incognito/private window.
2. Open DevTools → Network tab → filter by `get_platform_stats` BEFORE the page finishes loading (refresh if needed).
3. Scroll to the CountersSection widget (typically near the top of the home page) showing three counter blocks: "Jobs Posted" / "Workers Registered" / "Matches Made".

**Network expectation:**
- `POST https://inlagtgpynemhipnqvty.supabase.co/rest/v1/rpc/get_platform_stats` returns status `200`.
- Response body is a JSON object of shape `{ "jobs": N, "seekers": M, "matches": K }` where N, M, K are non-negative integers (may be 0 if DB is empty, but the SHAPE must be present — NOT 404, NOT 400).

**DOM expectation:**
- The three counter blocks render with NUMERIC values (animated count-up from 0 to target via `useCountUp` over ~1800ms). Final state is three legible numbers, not three dashes or three zeroes-that-never-tick.

**Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

---

## Step 5 — UXBUG-01 (accommodation chips, Step 4 + Step 7)

**URL:** `https://top-farms.vercel.app/onboarding/employer/step-4` (after sign-in)

**What to do:**
1. Sign in as an employer test account (any existing UAT employer).
2. Navigate to onboarding **Step 4 — Accommodation**. If onboarding is already complete, you may need to use the in-progress profile editor at `/dashboard/employer/profile` → "Edit Step 4" (path may vary; the operator should know the route from prior UAT sessions).
3. Observe the ChipSelector for "Accommodation extras".

**DOM expectation (Step 4 write side):**
- **8 chips render** with EXACTLY these Title Case labels (matches `src/types/domain.ts:327-336`):
  1. Pets allowed
  2. Couples welcome
  3. Family welcome
  4. Utilities included
  5. Furnished
  6. Garden
  7. Garage
  8. Internet included
- Selecting 2 chips (e.g., "Couples welcome" + "Pets allowed") toggles their visual state (active background).
- Clicking "Continue" persists the selection (no PostgREST 400 in Network tab on the underlying UPDATE).

**Cross-step verification (Step 7 read side — Pitfall 1 from research):**
4. Advance through Steps 5 / 6 (whatever you can skip-fill).
5. Land on **Step 7 — Preview**.
6. Locate the accommodation summary block in the preview.

**DOM expectation (Step 7 read side):**
- The 2 chips selected on Step 4 (e.g., "Couples welcome" + "Pets allowed") appear in the preview summary as their Title Case labels.
- No "undefined" / "null" / missing values.

**Network expectation (across both steps):**
- All PostgREST UPDATE/SELECT calls against `employer_profiles` return `200` — no `400` on the `accommodation_extras` column read or write.

**Pass:** [ ]  **Fail:** [ ]  **Notes:** _____

---

## Overall Verdict

- [ ] All 5 steps PASS — Phase 22 P0 closure verified empirically against production.
- [ ] N steps PASS, M steps FAIL — note which fail and gather Network/DOM evidence; route to gap-closure follow-up plan.

**Operator signature:** _____  **Date:** _____  **Vercel deployment commit SHA:** _____
