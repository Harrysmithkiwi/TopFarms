# Ruling — the admin metric scale, and the imported analytics spec

**Date:** 2026-08-15
**Scope:** gated portals (admin, employer, seeker). Canon is `docs/DESIGN.md`.
**Trigger:** (a) an external "clean analytics UI system" spec proposed for the admin dashboard;
(b) the open item in `.impeccable/critique/ignore.md` §2 stating that the admin KPI numeric
scale "is undeclared in either place and needs a ruling, not an ignore entry."

---

## 1. The open item is STALE. Close it.

`ignore.md` §2 records: *"The admin KPI numeric scale (24px at `DailyBriefing.tsx:143,320,326`,
28px elsewhere) is undeclared in either place and needs a ruling."*

**Verified 2026-08-15 — that is no longer true, and the 28px part was never true of admin.**

`Metric` is fully declared, in both places the detector and a human read:

- YAML, `docs/DESIGN.md:68-72` — `fontSize: 24px`, `fontWeight: 600`, `lineHeight: 28px`,
  `letterSpacing: 0`
- Prose ramp, `docs/DESIGN.md:235` — *"**Metric** (600, 24/28, `tabular-nums`): The one big number
  in a KPI or summary card. **Not a heading** — a figure."*

And every admin site applies it correctly, `tabular-nums` included:

| Site | Size / weight | `tabular-nums` |
|---|---|---|
| `components/admin/KpiCard.tsx:64-65` | 24px / 600, `leading-7` (=28px) | ✅ `:65` |
| `pages/admin/DailyBriefing.tsx:147-148` | 24px / 600 | ✅ `:148` |
| `pages/admin/DailyBriefing.tsx:326` | 24px / 600 | ✅ `:322` |
| `pages/admin/DailyBriefing.tsx:332` | 24px / 600 | ✅ `:275` |

**There is no undeclared 28px font-size in the admin tree.** Repo-wide there is exactly one
`text-[28px]` — `src/components/ui/SearchHero.tsx:59` — which sits on a public marketing surface
whose visual treatment is settled under `docs/design/v11-DIRECTIVE.md`. Per CLAUDE.md §10 a
**visual** finding there is discarded, not filed. The "28px" in the original note was almost
certainly the Metric *line-height* (24/28) read as a size.

**Ruling: no new token. `Metric` stands as declared. Retire `ignore.md` §2's closing paragraph.**

---

## 2. The imported analytics spec is REJECTED

Proposed:

> Metrics: Inter 18/24px Semi Bold, -0.1px letter spacing · Labels: Inter 12/16px Medium ·
> Filters: 28px height, 13/16px Medium, 6px radius · Cards: 14px radius, 16px side padding ·
> Charts: `#519DFA` lines, `#0077E6` bars · Text: `#333333` default, `#777777` subtle

Seven conflicts with canon, one of them an accessibility regression already paid for once:

| Proposed | Canon | Verdict |
|---|---|---|
| `#519DFA` lines, `#0077E6` bars | One accent, `#16A34A` (`DESIGN.md` §6) | **Breaks the One-Green Rule.** The largest conflict. |
| Labels / Filters at **Medium (500)** | *"Inter at 400 and 600 only. The two-weight ladder is deliberate"* (`:477`) | Rejected. |
| Metrics at **18px** | Ramp: 48/36/24/20/17/17/15/13/12/11 | 18px is off-ramp. |
| Filters **28px** height | 40px desktop / **44px mobile** (`:328`, `:409`) | Fails the tap target. |
| **6px** radius | 8px inputs/buttons (`:170`, `:328`) | Rejected. |
| **14px** card radius | 12px cards (`:170`, `:340`) | Rejected. |
| `#777777` subtle | `#5B6B5F` / `#8A968D` | **4.48:1 on white — under the 4.5:1 AA floor.** |

That last row is the one to dwell on. `#777777` on `#FFFFFF` computes to **4.48:1**, just under AA
for normal text — and `ignore.md` §5 records that `#8A968D` (3.08:1) was already darkened to
`#647268` (measured 5.03:1) for exactly this reason. Adopting `#777777` re-introduces a defect
this project has already diagnosed and fixed.

`#333333` passes contrast comfortably (12.6:1) but is a pure neutral; every text token here
carries a deliberate green undertone (`#0B1F10`, `#5B6B5F`). Mixing the two reads as two systems
sharing a page, which is precisely the failure `PRODUCT.md` Design Principle 1 (anti-chrome
paranoia) exists to catch.

### What *is* worth taking from it

The principle, not the numbers. *"Tight tokens keep dense dashboards readable"* agrees with
`PRODUCT.md`: **farmers value information density, not airiness.** Expressed in this system, the
same intent is already available:

- **Metrics** — 24px / 600 / 28px line-height / `tabular-nums`. Already canon, already applied.
- **Labels** — 12px, weight **600** (not 500).
- **Filters** — 40px desktop / 44px mobile, 8px radius.
- **Cards** — 12px radius.
- **Charts** — `#16A34A` with tints and opacity for series separation. Never a second hue.
- **Text** — `#0B1F10` default, `#5B6B5F` subtle.

---

## 3. What is genuinely still open

1. **24px used as a heading — role collision.** The ramp says Metric is *"not a heading — a
   figure"*. In-scope instance: `pages/admin/AdminLoginPage.tsx:76` (`text-2xl font-semibold` on a
   heading). `jobs/steps/JobStep1Basics.tsx:92,96,102` render "Free" / "Matched" / "30 days" at
   `text-2xl` — figures in a stat panel, so arguably legitimate Metric use, though "Matched" is a
   word and takes no `tabular-nums`. Marketing-surface instances (`Pricing`, `ForEmployers`,
   `JobDetail`) are out of scope.
2. **14px has no ruling.** 4 instances in the onboarding/job wizards
   (`Step8Complete.tsx:127`, `JobStep8Success.tsx:65,99,113`), plus 13 previously recorded in the
   admin tree. It sits between Small (13) and Body (15) and is declared in neither ramp.
   `DESIGN.md:265` sets the precedent — the 30px/24px drift was *"snapped to declared steps rather
   than adding two more."* Same treatment is indicated: snap 14px to 13px or 15px.
3. **16px already has a ruling in flight** — `.planning/NOW.md` records 18 gated-portal components
   using it, with the recommendation to add 16px/600 to the ramp (zero visual change). The 6
   instances the detector found in the wizards belong to that ruling, not to a new one.

---

## 4. Method note — the gate is measuring a fraction

Recorded here because it changes how much the CI design-gate ratchet is worth.

`detect.mjs` reads **arbitrary values** (`text-[14px]`, inline `style`) and does not see **named
Tailwind classes**. Measured on the two wizard directories, 2026-08-15:

| Drift | Actual | Detector caught |
|---|---|---|
| Off-ramp type | 10 arbitrary + **23 `text-lg`** (18px) + **6 `text-2xl`** (24px) = 39 | **10** |
| Non-canon green `#4A7C2F` | **15** across 12 files | **1** (the lone inline `style`) |

**≈11 of ~54.** A ratchet held at a fixed number is therefore measuring roughly a fifth of the
real drift, and a flat trend line reads as stability when it may be blindness. Not a defect in
the rule — a scope limit worth writing down before the number is trusted again.

`#4A7C2F` is the retired v1 fern. It appears in neither `docs/DESIGN.md` nor `src/index.css`, so
it violates the One-Green Rule rather than falling under it. Twelve files, three opacity variants
(0.04 / 0.06 / 0.1). A cleanup, not an ignore entry.
