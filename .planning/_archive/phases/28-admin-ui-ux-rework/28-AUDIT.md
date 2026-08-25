# Phase 28 — Admin Dashboard Design Audit (GATE 1 artifact)

**Date:** 2026-06-28 · **Surfaces:** Daily Briefing, Lead Staging, Outreach, Leads, Admin Login
**Lens:** `frontend-design` craft **bound to** the v2 system (`src/index.css` tokens +
`Brand_and_Design.md`). Conform, don't reinvent. No generic-SaaS drift.

## Method + reference
**Daily Briefing (`DailyBriefing.tsx`) is the in-house standard** — it already does it right:
`h1` = `text-[20px] leading-7 font-semibold` (`-0.01em`); section labels = `text-xs uppercase
font-semibold` `text-subtle` `0.04em`; `Card` surfaces; `Tag` badges; `StatsStrip`; disciplined
type scale (20 / xs / 13 / 24); `space-y-6` page rhythm. **The fix is to bring the lead surfaces
up to this**, not invent something new. The lead pages were built off-roadmap and drifted.

---

## A. Cross-cutting issues (all lead surfaces)

| # | Issue | Where | Should use |
|---|---|---|---|
| **C1** | **Column misalignment** — `AdminTable` `<th>` is `px-4`; the lead pages' `renderRow` `<td>` is `px-3`. Headers and body cells are 4px out of register on every lead table. | AdminLeads / Staging / Outreach `renderRow` | `px-4` cells to match `AdminTable` headers |
| **C2** | **Detail-view pattern divergence** — leads use a hand-rolled inline panel above the table (`bg-surface border-brand rounded-[12px] border-2 p-5`, a heavy 2px green box). The established admin pattern (Phase 20-05/06/07: Employer/Seeker/Jobs lists) is **`ProfileDrawer`** (right-side). | all 3 lead pages | Unify on one pattern — recommend `ProfileDrawer` (consistency) or a `Card`-based panel; drop the `border-2` green box |
| **C3** | **Hand-rolled badges + warn-overload** — badges are inline `border-warn text-warn` divs; `Tag` primitive is unused here. `warn` (amber) is overloaded for **3 unrelated meanings**: recruiter-placed, Lane B, overseas. Dilutes semantics. | Staging / Outreach / Leads | `Tag` primitive; reassign variants — reserve `warn` for genuine caution; recruiter → neutral/`info`, overseas → `info`, Lane A/B → a deliberate pair |
| **C4** | **Emoji / text-glyph iconography** — `🥛 🐄 🌏 💰 ↻` and `✉ ☎ 🔗` (LeadContact). Reads casual; inconsistent with the "modern Kiwi trade tool" voice and the lucide icon set used everywhere else (sidebar etc.). | Staging / Outreach / Leads / LeadContact | `lucide-react` icons (Mail, Phone, Link, MapPin, DollarSign, RefreshCw…) — already a dependency |
| **C5** | **Section-label drift** — lead panels use `text-[11px] tracking-wide` `text-muted`; Daily Briefing uses `text-xs uppercase tracking-wider` `text-subtle` `0.04em`. | lead detail panels | the Daily-Briefing label token |
| **C6** | **Type-scale sprawl** — lead pages introduce `text-[11px]/[13px]/[15px]/[20px]/[30px]/[32px]` ad hoc vs Daily Briefing's disciplined 20 / xs / 13 / 24. | all lead pages | a documented 5-step scale (h1 20 · label xs · body 13–14 · emphasis 24 · numerals tabular) |
| **C7** | **Inconsistent page header** — AdminLeads + Outreach have an intro `<p>`; Lead Staging has none. | Staging | standard `h1` + one-line description on every surface |

---

## B. Per-surface notes

**Daily Briefing** — the reference; minimal work. Tiny: System Alerts table cells are `py-2` with
no horizontal padding (flush-left); align to the standard table cell padding for consistency.

**Lead Staging** — heaviest rework. Two large capture blocks (`PastePanel` + `CaptureForm`) stack
**above** the queue, pushing the primary work (the review queue) below the fold. Information
hierarchy is inverted: capture is secondary, the queue is the job. Plus C1–C7 (px-3 cells, emoji FB
fields, hand-rolled badges, 11px labels, inline green panel). **Direction: make the queue primary**
— demote capture to a "Capture" affordance (button → panel/modal), and move row detail into the
unified drawer/Card.

**Outreach** — the draft editor is good; the state-action row is a flex-wrap of mixed button styles
(ghost / border / brand / warn) without a clear primary/secondary rhythm. Same C1–C5. **Direction:**
a clear action hierarchy (one primary per state), `Button` variants, lucide icons, Tag for status.

**Leads** — the detail panel stacks status quick-buttons + categorise form + conversion linking
densely; reads cluttered. Same C1–C5. **Direction:** group into labelled sections within the unified
detail surface; consistent control styling.

**Admin Login** — clean and on-brand already; missing **P-9** (no password show/hide). Confirm token
conformance on the inline `role="alert"` error (uses `--color-danger` tokens — good).

---

## C. The specific punch-list fixes (land within the new language)

- **P-5 / ADMINUX-02** — display-name shows a raw listing headline ("110ha Pivot-Irrigated Dairy
  Farm, Rotherham"). Format the card title: prefer a business/farm name; truncate the descriptive
  headline; surface locality separately (P-8). *May* warrant an `emit_leads` prompt tweak so
  `display_name` prefers a name over a headline → **Edge Fn redeploy = GATE 2** (isolate + surface).
- **P-8 / ADMINUX-03** — surface the **locality** (e.g. "Tirohanga") alongside region on cards/rows
  (currently only "Waikato" shows). Locality is in the post / structured fields.
- **P-9 / ADMINUX-04** — add a show/hide **eye toggle** to the admin-login password field; mirror the
  existing SignUp password-toggle pattern.
- **P-10 / ADMINUX-03** — on a search hit, show the **matched term** on the row (today a "Tirohanga"
  search returns a row showing only "Waikato"). Surface locality on the row so the match is legible.

---

## D. Proposed direction (decisions to approve at GATE 1)

1. **Adopt Daily Briefing's visual language as the admin standard** across all lead surfaces:
   token-driven `h1`, uppercase section labels, `Card` surfaces, `Tag` badges, the 5-step type
   scale, `space-y-6` rhythm.
2. **Unify row-detail on `ProfileDrawer`** (the established Phase-20 admin pattern) — replace the
   inline `border-2` green panels on all three lead pages. *(If you'd rather keep an inline panel,
   say so — I'll standardise on a `Card`-based one instead. Drawer is my recommendation for
   consistency with Employer/Seeker/Jobs.)*
3. **Iconography:** replace all emoji/text-glyphs with `lucide-react` icons; replace hand-rolled
   badges with `Tag`; **fix the `warn` overload** (recruiter → neutral/info, overseas → info, reserve
   amber for caution; Lane A/B a deliberate green/neutral pair).
4. **Alignment + scale hygiene:** `px-4` cells, standard section labels, documented type scale,
   consistent page headers — applied uniformly.
5. **Lead Staging hierarchy:** make the **queue primary**; demote capture (PastePanel + CaptureForm)
   to a "Capture" button that opens a panel/modal.
6. **Land P-5 / P-8 / P-9 / P-10** within this language.

**Strictly conformant:** one green (`#16A34A` + the two darker shades + `#E8F5EC` tint), Inter,
tinted neutrals, 4-pt spacing, 8/12/16 radii, existing primitives. No new colours, fonts, or
generic-SaaS chrome.

### Open questions for you (steer at GATE 1)
- **Q1 — detail pattern:** `ProfileDrawer` (recommended, matches rest of admin) or a `Card`-based
  inline panel?
- **Q2 — Lead Staging capture:** demote capture to a button/modal so the queue is primary (recommended)
  — or keep capture inline but visually lighter?
- **Q3 — scope depth:** full rework of all four surfaces now, or Lead Staging + Outreach first
  (the active lead-work surfaces) and Daily Briefing/Leads as a lighter pass? (Recommended: all
  four, but Daily Briefing is near-compliant so it's a light touch.)
