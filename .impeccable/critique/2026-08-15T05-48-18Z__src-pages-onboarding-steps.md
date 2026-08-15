---
target: onboarding + job-posting wizards
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-15T05-48-18Z
slug: src-pages-onboarding-steps
---
Method: dual-agent (A: design review, source-only · B: detector evidence, isolated)

Scope: `src/pages/onboarding/steps/` (seeker + employer), `src/pages/jobs/steps/`, and the three
wizard containers. Gated-portal canon (`docs/DESIGN.md`). Marketing surfaces out of scope per
CLAUDE.md §10.

Provenance note: every P0/P1 below was independently re-verified in the parent context against
source before being filed. Findings marked *(agent-reported, unverified)* were not.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Saving…" renders at card top; every submit is at the bottom. Zero `aria-live` in 24 step files. |
| 2 | Match System / Real World | 3 | Strongest dimension. Raw enums leak to users (`cropping`) in both preview screens. |
| 3 | User Control and Freedom | 2 | "Save and finish later" exists in 1 of 3 wizards. Job-draft resume broken. |
| 4 | Consistency and Standards | 2 | Three labels for the same act; "Complete Profile" appears mid-flow twice. |
| 5 | Error Prevention | 3 | Sector-conditional schemas, date refine, salary min/max. Two destructive-save paths. |
| 6 | Recognition Rather Than Recall | 3 | DairyNZ overview is exemplary. Seeker gets no review before submitting 47 answers. |
| 7 | Flexibility and Efficiency | 2 | ~90% of fields optional, nothing says so. Farm profile prefills 2 of 6 repeated fields. |
| 8 | Aesthetic and Minimalist Design | 2 | No-Subtitle Rule broken 4×. One screen states the same reassurance 3×. |
| 9 | Error Recovery | 2 | No scroll-to-error anywhere. Three discarded error paths render as empty states. |
| 10 | Help and Documentation | 3 | InfoBoxes restrained and earned. Nothing explains why any question exists. |
| **Total** | | **24/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Authored in vocabulary, generic in shape.**

The content is unmistakably NZ farm hiring and it is load-bearing, not decoration: Rotary /
Herringbone / AMS / Swing-Over / Tiestall, Once-a-day (OAD), sharemilker and contract milker,
DairyNZ levels with descriptions, 2IC and Relief Milker, "e.g., Matamata", and the Federated
Farmers / Rabobank survey cited as the salary reference. That is Design Principle 2 working as
written — warmth through content, not chrome.

The shape is not. Strip the words and what remains is a stock 8-step SaaS onboarding: numbered
stepper, centred card, chips-and-toggles, review screen, success screen. The specific tell:
**101 discrete decisions across 16 screens before an employer sees a single candidate.** Xero
does not onboard in 29 fields. What would make this unmistakably TopFarms is not more farm
words — it is a form that assumes the user has twenty minutes before milking.

**Deterministic scan.** 11 findings, exit 2, on the two step directories; the three containers
came back clean (exit 0) and were verified as genuinely parsed, not skipped. **Zero false
positives** — every category the ignore list protects produced no findings, and ignore-list §2
(13px/17px) is confirmed retired at source: the YAML at `docs/DESIGN.md:29-89` now declares
`17px` and `13px`, and files using `text-[13px]` passed silently.

- `design-system-font-size` ×10 — 16px ×6, 14px ×4
- `design-system-color` ×1 — `rgba(74,124,47,0.1)` at `JobStep8Success.tsx:51`

**The detector is under-reporting by roughly 5×, and this is the finding that matters most
about the gate itself.** Verified in the parent context:

- **Colour:** `#4A7C2F` (the retired v1 fern) appears **15 times across 12 files**. The detector
  caught **1** — the inline `style={{}}` instance. The 14 Tailwind arbitrary-value forms
  (`bg-[rgba(74,124,47,0.06)]`) are invisible to the colour rule. The value appears in neither
  `docs/DESIGN.md` nor `src/index.css`, so this violates the One-Green Rule rather than falling
  under it.
- **Type:** the detector flagged 10 arbitrary-value sizes and **zero** of the 23 `text-lg` (18px)
  and 6 `text-2xl` (24px) uses in the same files — all equally off the ramp
  (48/36/24/20/17/17/15/13/12/11 declares no 18px, and assigns 24px to *Metric*, "not a heading").

**The gate is therefore seeing about 11 of ~54 drift instances.** CI's design-gate ratchet has
been ratcheting against a fraction of the real number, which reads as stability rather than as
blindness.

**Browser overlays: none.** No dev server was running, and these are gated routes requiring
authenticated seeker and employer sessions. No contrast, focus-ring or occlusion evidence exists
for this run; ignore-list §3–§6 were not exercised at all. **No overlay is visible in any tab.**

## Overall Impression

The domain thinking here is genuinely good and in places excellent — the money copy, the
privacy sentence, the sector-conditional schemas, the DairyNZ overview. The engineering
underneath is careful and its comments are honest. What is missing is any force pushing *back*
on length. Every step is individually defensible and the sum is not: a farmer with twenty
minutes before milking meets 101 decisions, four blank essay boxes, and two separate 24-checkbox
walls, and is never once told their work is saved.

The single biggest opportunity is not visual. `SeekerStep1FarmType.tsx:18-28` and
`SeekerOnboarding.tsx:221-228` both argue, correctly, that step 1 alone makes a seeker
matchable and everything after only sharpens the score. That argument is written in comments and
told to no one. Acting on it — one required screen, the rest earned later — would cut the
seeker funnel by 80% without losing a field.

## What's Working

**1. The money copy is the best thing in the product.** `Step6Pricing.tsx:37-79` and
`JobStep7Confirm.tsx:80-114` name the fee, the three bands, the exact trigger ("when you
shortlist someone, which is when their phone, email and CV unlock"), Net 14 terms, and the
guarantee *including its exclusion* ("Casual and relief work carries no guarantee"). It works
because an operationally sceptical farmer scans for what you are *not* saying, and there is
nothing left unsaid.

**2. Sector-conditional required fields, fixed at the schema level in both forms.** Cites the
matcher's actual behaviour (`v_shed_applicable`) so hiding the field costs the listing nothing.
A domain-correct fix rather than a form-correct one, with the reasoning written into both files
because they share no schema.

**3. The DairyNZ Levels Overview** (`SeekerStep3Qualifications.tsx:109-125`). All five levels and
their descriptions sit permanently beside the Select, so a second-language seeker who doesn't
know whether they're Level 3 or 4 can read and decide. It is the only place in 24 screens that
anticipates *not knowing the answer*.

## Priority Issues

### [P0] `JobStep3Skills` destroys saved skills on any re-entry — VERIFIED

**What.** The file imports only `useState` (no `useEffect`), initialises `selectedSkills` to `[]`
(`:32`), and its only `job_skills` operations are a delete (`:49`) and an insert (`:72`). It
never reads. Any employer returning to step 3 — via the preview's Edit link, via Back from step
4, or by reopening the wizard — sees an empty picker and, on Save & Continue, **wipes the skills
they already chose**.

**Why it matters.** Skills are a 20-point match dimension. The employer who does the responsible
thing — reviews the listing, edits an earlier section, walks forward — silently strips the
requirements matching is built on, gets worse candidates, and blames the product. It is
invisible in both directions: the preview then correctly reports "No skills selected", which
reads as the employer's own omission.

**Fix.** Port the shape that already exists at `SeekerStep4Skills.tsx:24-52` and `:110-120`: a
`useEffect` loading `job_skills(skill_id, requirement_level)` for `jobId`, a `prefillError`
state, and a refusal to submit while prefill failed. **Suggested command:** `/impeccable harden`

### [P0] `SeekerStep1` can null out a saved name and phone — VERIFIED

**What.** `:55` destructures `.then(({ data }) => …)` and discards `error`; `if (cancelled ||
!data) return` leaves the three inputs empty on a failed read. `handleSubmit` at `:96-99` then
UPDATEs `first_name / last_name / phone` to `firstName.trim() || null` — writing **null**. The
step is re-entered on every resume at step 0 and every Back from step 2.

**Why it matters.** These are exactly the three fields the employer's $200–800 placement fee
unlocks. The comment at `:74-86` records that this data was already silently lost once on live
prod. The same failure is one dropped packet away — on the seeker's phone, on rural data, which
is the connection profile `docs/PRODUCT.md` tells us to design for.

**Fix.** Read `error` from the prefill; on failure set a flag and skip the UPDATE entirely,
advancing regardless (the profile upsert is independent). Four lines, matching a guard the
codebase already trusts one file over. **Suggested command:** `/impeccable harden`

### [P1] Job-draft resume is broken, and nothing says work is saved — VERIFIED

**What.** `useWizard.ts:26` reads `initialStep` only inside `useState`'s initialiser, captured on
first render. `PostJob.tsx:221` calls `setInitialStep(1)` after the fetch resolves — too late.
Both onboarding containers work around this by *also* calling `wizard.goToStep(resumeStep)`
(`SeekerOnboarding.tsx:84-85`, `EmployerOnboarding.tsx:110-111`); `PostJob`'s only `goToStep` is
the preview's Edit handler at `:523`. **Every employer resuming a draft restarts at Basics.**
Separately, "Save and finish later" exists only in `SeekerOnboarding.tsx:229`, only from step 2.

**Why it matters.** This is the 6am question exactly. A farmer with twenty minutes will start
something they can stop. Nothing on screen says stopping is safe, and in the job wizard stopping
is actively punished.

**Fix.** Add `wizard.goToStep(...)` beside `setInitialStep` — or better, drop `initialStep` from
the hook contract so one pattern serves all three callers. Add the seeker's "Save and finish
later" to the other two wizards. Replace the transient "Saving…" with a persistent "Saved as you
go" beside the step indicator. **Suggested command:** `/impeccable harden`

### [P1] Step 4 of both employer wizards is five topics under one heading, with no rendered structure

**What.** `Step4Accommodation.tsx` renders 12 controls spanning career development, hiring
cadence, couples, accommodation, vehicle, broadband and salary under one h2 (`:89`). The section
boundaries exist **only as code comments** (`:95`, `:165`, `:283`). `JobStep2FarmDetails.tsx`
does the same with 17 controls. Neither renders an `h3`. `docs/DESIGN.md` §5 lists "a heading for
each region of content" in the **blocking** set.

**Why it matters.** Farmers value density — but density only works chunked. Undivided density is
a wall, and someone scanning on a phone after milking has no landmarks. A screen-reader user has
an outline that actively lies about the page.

**Fix.** Render the existing sections as `h3` with a `border-t` — the grouping is already in the
source, it simply isn't drawn. No new fields, no new steps. **Suggested command:**
`/impeccable layout`

### [P1] The four required states are largely absent at step level

**What.** Verified: **0** occurrences of `aria-live` or `role="status"` across both wizard trees,
where §5 requires every skeleton to pair with a polite live region. **No unauthorised state in
any of the 24 step components** — `ProtectedRoute` covers wrong-role but not session expiry
mid-wizard, and `SeekerOnboarding.tsx:138` / `EmployerOnboarding.tsx:153` both return silently,
leaving Continue a dead button. Five bare centred spinners where §5 demands skeletons
(`SkillsPicker.tsx:118` is the only correct one). Three discarded error paths render as ordinary
empty states (`SeekerStep1:55`, `SeekerStep7Complete:66`, `JobStep8Success:26`).

**Why it matters.** §5 makes a missing state a functional defect, not a polish item. Silent
session expiry on a long form is data loss with no message.

**Fix.** One live region per container; convert the five spinners to shape-matching skeletons;
surface expiry as an explicit unauthorised state. **Suggested command:** `/impeccable harden`

### [P2] The seeker is asked where they want to work twice, from two different lists — and the second overwrites the first

**What.** `SeekerStep1FarmType.tsx:185` asks for region as a **required** Select over 16 NZ
regions. `SeekerStep5LifeSituation.tsx:175` asks "Preferred regions" over **8**. `SeekerStep5`'s
submit then writes `region: data.preferred_regions?.[0]` — so a Hawke's Bay seeker who adds
Waikato as a preference has their profile region flipped to Waikato. *(agent-reported; the
divergent option lists and the derived write were not independently re-verified in the parent.)*

**Why it matters.** Region carries real weight in the score (20 points). Second-language readers
will read the second question as the same question. Eight regions' workers cannot state their
own.

**Fix.** Delete the step-5 field and let step 1 stand, or extend the list to 16 and stop deriving
`region` from `preferred_regions[0]`. **Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Jordan (confused first-timer)**
- `Step5Verification.tsx:124, :131, :138` — three "Start now" buttons wired to `onStart={() => {}}`.
  **Verified: they do nothing.** Jordan taps twice and concludes the verification story is fake.
- `SeekerStep4Skills.tsx:135` — "Your skills" above 24 checkboxes with no instruction, no count
  guidance, no signal that zero is valid. The job wizard *does* instruct; the seeker gets nothing.
- `Step4Accommodation.tsx` — 12 fields, zero asterisks, zero "optional" markers. Nothing separates
  "you may skip all of this" from "you must answer all of this."
- `Step7Preview.tsx:109` — a cropping/deer/mixed employer sees the raw enum in their own review.

**Casey (distracted mobile — the seeker's real device)**
- `Toggle.tsx:45` — **verified 34×18px**, ten of them across these wizards, against
  `docs/PRODUCT.md`'s enforced 44×44 on the seeker's primary device.
- `StepIndicator.tsx:46-57` hides every label below `sm` — seven bare numbered circles on a phone,
  and the "Step 3 of 7" string §5 specifies is rendered at no breakpoint.
- `JobStep5Description.tsx:66` — four `resize-none` textareas, up to 1,375 characters, one-handed.
- `SeekerStep7Complete.tsx:46` — ten polls over 30 seconds on rural data at the emotional peak,
  with `error` discarded so failure and waiting look identical.
- The "Saving…" indicator sits at card top while every submit sits at the bottom.

**Sam (accessibility-dependent)**
- **Zero live regions across all 24 step files (verified).** Every save, load and publish is silent.
- `SkillsPicker.tsx:140` emits `h4` directly beneath the step's `h2`, skipping `h3`.
- `Step1FarmType.tsx:115` puts an `<h3>` inside each of six `<button>`s — six headings injected
  into the outline.
- Toast-only error recovery in three places; Sonner auto-dismisses, leaving no persistent record.
- `JobStep6Preview.tsx` ships a toast *and* an inline message for the same failure — §5 forbids
  this explicitly — and the inline one offers no retry.

## Minor Observations

- `JobStep5Description.tsx:56` reads `var(--color-clay)` for the near-limit counter. **Verified:
  `--color-clay` is declared nowhere** — the warning colour resolves to nothing and silently
  inherits.
- `Step7Preview.tsx` omits 9 of the 12 answers from `Step4Accommodation`. "Review your profile"
  reviews about half of it.
- Three independent copies of the NZ region list, plus a divergent 8-entry fourth.
- `SeekerStep7Complete.tsx:112` and `Step8Complete.tsx:54` place the success checkmark on
  `--color-warn-bg` (amber) — success wearing the warn token, at the peak of both journeys.
- `JobStep7Confirm.tsx:51` auto-advances on a fixed 1200 ms timer with no cancel.
- `Step5Verification.tsx` states "you can complete these later" three times (`:87`, `:146`, `:157`).
- The No-Subtitle Rule is broken at `JobStep1Basics:116`, `JobStep4Compensation:112`,
  `JobStep2FarmDetails:126`, `PostJob:401`.
- 16px is already an open ruling in `NOW.md` (18 gated-portal components, recommendation: add it
  to the ramp, zero visual change). The 6 wizard instances belong to that ruling. **14px does not**
  — it has no ruling behind it, and the retired ignore entry recorded 14px×13 in the admin tree.

## Questions to Consider

1. **Step 1 alone makes a seeker matchable, and the code says so twice.** Why is that a comment
   instead of a screen? What breaks if the seeker wizard is *one required screen* plus a dashboard
   prompt reading "Add your shed experience — it's worth 20 points on your matches"?
2. **The employer answers herd size, shed type, breed, calving system, nearest town and distance
   during onboarding, then answers all six again in the job wizard — and `PostJob` prefills only
   two.** If the farm profile can't fill in the job, what is the farm profile for?
3. **Twenty-four skill checkboxes appear in both wizards, and in neither are they required.** If
   the same wall is optional twice, is it a step — or a patience filter? Is that the population you
   want in a marketplace whose competition is a Facebook group?
