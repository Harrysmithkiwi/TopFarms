# What size are employer and seeker page titles?

Type: grilling
Status: resolved

## Question

Graduated from [02](02-admin-page-title-exception.md), which ruled admin's 20px correct and
deliberately declined to rule on the other two portals rather than restyle twelve
customer-facing pages inside a typography pass.

Measured state across the gated portals:

| Surface | Size | Treatment |
|---|---|---|
| Admin (11 screens) | 20px | `text-text` — **declared correct, `02`** |
| Employer/seeker dashboards (10) | 30px `text-3xl` | `font-display`, `text-brand-900` |
| Onboarding (2) | 24px `text-2xl` | `font-display` |
| `docs/DESIGN.md` §3 Headline | 36px | — |

Two things need deciding, and the second matters more than the first.

**Size.** 30px and 24px are both off the ramp (Tailwind defaults, not design-system steps).
Options: snap both to **Headline 36/44** as canon already says; declare a portal tier at 30 and
add it as a step; or collapse dashboards and onboarding to one value. Note 24px is now the
**Metric** step (`01`) — using it for a page title as well would make one size mean two things.

**Treatment.** Employer/seeker page titles are `font-display` and `text-brand-900`; admin's are
`font-body` weight and `text-text`. That is a bigger divergence than the size: a signed-in user
moving between portals sees a different typographic voice for the same kind of element. Is the
brand-coloured display title deliberate warmth for customer-facing surfaces, or drift from the
Phase 5 port? `docs/DESIGN.md` §3 says Inter does every job at a disciplined weight ladder,
which does not obviously license a second face for titles.

**Cost of getting it wrong:** this is twelve pages real customers use daily. Unlike the admin
ruling, nobody can absorb a bad call here quietly.

## Answer

Resolved 2026-08-07. Ruled with the pages open in a browser, not from the source.

**Two corrections to what `02` recorded, both from measuring the rendered page:**

1. **There is no second typeface.** `02` said employer/seeker titles are `font-display` and
   implied a different face. Computed style says **Inter** — `font-display` resolves to the same
   family. The One-Family Rule was never broken.
2. **This was never drift.** It is an *undocumented system*, and a completely consistent one:

| Axis | Pattern | Consistency |
|---|---|---|
| Size by page **kind** | dashboards/lists/detail 30px · wizards 24px | 10/10 · 3/3 |
| Colour by **audience** | seeker `brand-900` · employer inherits | 6/6 · 7/7 |

Two systems nobody wrote down. 6-of-6 and 7-of-7 is not accident.

### Ruling

**Keep the system; express it in declared steps.** Adding a 30px step to match what shipped
would be declaring drift as canon — the failure `02` avoided by not blessing 20px universally,
and the one §6's anti-drift rules exist to prevent.

| Surface | Was | Now |
|---|---|---|
| Employer/seeker dashboards, lists, detail | 30px | **Headline 36/44** |
| Any portal wizard or multi-step flow | 24px | **Title 20/28** |
| Admin | 20px | unchanged (`02`) |

The two-tier relationship survives — a dashboard title is the only orienting element on the
page, while a wizard already carries a step indicator and its own progress chrome. And the
wizard tier **had** to move regardless: 24px is now the **Metric** step from `01`, and one size
cannot mean two things.

**Colour is recorded, not changed.** Seeker titles stay `brand-900`, employer and admin inherit
`--color-text`. It ships consistently on both sides, and it is the same warm-to-workers
instinct the product voice carries elsewhere. Written into `docs/DESIGN.md` §3 so the next
audit does not file it.

### The thing the ruling nearly broke

A first pass changed **19** sites, not 13. The class string `font-display text-3xl
font-semibold` also matched six `<p>` elements — which turned out to be the **KPI numbers** on
the seeker and employer dashboards (`Active Applications`, `Profile Views`, `Active Listings`,
`Total Views`). Making them 36px would have been badly wrong.

They are the **Metric** role, so they went to 24/28 — which means **`01`'s ruling reaches
further than admin**. The whole product now has one numeral scale, and those cards are
structurally identical to admin's `KpiCard` (uppercase label, big figure, in a `Card`). Logged
for the shared pass in `06`: that is a shared component waiting to be extracted.

### Verified

13 `h1` sites at the declared sizes; `36px` appears on nothing but an `h1`. `tsc -b` 0, vitest
640 passed, lint 0 errors / 54 warnings (pin held). Browser-checked on the seeker dashboard,
applications and documents at 1280px: the title reads confidently with the page's air, the
24px KPI numerals now match admin's exactly, no layout break.

**Not visually verified:** the three wizards (the test seeker is already onboarded, so
`/onboarding/seeker` bounces to the dashboard) and every employer page (**no employer
credential exists anywhere** — see `09`). Both need a look before merge.

### For ticket 07, measured while here

Whole-`src` detector: **118 findings — 90 in gated portals, 28 on marketing surfaces** that
ruling `10` puts out of scope for visual findings. A CI gate that does not exclude marketing
paths counts 24% noise by policy on day one.
