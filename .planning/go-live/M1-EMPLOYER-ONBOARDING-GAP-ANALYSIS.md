# §3 Employer onboarding — driven end to end, gap analysis

**Run:** 2026-08-08, against **live production** (`www.topfarms.co.nz`), post-merge-train.
**Account:** `harry.symmans.smith+ci-employer@gmail.com` — genuinely never onboarded before
this run (`employer_profiles` had **0 rows** for it at start). This is the real cold-start
path, not a simulation of one.
**Method:** Playwright driving the live wizard with the project's own auth harness, axe-core
per step, network and console captured per step, plus source and database reads to confirm
each finding. Screenshots of all 8 steps in the session scratchpad.
**Outcome:** all 8 steps completed. Profile row now exists, `onboarding_step = 8`.

The wizard **works** — a determined operator gets through it. Everything below is about what
it costs them to get there, and what it says while they do.

---

## 1. The wizard sells a subscription that no longer exists — 🔴 **ship-stopper for outreach**

**Step 6 tells the employer:** *"Listing jobs is free. All of them, always. No card required."*
Correct, and exactly directive 1.19.

**Step 7, two clicks later, presents a billing-period control:**

> **Billing period**   Monthly ( ) Annual   — with a **"Save 20%"** badge when Annual is on

`src/pages/onboarding/steps/Step7Preview.tsx:205-239`. It is live, it is interactive, and it
persists: `billing_period` was written as `"monthly"` on my run, confirmed in the database.

Pricing v3 retired subscriptions altogether — free unlimited listings, one banded placement
fee of `$200-800` only on a hire. **There is no monthly plan, no annual plan and no 20%
saving to offer.** So the employer is told "free, no card" and then immediately asked to pick
a billing cadence and nudged toward annual with a discount that does not exist.

This shipped to production in merge ③ yesterday. It is the single thing on this list that can
directly cost a conversion, because it lands on the exact screen where the employer decides
whether this business is straight with them. **M3's outreach should not go out with this
live.**

*Effort: small — delete the block and the `billing_period` plumbing, or hide it pending a
product decision. The column can stay; nothing else reads it meaningfully.*

## 2. Farm type is asked twice, through two different data models — 🟠 real friction

Step 1 is a full-screen question: *"What type of farm do you operate?"* → writes **`farm_type`**,
a singular `z.enum` (`Step1FarmType.tsx:15`).

Step 2 asks again, as multi-select chips under *"Farm type \*"* → requires **`farm_types`**, a
`z.array(z.string()).min(1, 'Select at least one farm type')` (`Step2FarmDetails.tsx:13`),
defaulting to `[]` (`:69`).

They are different columns and step 1's answer does not satisfy step 2. Verified in the
database mid-run: `farm_type: "dairy"` saved, `farm_types: null`, and step 2 still refusing to
advance with *"Select at least one farm type"*. After completion both are populated —
`farm_type: "dairy"` **and** `farm_types: ["dairy"]` — the same fact stored twice.

A real employer answers the same question twice in ninety seconds and, if they miss the chips,
is blocked by an error naming a field they believe they already filled.

*Effort: small — seed `farm_types` from `farm_type` when the profile loads, or drop step 1's
question and let step 2 own it.*

## 3. Five unnamed switches — 🔴 **critical** on axe, and never scanned before

axe reports **`button-name` / critical**: 4 nodes on step 4 (Work & Accommodation), 1 on step 7
(the billing toggle above). All are the same component:

```html
<button type="button" role="switch" aria-checked="false" data-state="unchecked" value="on" …>
```

`role="switch"` with state but **no accessible name**. A screen-reader user hears *"switch,
unchecked"* five times and cannot tell what any of them control — accommodation, vehicle,
broadband, and the billing period.

**Why nothing caught it:** `tests/e2e/a11y.spec.ts` scans `/onboarding/seeker` and never
`/onboarding/employer` (line 98). The entire employer wizard has been outside the a11y sweep,
so a critical violation sat on the employer funnel unseen. Per `CLAUDE.md` §10 accessibility
is in scope on any surface, and this is a gated portal.

*Effort: small — an `aria-label` on each `Toggle`, plus adding the employer wizard to the
sweep so it cannot regress. The second half matters more than the first.*

## 4. Selection state is invisible to assistive tech in places — 🟠

`ChipSelector` — the control behind the **required** `farm_types` and `shed_type` fields —
contains **zero** aria attributes and zero roles (`grep -c "aria-\|role=" ChipSelector.tsx`
→ `0`). Measured live: step 2 had **18 option controls, 0 carrying any selection state**; step
5 had 5 with 0. Steps 3 and 4 were better (2/2 and 5/11), so this is inconsistent rather than
universal.

Sighted users see a border change. Non-sighted users get no selected/unselected state at all
on fields they are required to complete.

*Effort: small — `role="group"` on the container, `aria-pressed` on each chip.*

## 5. Errors are visible but not programmatically associated — 🟠

`Select` renders its error as a plain sibling `<p>` (`Select.tsx:109`) and sets neither
`aria-invalid` nor `aria-describedby` (`:52` carries only `aria-label`). Text inputs marked
required in their visible label — *"Farm name \*"* — report `required: false` and
`aria-required: null` in the DOM. So required-ness and failure are both **visual-only**:
native validation never fires, and a screen reader announces neither.

*Effort: small, and it is the same edit as #4 — one pass over the shared form primitives fixes
#3, #4 and #5 together.*

## 6. Smaller, still real

- **`406` on `GET /rest/v1/employer_profiles`** on first load for an employer with no profile
  row yet — i.e. every genuinely new employer sees a console error on their first screen.
  Functionally harmless (PostgREST's "no rows" for a `.single()`), but it is noise on the
  cold-start path and indistinguishable from a real failure in logs.
- **`color-contrast` / serious ×1** on step 8, the completion screen.
- **`landmark-unique` / moderate** on **every** step of the wizard.
- **Heading scale drifts at the end:** `h1` is a consistent 20px throughout (ruling 11 holds),
  `h2` is 18px on steps 1–7 and **24px** on step 8.
- **Step 5 is genuinely good** — *"Continue — you can do this later"* makes verification
  skippable without making it feel optional-forever. Worth preserving.
- **Step 6's pricing copy is correct** and matches v3: free listings, `$200/$400/$800` bands,
  the guarantee. The problem is step 7 contradicting it, not step 6.

---

## What I got wrong, and corrected

Recorded because a gap analysis that hides its own false starts is not trustworthy.

1. **"The region select has no accessible name."** Wrong. I was reading Radix's hidden
   form-compat `<select>`, not the control the user operates. The real control is the shared
   `Select` with `label="Region *"`. axe's `select-name` rule reported 0 applicable nodes and
   axe was right; I was not.
2. **"The region field shows Northland but the app demands a region."** Wrong, same cause —
   the hidden mirror defaults to the first option while the visible combobox correctly shows
   the placeholder *"Select a region"*.
3. **"Step 1's Continue silently does nothing with no error."** Almost certainly wrong: my
   probe searched for `.text-red-500`, and the app uses `.text-danger`. Step 1 does render
   `errors.farm_type` (`Step1FarmType.tsx:151`). The *validation-blocks-advance* half of that
   observation stands; the *no feedback* half does not.

## What this run could not establish

- **Whether it feels right.** Everything above is mechanical. Whether a working farmer
  finishes this wizard at 6am is the operator's judgement and is not answered here.
- **§4 payment.** Not reached — it needs a posted job, and posting to the live board is
  inventory, which §1.15 governs. Deliberately not done.
- **Mobile.** The whole run was 1280×1000. The wizard has never been walked at 360px.
- **Real-world data.** My inputs were plausible but scripted; `herd_size` landed as `0`, which
  is my filler's doing, not a product defect.

## Suggested order

1. **#1 (billing toggle)** — before M3 outreach. It is the only item that actively misleads.
2. **#2 (double farm type)** — before outreach too; it is the friction most likely to lose
   someone mid-form.
3. **#3/#4/#5 as one pass** over `Toggle`, `ChipSelector` and `Select`, plus **adding
   `/onboarding/employer` to the a11y sweep** — the sweep gap is why #3 was invisible, and it
   will hide the next one too.
4. #6 items as polish.

## State left behind

The `+ci-employer` profile is now **completed** (`onboarding_step = 8`), named
`UAT TEST Farm — Te Awamutu (delete me)`, Waikato, rotary, salary band 65–95k. That means the
cold-start first-run state is **used up** — re-walking it needs the row reset
(`onboarding_step = 0` and the fields cleared) rather than a new account, since the `+ci-*`
accounts must survive ticket 04's purge. No job was posted, so the public board is unchanged
and prod inventory is still 0.
