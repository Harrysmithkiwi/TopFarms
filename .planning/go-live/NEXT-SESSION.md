# Phase brief: close the seeker funnel's leak, then the tidy-ups

Written 2026-08-11. Supersedes the previous `NEXT-SESSION.md` (four unblocked items — A1, A2
and A3 done; A4 carried forward here as item 3).

> ## ▶ START HERE — state at end of 2026-08-13
>
> **All six items are closed.** Item 6 was never blocked on a ruling: ticket 05 was RESOLVED
> 2026-08-07 (operator chose placement A, wired same day) and PR #87 was simply pointing at
> `design/admin-gate`, a base that had merged separately. Retargeted and merged — `8d89930`.
>
> **CI is green again.** It had been red since 2026-08-11 and nobody noticed, so six commits
> landed on a red main while local gates were reported green. Three breakages, each hiding the
> next: the `saved-search` spec ratcheting its own fixture dead at the 10-search cap; two npm
> advisories (patched, not waived); and a bundle-budget step still reading `dist/assets` after
> framework mode moved output to `build/client/assets`. **A broken check hides the check behind
> it** — do not step around a red CI again.
>
> **Email works end to end**, verified on prod with a real signup: Supabase → Resend SMTP →
> Cloudflare routing → `admin.topfarms@gmail.com`, arriving as `TopFarms <hello@topfarms.co.nz>`
> in the Inbox, link consuming its token. Auth email rate limit **2/h → 200/h** — the 2 was a
> silent launch-day ceiling. Setup detail worth keeping: the Supabase SMTP **username is the
> literal string `resend`**, not an email address.
>
> ### The two things left before this funnel works
>
> 1. ✅ **DONE 2026-08-13 (`cf3ebcd`, migration 084 = ledger `20260813120337`).** Operator
>    match-alert live in prod: `on_job_activated_notify_matches` fires when a job becomes
>    `active` → pg_net → `notify-job-matches` Edge Fn → emails `OPERATOR_EMAIL` (default
>    admin.topfarms@gmail.com) the ranked matched-seeker list (score/name/email/phone/region/
>    roles). Zero matches → logged skip. Same Vault/webhook-secret shape as `notify-job-filled`;
>    registered in both CI guards. Verified: trigger in `pg_catalog`, deploy + CI + E2E green,
>    live no-secret probe → 403 (proves deploy AND `WEBHOOK_SECRET` present — unset would 503).
>    **Known-unverified: the full path has never fired** — zero jobs in prod, never seeded.
>    Recheck at the first real listing. Seeker-facing sends stay manual by design.
> 2. **Sentry has no DSN in production** — `initObservability` no-ops, confirmed by grepping
>    the built bundle. Operator pastes the value; wiring is minutes.
>
> Also open, small: DMARC is `p=none` with no `rua=` (re-verified 2026-08-13). The **Site URL
> worry is CLOSED**: a bogus-token `/auth/v1/verify` probe 303s to `https://www.topfarms.co.nz#…`
> — config is www; the apex landing predated ticket 02's fix.
>
> The Cloudflare plugin loaded after the restart but its MCP servers are **OAuth-gated** —
> each needs a one-time browser authorization before any tool works. DMARC fix is blocked on
> that click, nothing else.
>
> ---
>
> **CLOSED 2026-08-12. Items 1–5 are all done, item 6 is still blocked on the operator.**
> Nothing below needs redoing. What this phase actually changed, beyond the tickets:
>
> - **Step 1 was silently losing every seeker's name and phone** — the table the placement fee
>   unlocks. Found by finishing the browser walk (item 2's carried-forward half); invisible to
>   the unit tests because PostgREST reports an UPDATE matching zero rows as a success.
> - **Every authenticated e2e spec was unrunnable against production** — all three login setups
>   raced React's hydration and timed out. A local-only green suite was passing over untested
>   roles.
> - **A4's answer is "no pipeline"**: 0 of 5 sampled listings carry a contact at all, and the
>   harvester had already read those pages. 2 of the 3 URL rows yielded; one is an agency.
>
> Measured state after: `lead_staging 94 · seeker_profiles 3 · auth users 10` (throwaway walk
> account created and deleted, zero residue) · `main = 77eec80` · prod healthy.
>
> **Next session: item 6 needs an operator ruling; there is no other unblocked work in this
> brief.** Open questions are listed under "Left for the operator" at the bottom.

Work the items in order. Nothing here depends on Stripe, and nothing depends on go-live
ticket 01. Item 6 is blocked on an operator ruling and is listed so it is not forgotten.

## Standing rules

- `CLAUDE.md` is binding: §3 diagnose before fix · §4 atomic commits, no history rewriting ·
  §9 verification discipline · §10 two design canons, `impeccable` is the frontend skill.
- **Verify before claiming.** A finding carries `file:line` or command output, or it is marked
  unverified. `tsc -b`, never `tsc --noEmit`. **Never read an exit code through a pipe** —
  `cmd > /tmp/x.log 2>&1; echo $?`, because `| head` reports head's status, not the command's.
- `main` auto-deploys to production. After a deploy, poll a **content signal from a chunk the
  change actually touches** — twice this week a poll watched a code-split chunk the commit
  never reached and read like a failed deploy.
- Supabase project ref `inlagtgpynemhipnqvty`; project MCP is `--read-only`, writes go through
  the claude.ai connector. Directive §1.15: **production is never seeded.**
- Operator-owned, flag and never attempt: Stripe keys, dashboard toggles, legal review,
  sending outreach.

## Measured state, 2026-08-11

```
jobs 0 · applications 0 · match_scores 0 · placement_fees 0 · placements 0
lead_staging 95  (94 employer · 1 seeker — Shaye Boyd, stale, see item 1)
seeker_profiles 3 · employer_profiles 2
main = 55ab87c · prod healthy · tree clean
```

**Closed today, do not re-litigate:** ticket 02 (redirect allowlist — Site URL is now `www`,
`redirect_to` verified honoured), R3 (match engine works; the earlier zero was a probe
artefact), A1 (`compute_match_score` REVOKE), A2 (form-primitive a11y), A3 (readiness rerun).

---

## 1. ✅ DONE 2026-08-12 — Shaye's stale row

The one seeker row predates the canonical vocabulary: it holds `roles_sought: ["Farm
Assistant"]` and `skills: ["hard working","reliable"]`. The operator tried re-pasting and it
was **refused as an exact duplicate** — `_lead_intake`'s fingerprint check (name + region +
type) blocks a re-capture, which is correct behaviour but also blocks refreshing a row.

Delete `lead_staging` id `277a1ff5-8cb5-417e-bf57-cec2ae0cf353` so the operator's re-paste
lands. **Confirm with them before deleting** — it is their data, even if it is one test row.

**Deleted** (`277a1ff5…`). Deleted rather than rejected — a rejection can put the fingerprint
into `lead_suppression` and refuse the re-paste outright. Suppression list verified empty, so
the operator's re-capture will land with canonical values. `lead_staging` back to 94, seeker
rows 0.

---

## 2. ✅ DONE 2026-08-12 — Waitlist landing + split onboarding

**The leak.** A seeker who signs up today lands on a job board with **zero jobs**. That is the
first impression of the product for every person the outreach converts, and they do not come
back. Meanwhile onboarding is seven steps, which sheds most of a cold Facebook click before any
profile exists.

### 2a. The waitlist state

When the board has no live jobs, the seeker's post-signup surface must not be an empty list.
It should:

- **Say where they stand honestly** — position in the queue is motivating and it is true.
- **Make profile completion the single call to action.** This is the thing the business
  actually wants; it converts a waiting user into a complete record.
- **Promise a specific trigger** — "we'll email you when a job matching you goes live" — and
  nothing vaguer. The match engine exists and works (R3), so this is a promise that can be kept.

Condition it on live job count, not on a feature flag: the same screen must stop appearing by
itself the day M3 inventory lands, with no second deploy.

### 2b. Split onboarding

- **Core (≤ 2 min, at signup): region · sector · role.**
- **Everything else deferred** to the waitlist screen's completion CTA.

> **`sector` is mandatory and this is not negotiable.** `trigger_recompute_job_scores` filters
> `WHERE NEW.sector = ANY(sp.sector_pref)`. A profile with no `sector_pref` matches **nothing** —
> it is invisible to every job ever posted. Verified 2026-08-11; see `LAUNCH.md` R3.

Region and role are what make a match meaningful; sector is what makes it happen at all.

### 2c. Carry the attribution through

`?ref=` currently reaches `auth.users.raw_user_meta_data` at signup (email path) and via
`SelectRole` (OAuth path). Confirm it still survives the new onboarding — a split that drops it
silently un-measures the whole funnel, and nothing will fail loudly if it does.

**Shipped in `6c7adce`** and walked on live prod with Playwright (`scripts/seeker-signup-walk.mjs`):

- **Attribution proven end to end** — a real prod signup carried `ref: "52e62e58"` and
  `role: "seeker"` into `auth.users.raw_user_meta_data`.
- **The waitlist card renders** as the FIRST screen a new seeker sees, with "Complete your
  profile" as the only CTA and **"Browse jobs" suppressed**. Screenshot taken; account torn
  down; prod back to 10 auth users, zero residue.
- Step 1 gained region + role; steps 2-7 gained "Save and finish later"; the escape hatch is
  deliberately absent on step 1. Guarded by `tests/seeker-matchable-core.test.tsx`,
  mutation-checked.

### ✅ Carried-forward half — CLOSED 2026-08-12, and it found a defect

`scripts/seeker-signup-walk.mjs` now runs in **two modes**, because production requires email
confirmation and the script holds no service-role key, so signup cannot log itself in. Mode A
signs up and prints the email; mode B (`RESUME_EMAIL=…`) logs in and walks the rest. Walked on
live prod against a throwaway account, then torn down (prod back to 10 auth users, zero residue):

- waitlist card first, "Browse jobs" suppressed → CTA opens the wizard
- step 1 persists the matchable core — `sector_pref ["dairy"]`, `region "Waikato"`,
  `role_type_pref ["Farm Hand"]`, `onboarding_step 1` — asserted with SQL, not with a UI that
  merely advanced
- "Save and finish later" from step 2 returns to `/dashboard/seeker`, and re-entry resumes at
  step 2

**THE DEFECT (`6b37f1d`, `2074b82`): step 1 silently discarded the name and phone it collected.**
`seeker_contacts` rows are created by the `seeker_profiles_ensure_contact` trigger, which fires
AFTER INSERT on `seeker_profiles` — and the profile is not upserted until `onComplete()`, i.e.
after the contact save runs. On a first pass there is no row, the UPDATE matched nothing, and
**PostgREST reports an UPDATE matching zero rows as a success**: no error, no toast, no log. This
is the table the placement fee unlocks — employers pay $200–800 for it. The fix ensures the row
first (`INSERT … ON CONFLICT DO NOTHING`, carrying the NOT NULL `email`, the same statement the
trigger runs) and then updates the fields the form owns; a single upsert of everything would
rewrite a curated email back to the signup one. Re-walked on prod after deploy: `first_name E2E`,
`last_name Walker`, `phone 021 000 0000` all persisted.

**Only a browser found it.** Unit tests passed throughout — the mock resolved the UPDATE the same
way PostgREST did. The mock now fails loudly instead.

### Findings from the walk, worth keeping

- **The password policy requires ≥ 10 characters.** `Test1234!` is 9 and is rejected by
  client-side validation with **no request sent** — two signups did nothing silently before
  this surfaced. Note `+ci-employer`'s password is `Test1234!`: fine for login (set directly
  in the DB) but it would fail if ever re-registered through the form.
- **Playwright selector trap:** `getByRole('button', { name: /log in|sign in/i })` matches
  **"Sign in with Google"** first and walks into Google OAuth. Use
  `{ name: 'Log in', exact: true }`. Same trap awaits the next spec.

---

## 3. ✅ A4 — DONE 2026-08-12. Hit rate **0 of 5**. Stop rule fired; no pipeline built.

**The sample.** 5 of the 34 `nzfarmingjobs` no-contact rows, fetched through Firecrawl (the site
403s curl *and* headless Chromium — that bot wall is why the Firecrawl lane exists). Markdown
format, not the json+schema extraction, deliberately: it shows what is **on the page** rather
than what an LLM chose to pull off it. 5 credits total.

- **0 of 5 carried an employer email.** Three apply through the board's own "Apply Now" form
  behind a reCAPTCHA — there is no contact printed to find. One is expired ("that job is no
  longer available"). The fifth prints one phone number and it belongs to **Rural Directions**,
  a recruitment agency, not the farm.
- The result was predictable from the harvester and is now confirmed empirically: `lead-harvest`
  already scrapes each listing with an extraction prompt that asks for `contact_email/phone`.
  A row with no contact is a page with no contact. **A re-scrape re-runs the same extraction over
  the same page.** 24 of 54 `nzfarmingjobs` rows *do* have an email, so the extractor works.

**The 3 `company_profile_url` rows — 2 of 3 yielded, and one is not what it looked like:**

- **Waverley Station ×2** → `waverleyoffice@waverleystation.com`, off the `/contact` page the row
  already pointed at. Written to both rows with provenance in `contact.notes`.
- **Taharoto** → the `bit.ly` resolves to a **Rural Directions** PDF: `recruitment@
  ruraldirections.co.nz`, `+64 6 871 0450`. **Not written.** It is an agency, not a direct
  employer, and pitching TopFarms to a recruiter is a different conversation — operator's call.

**A bounce found on the way:** `accounts@beckenhammhills.co.nz` (double m) has **no MX and no A
record**; the two sibling Beckenham Hills rows carry the correct `beckenhamhills.co.nz`. Fixed.

**Restated count** (definition given explicitly, because the earlier "15" is not reproducible
from any query in the repo and no spec records how it was derived):

| NZ employer rows with an email | 42 |
| distinct email addresses | 41 |
| minus agency/consultancy domains (`pgpartners.nz`, `no8hr.com`, `bakerag.co.nz`, `perrinag.net.nz`) | 4 |
| **emailable NZ direct employers** | **37** |

Unchecked, and worth knowing before a send: nothing here verifies deliverability beyond the one
DNS check above, and expired listings (like the Smedley row) are not detectable without a fetch.

**No outreach sent.**

---

## 4. ✅ S1 — DONE 2026-08-12 (`2c67bb9`). Live prod: `/definitely-not-a-page` → **404**.

The `*` route serves every path that is not `/jobs` or `/jobs/:id` — the whole gated surface
included — so the server cannot tell a typo from `/dashboard/seeker` without consulting the
legacy route table. It now does: if the deepest `matchRoutes` hit is the table's own `*` entry
(the one whose element is `NotFound`), the loader throws a 404 `Response`. `root.tsx`'s
ErrorBoundary catches it and renders the same branded page, so only the header changed.

**The check lives in the ROOT loader, not in `routes/spa.tsx` — and that distinction is the whole
finding.** Putting it in the splat module works and costs exactly what directive 1.16 was staged
to protect: a server loader on that route turns every client-only route into a server-rendered
one. Measured on the built server, `/login`'s document went **6,036 → 11,399 bytes**, and 40
gated routes would have been server-rendered without the deferred hydration audit. From the root
loader every other route moved by **17 bytes** and none changed shape. `/jobs` and `/jobs/:id`
are exempt explicitly — they are SSR'd by their own modules and are not in the legacy table.

Verified on live prod: `/definitely-not-a-page` and `/nope/deeper` → 404; `/login`, `/jobs`,
`/pricing`, `/dashboard/seeker` → 200. Two tests in `prod-smoke.spec.ts`, status first and copy
second, plus a second test guarding the failure mode this introduces (404ing a real route).

---

## 5. ✅ S2 and the a11y leftovers — DONE 2026-08-12 (`1dc48d0`)

- **S2** — migration `083`, ledger `20260812103059`. `ALTER POLICY … TO authenticated`, nothing
  else; the USING expression is deliberately not restated, because retyping a predicate that
  gates CVs is a chance to get it subtly wrong. After: `polroles {authenticated}`, and an
  authenticated employer's REST read still returns 200. **Empty, though** — prod has zero
  applications, so a *positive* read cannot be proven until one exists. Recheck at first apply.
- **`color-contrast` serious** — the completion screen's "Edit Profile" was `--color-brand`
  #16a34a on white: **3.29:1 measured by axe** against a 4.5:1 bar, and `docs/design/contrast.md`
  already records that token as RETIRED as text. The "Saving…" indicator two files up had the
  same colour; the seeker wizard's identical indicator already used `brand-hover` (5.02:1).
  Reproduced by setting the CI employer's `onboarding_step` to 7, running axe against **live
  prod** at both widths, then restoring the row. Re-run on the built server: **no violations at
  either width**. Edit Profile also gained a focus ring and a 44px target — it was a bare
  `<button>` styled as a link with neither, between two buttons that had both.
- **`landmark-unique` moderate** — two unnamed `<nav>` landmarks (top bar + sidebar). Now "Main"
  and "Dashboard sections". Fires at 1200px only, because the sidebar is `hidden md:flex`.
- Full a11y sweep after: **27 passed / 5 skipped**, both widths.

### Also fixed, and it was blocking more than it looked

**Every authenticated e2e spec was unrunnable against production.** All three storage-state
setups timed out at 15s with both fields filled, no error and **no request sent** — `fill()`
writes to the DOM whether or not React has attached its handlers, and on a real network the
click lands on a form nobody is listening to. It does not reproduce locally, so a suite green
against a local server was silently green over untested roles against prod. One `waitUntil:
'networkidle'` in `auth.setup.ts` (`77eec80`): 3 setups now pass in ~6s each. Same trap as the
seeker walk, same fix — worth remembering as the third sighting.

---

## 6. PR #87 — training-demand form · BLOCKED

`feat/training-demand-form`, 898 insertions. The table (migration 079) is already live in prod;
only the UI is stranded. **Blocked on go-live ticket 05** (placement sign-off), not on code.

Worth raising with the operator when the moment fits: under the seeker-first plan this is the
instrument that captures skills *wanted*. `seeker_skills` gives skills *held*; the delta across
1000 seekers **is** the government-funding application. Merging it after those seekers onboard
means emailing all of them again.

---

## Not in this phase

- Anything needing Stripe — PEND-01 and the R4 `stripe_customer_id` reset are operator-owned,
  and R5 (prod uses a different Stripe account than the connected one) needs ruling first.
- **The triage stream.** Deliberately deferred until the operator has DM'd 10–15 seekers by
  hand — the right shape follows from friction they have not felt yet, and building it now
  would be guessing.
- M3 inventory and go-live ticket 01. Operator's call, still open.

---

## Left for the operator (2026-08-12)

Nothing here is code. Each one is a decision or an act only the operator can take.

1. **Item 6 / PR #87** — the ruling that unblocks the only remaining item in this brief.
2. **Taharoto → Rural Directions.** An agency contact, deliberately not written to the lead row.
   Do you want agency leads pitched at all, and if so as a separate segment?
3. **The 37 emailable direct employers.** Enrichment is done; the sending is yours.
4. **`+ci-employer`'s password is `Test1234!`** — 9 characters, below the form's 10-character
   policy. Fine for login (set directly in the DB), but it cannot be re-registered through the
   form, and it is a live credential in a chat transcript from 2026-07-31 flagged for rotation.
5. **`employer_profiles` still holds "UAT TEST Farm (delete me)"** at `onboarding_step 3`. It is
   the CI employer fixture — the a11y sweep and every employer spec depend on it — so it was
   restored, not deleted. Say the word if it should go, and the specs will need another fixture.

### Known-unverified, stated rather than buried

- **S2's positive read.** The policy permits an authenticated employer and returns 200, but prod
  has zero applications, so no legitimate row exists to prove it *returns* one. Recheck at the
  first real application.
- **The connector logs data operations into `supabase_migrations.schema_migrations`.** This
  session's account-confirm and account-delete calls are in there as `confirm_e2e_seeker_walk_
  account` and `delete_e2e_seeker_walk_account` with no file on disk. The drift test only checks
  disk → ledger, so it stays green, but the DB ledger now carries rows that are not migrations.
