# Work order — D4 (INZ register verification) and the dead SearchHero

**Paste this whole file as the opening prompt of a fresh session.** Written 2026-08-18.

Read first: `docs/immigration/05-job-check-advertising-verified.md`, `CLAUDE.md` §3 §4 §9,
and the `091` / `099` rows in `supabase/migrations/LEDGER.md`.

---

## The reframe that makes D4 small

I recorded D4 as "a phase, not a ticket". Having checked the schema, **that was too pessimistic
and the reason is worth stating up front.**

`employer_verifications.nzbn_number` already exists, and it is populated through the **identity
rung of the trust ladder** — the flow F-11 fixed and `086` made work. An employer submits their
NZBN, it lands as `status='pending'`, and **an admin already reviews it by hand.**

So the lookup key is already collected, already human-reviewed, and already has a screen where
a person is looking at it. D4 is not "build a pipeline to collect and verify NZBNs". It is:

> **when an admin is already reviewing an NZBN submission, also show them what the INZ register
> says.**

That is a different, much smaller job — *if* the register is queryable. Which is Stage 0.

## The scale argument — read this before designing anything

There are **29,000+ accredited employers** in New Zealand. TopFarms has **zero employer
profiles in production today** and will plausibly have tens, not thousands, for a long time.

A scheduled re-verification cron, a mismatch queue and a disagreement state machine are
engineering for a scale that does not exist. Two facts make almost all of it unnecessary now:

1. **The expiry is already handled without any cron.** `091` stores
   `inz_accreditation_expires` and derives `accredited_employer` as
   `inz_accredited AND inz_accreditation_expires > current_date`, recomputed **per read** on
   `marketplace_employer_profiles`. A lapsed accreditation stops matching on its own, with
   nobody switching anything off. The "12/24-month renewal schedule" I flagged is already
   solved by a date comparison.
2. **`inz_accredited_verified_at` is already reserved** by `091` and is currently unused. The
   whole of Stage 1 is: write that column, and show it.

**Build the manual version first. It works at 5 employers and it works at 500.** Automate only
the step that becomes tedious, and only once someone has actually done it by hand enough times
to know which step that is.

---

## Stage 0 — is the register queryable at all? *(blocking, ~30 min)*

Everything downstream depends on this and it is currently unknown.

<https://www.immigration.govt.nz/work/requirements-for-work-visas/approved-employers/accredited-employer-list/>

Open it with the Chrome tools and watch the network panel while searching. Establish:

- Does the page call a **JSON endpoint**, or is it server-rendered HTML?
- Can it be queried **by NZBN**, or only by employer name? (This is the decisive question. Name
  matching against 29,000 records is fuzzy matching and a different, worse problem.)
- Does the response carry an **expiry date** or an accreditation **type**
  (standard / high-volume / triangular)? `091` requires an expiry, so if the register does not
  publish one, a verified record still cannot fill that column and the employer's own claim
  stays the only source for the date.
- Are there **terms of use** on scripted access? Record what they say. Do not build around a
  prohibition.

**Write the finding into `docs/immigration/06-inz-register-verification.md` with the date and
the evidence, exactly as `05` does.** If the answer is "HTML only, name search only, no expiry",
say so plainly — that outcome makes Stage 1 a *manual link-out*, which is still worth shipping,
and it kills Stage 2 entirely. That is a good result, not a failed one.

---

## Stage 1 — the admin does it, and the system records that they did

Ship this whatever Stage 0 returns. Only the middle step changes.

**On the existing NZBN review screen** (the verification queue an admin already uses):

1. Show the employer's claimed `inz_accredited` and `inz_accreditation_expires` beside the NZBN
   they submitted. Right now those two facts live on different screens.
2. Either **(a)** show the live register result inline, if Stage 0 found a queryable endpoint,
   or **(b)** show a deep link to the register pre-filled with the NZBN or the trading name.
3. Two buttons: **"Register confirms this"** and **"Register does not confirm this"**.

**What the buttons write** — one RPC, admin-gated, audit-logged:

- confirms → set `employer_profiles.inz_accredited_verified_at = now()`
- does not confirm → set `inz_accredited = false`, clear `inz_accredited_verified_at`

Then surface it. `marketplace_employer_profiles` currently derives `accredited_employer` from
the claim alone; add a second derived flag for *verified* accreditation. **Do not collapse the
two into one boolean** — "they say so" and "we checked" are different claims and the seeker is
entitled to know which one they are reading.

The `/jobs` filter copy today says *"Employer-declared. We do not yet check it against the INZ
register."* Once Stage 1 ships, that sentence must change, and it is the only place it appears.

### The two guardrails

- **Accreditation must not become self-assertable trust.** Per F-11, `inz_accredited` sits
  **outside `employer_verifications` on purpose**. A *verified* accreditation may become a
  visible badge; it must not silently promote an employer up the `basic → verified →
  fully_verified` ladder, because that ladder is what an employer earns through a reviewed
  identity document and a farm photo. **`tests/trust-ladder.test.ts` will fail if you wire it
  in — that failure is correct.**
- **A refusal is not a punishment.** "Register does not confirm" most often means a stale
  NZBN, a trading name that differs from the registered one, or an accreditation that lapsed
  last month. Clearing the flag is right; hiding the employer is not.

---

## Stage 2 — automate the lookup *(only if Stage 0 said yes, and only when it hurts)*

An Edge Function that queries the register by NZBN and returns the result, called from the same
admin screen. **The admin still presses the button.** This removes typing, not judgement.

Skip this entirely until the manual version has been used enough times to be annoying. At the
current employer count that may be never.

## Stage 3 — scheduled re-verification *(explicitly deferred)*

Do not build. The derived flag already expires itself, so the failure mode a cron would catch
is narrow: an accreditation **revoked by INZ before its stated expiry**. That is rare, and at
this scale a quarterly manual sweep of a handful of employers is cheaper and more reliable than
a cron nobody watches.

Revisit when there are enough accredited employers that a manual sweep takes more than an hour.

---

## Decisions for the operator — ask, do not assume

1. **When the register disagrees with the employer, what happens to their live jobs?** Nothing,
   a flag on the listing, or unpublish? My recommendation: **nothing to the listing**, clear the
   accreditation flag, and email the employer telling them what we found and how to correct it.
   Unpublishing punishes a farm for a stale registry entry.
2. **Does a verified accreditation become a trust-ladder rung, or stay a filterable
   attribute?** My recommendation: **stay an attribute**, shown as its own badge. The ladder is
   about identity; this is about a specific INZ status.
3. **Is a verified accreditation worth charging for?** It sits directly on the
   accreditation-as-a-service line in `docs/immigration/02-legal-line.md`. Worth deciding before
   it is free by default.

---

## The second item: `<SearchHero />` on `/jobs` is inert

`JobSearch.tsx:564` renders `<SearchHero />` **with no `onSearch` prop**. The component's search
box and region dropdown are wired to a callback that is never passed, so **typing a search and
pressing go does nothing at all.**

It is also carrying a third region vocabulary — nine slug values (`manawatu`, `hawkes-bay`) that
match neither `NZ_REGIONS` nor anything in the database. Migration `100` unified the other four
lists; this one was left because whether it should exist is a product question, not a defect.

**This is the same family as F-17** — a control that renders, looks functional, and does
nothing. A seeker who types a search and sees an unchanged list reads it as "no jobs match".

Two options, and it is a product call:

- **Wire it.** `onSearch={(q, region) => setSearchParams(...)}`. `q` is now a registered filter
  (F-17) so it produces a pill and clears properly. The region dropdown must be rebuilt from
  `NZ_REGIONS` — its slugs would never match `jobs.region`, which is compared by exact string
  equality. Roughly an hour, and it makes the most prominent control on the page work.
- **Remove the search controls**, keep the hero as a heading. Ten minutes, and honest.

**Recommendation: wire it.** It is the first thing a seeker sees on `/jobs`, the filter registry
work that makes it cheap is already done, and the corpus says seekers search by role and town —
which is exactly what a free-text box is for.

⚠️ `/jobs` is a **public marketing surface** under `docs/design/v11-DIRECTIVE.md`, so its
*visual* treatment is settled and out of scope. This is a functional defect, which
`CLAUDE.md` §10 says is filed on any surface. Do not restyle the hero while you are in there.

---

## Gates

`tsc -b` 0 · `deno check` on any edge function touched · vitest green · lint 0 errors at the
53 pin · `npm run build` 0. Migrations through the connector with the SQL saved to
`supabase/migrations/` and a `LEDGER.md` row; verify via `pg_catalog`, never the banner.

Prove behaviour on prod inside a transaction you `ROLLBACK` — that pattern is used throughout
migrations 092–100 and it is why none of them needed a fix afterwards. Prod still holds **zero
employer profiles**, and the operator's requirement is that the first real employer is the first
row in the table.
