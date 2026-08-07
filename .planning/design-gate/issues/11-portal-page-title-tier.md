# What size are employer and seeker page titles?

Type: grilling
Status: open

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
