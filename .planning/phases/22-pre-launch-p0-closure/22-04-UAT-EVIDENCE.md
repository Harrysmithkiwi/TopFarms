# Phase 22 — Wave 2 UAT Evidence

**Plan:** 22-04 P0 Prod Smoke
**Production URL:** https://top-farms.vercel.app/
**UAT start:** 2026-05-21
**Operator:** harry.symmans.smith@gmail.com (TopFarms owner)
**Executor:** Claude Code (gsd-executor) per plan 22-04-p0-prod-smoke-PLAN.md

---

## Task 1 — Operator authorization gate (pre-push STOP gate)

**Status:** RESOLVED externally (operator authorized after investigating §6 + 018-022 migration registry drift before allowing push).

**Affirmation form:** authorize push (operator typed equivalent affirmation after pre-flight surfaced unexpected scope — 80 commits vs ~3 originally assumed, plus migration registry drift across 023-033). Resolution included three prep sub-tasks (Prep-A through Prep-C) executed before push:

- **Prep-A** — commit untracked `029_pg_net_webhook_secret_vault.sql` migration. Commit: `67f874f fix(db): commit migration 029 pg_net webhook secret vault (applied via Studio 2026-05-10, backfilled to git history)`
- **Prep-B** — Studio registry backfill for migrations 023–033 (11 rows, bare-sequence-prefix format). Verified via MCP `list_migrations` after operator ran INSERT in Studio SQL Editor.
- **Prep-C** — workflow gate: migrations CI job → `workflow_dispatch` only; functions job uncoupled; `.gitignore` updated; carryforward written to `v2.0-MILESTONE-AUDIT.md`. Commit: `c30a867 chore(deploy): gate migrations CI to workflow_dispatch until pooler auth (§6) resolved`

No `git push --force`, `git reset --hard`, or `git rebase` was used. Per CLAUDE §4 / §8.

---

## Task 2 — Push + Vercel deploy

**Push timestamp:** 2026-05-21T22:15Z (approx — operator ran `git push origin main` after Prep-C commit landed on local main).

**Push outcome:** 82 commits pushed; 144 files changed (+26,883 / -318). Range `f14eda0..c30a867`.

**Commits at tip of origin/main (top 6):**

```
c30a867 chore(deploy): gate migrations CI to workflow_dispatch until pooler auth (§6) resolved
67f874f fix(db): commit migration 029 pg_net webhook secret vault (applied via Studio 2026-05-10, backfilled to git history)
5a5381b docs(22-01): complete signup-01-toast plan
2b9ef83 docs(22-02): complete homebug-02-listing-tier plan
9ca41ad fix(22-02): HOMEBUG-02 — pass int values [2,3] to listing_tier .in() filter (schema is int NOT NULL DEFAULT 1)
0e8c3a5 fix(22-01): SIGNUP-01 — persist Sonner toast for email_address_invalid (duration Infinity + closeButton)
```

The three Wave 1 fix commits (`0e8c3a5 fix(22-01)`, `9ca41ad fix(22-02)`, `231d17b fix(22-03)`) are all present in the pushed range.

**CI verification — `supabase-deploy.yml` run `26256528587`:** conclusion=SUCCESS. Migrations job correctly SKIPPED (workflow_dispatch gate held — see Prep-C). Functions job DEPLOYED all 11 Edge Functions in ~22s.

**Edge Functions deploy verification (MCP `list_edge_functions`):** all 11 functions show `updated_at = 2026-05-21T22:22:08Z` (post-push). Touched functions at new versions:
- `get-applicant-document-url` → v9
- `notify-job-filled` → v9
- `send-document-status-email` → v2
- `send-followup-emails` → v9

**Vercel frontend deployment:** LIVE.

```
$ curl -sSI https://top-farms.vercel.app/ | head -16
HTTP/2 200
accept-ranges: bytes
access-control-allow-origin: *
age: 116
cache-control: public, max-age=0, must-revalidate
content-disposition: inline
content-type: text/html; charset=utf-8
date: Thu, 21 May 2026 22:24:51 GMT
etag: "95ee5afcad8703f40005078fe68a8444"
last-modified: Thu, 21 May 2026 22:22:54 GMT
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-vercel-cache: HIT
x-vercel-id: syd1::mtw8w-1779402291288-b0920da03160
content-length: 621
```

**Vercel deployment status:** READY (200, x-vercel-cache HIT, last-modified 2026-05-21T22:22:54Z aligns with post-push Edge Functions deploy at 22:22:08Z).

**Deployment commit SHA matches push:** yes — bundle currently served is `index-Dmwiy3oc.js` corresponding to tip `c30a867`.

---

## Task 3 — UAT Step 1 (SIGNUP-01)

**Status:** PASS — operator-confirmed 2026-05-22.

**URL tested:** https://top-farms.vercel.app/signup
**Browser:** Chrome
**Test email:** not_an_email@example.test

**Network observation:**
  - `POST https://inlagtgpynemhipnqvty.supabase.co/auth/v1/signup` status: **400**
  - Initiator: `index-Dmwiy3oc.js:87` — confirms Wave 1 fix `0e8c3a5` deployed (bundle hash matches post-push Vercel READY at 2026-05-21T22:22:54Z, last-modified header on `/`).

**DOM observation:**
  - Toast appeared: YES
  - Toast text (verbatim):

    ```
    Email address "not_an_email@example.test" is invalid
    ```

  - Toast persisted ≥10s: **YES** — stays visible until manually closed (Sonner `{ duration: Infinity }` option from `0e8c3a5` confirmed live in prod).
  - Toast had close affordance: **YES** — X (close) button visible on toast (Sonner `{ closeButton: true }` option confirmed live).
  - Submit button reverted: YES — back to "Create account" after the 400 response.

**Verdict:** **PASS**

**Notes (out-of-scope — does NOT block SIGNUP-01 closure):**
  - Operator observed the toast renders at **top-left** of the viewport rather than top-right. SIGNUP-01 is defined narrowly as the persistence + dismissibility regression (`{ duration: Infinity, closeButton: true }` plumbing on the `toast.error(...)` call in `src/pages/auth/SignUp.tsx:88`), NOT position. Position is governed by the global `<Toaster position="..." />` instance at the app root (see `src/main.tsx` or `src/App.tsx`).
  - Both load-bearing acceptance criteria (persists ≥10s + close button affordance) are empirically satisfied. Per CLAUDE §7 partial-close discipline, position is orthogonal to SIGNUP-01's scope and does NOT block flipping the requirement.
  - If desired, the top-left vs top-right cosmetic mismatch can be tracked as a separate post-launch UX polish carryforward (`SIGNUP-01-COSMETIC`?) — not pursued here unless operator surfaces.

**§7-satisfied chain for SIGNUP-01 closure:**
  1. Code fix: `0e8c3a5 fix(22-01): SIGNUP-01 — persist Sonner toast for email_address_invalid (duration Infinity + closeButton)` (Wave 1 plan 22-01).
  2. Deploy: `c30a867 → Vercel bundle index-Dmwiy3oc.js` (Vercel READY 2026-05-21T22:22:54Z; HTTP 200 on `/`).
  3. Empirical prod evidence: operator-confirmed 2026-05-22 (this section).

All three gaps closed. SIGNUP-01 ready to flip in `.planning/REQUIREMENTS.md`.

---

## Task 4 — UAT Step 2 (HOMEBUG-02)

_Awaiting operator execution. See operator instructions below._

---

## Task 5 — UAT Step 3 (HOMEBUG-03)

_Awaiting Task 4 PASS before proceeding._

---

## Task 6 — UAT Step 4 (HOMEBUG-01)

_Awaiting Task 5 PASS before proceeding._

---

## Task 7 — UAT Step 5 (UXBUG-01)

_Awaiting Task 6 PASS before proceeding._

---

## Task 8 — REQUIREMENTS.md flips

_Awaiting Tasks 3–7 all PASS before proceeding._
