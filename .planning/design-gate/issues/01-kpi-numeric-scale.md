# Admin KPI numeric scale is declared nowhere

Type: grilling
Status: resolved

## Question

The admin KPI numerals ship at **24px and 28px**. Neither size exists in the machine-readable
YAML at `docs/DESIGN.md:29-58` **nor** in the prose ramp at `:198-205`. They are not drift
against a declared step — there is no step.

Declared ramp after the Gate A fix: 48 / 36 / 20 / 17 / 15 / 13 / 12.

Decide one of:
- **Add a step** (e.g. a `metric` role at 24 or 28) to both the YAML and the prose ramp, and
  snap all admin numerals to it. Two sizes become one.
- **Snap to existing steps** — 20px (title) is the nearest declared size. Changes how every
  KPI card reads; the numbers get quieter.
- **Declare the numerals exempt** — a documented exception, as with the page-title case in
  `02`.

Evidence: 24px at `DailyBriefing.tsx:143,320,326`; 28px on the KPI values. 24px accounts for
3 of the 27 surviving detector findings on the admin tree.

**This blocks `07`** — the CI gate cannot go green while sizes the design system never
declared are firing as findings.

## Answer

Resolved 2026-08-07, together with `02` — both amend the same ramp.

**The ticket asked about two numbers; the real finding is that the doc's ramp is not the ramp
the code implements.** `src/index.css` has declared `--text-micro: 11px/14px` and
`--text-label: 13px/16px` since Phase 5.2. Neither appears in `docs/DESIGN.md`. This is the
same defect class Gate A found between the YAML block and the prose ramp, one layer down —
and `DESIGN.md` already states that `src/index.css` wins.

So 11px was never drift. It is a shipped token the design doc failed to list, and every
detector finding against it was a false positive of the same kind that cost 67 findings before.

### Ruling

1. **Add a `Metric` step: 600, 24/28, `tabular-nums`.** The big figure in a KPI or summary
   card — a figure, not a heading.
2. **One numeral size, not two.** `KpiCard` shipped the product's only 28px; `DailyBriefing`'s
   three summary figures shipped 24px. Same job, two sizes, neither declared. `KpiCard` snaps
   to 24 and the three become compliant unchanged. **One code line.**
3. **Declare `Micro` (600, 11/14, 0.04em)** — documenting the existing `text-micro` token, not
   inventing a step. Scoped explicitly to fragments: *"an uppercase sentence at 11px is outside
   this step, not an instance of it"*, which keeps Assessment B's `all-caps-body` finding
   against the 33-character KPI label alive rather than laundering it.
4. **State that the theme is the authority on what a step is**, the same way it already wins on
   hex, so the next person reconciles toward `index.css` rather than away from it.
5. **Both the YAML block and the prose ramp**, always. That was Gate A's lesson.

### Measured effect

Detector on `src/pages/admin` + `src/components/admin`: **27 → 14**.

Remaining is almost entirely one value: **12 × `14px`** (Tailwind's `text-sm`, which falls
between the ramp's Small 13 and Body 15), plus one 22px and one 18px. Whole-`src` count is
**119** — the number `07` has to pin against, and the reason `07` should not be wired before
the 14px question is ruled.

### Recorded, not fixed

- **`--text-label` is 13/16 while the prose ramp's Small is 13/20** — same size, different
  leading, two different jobs. Reconcile deliberately; changing a line-height moves layout
  everywhere.
- **The 14px group.** A real ruling of the same shape as this one, and the largest remaining
  source of detector noise. Not in this ticket's scope.

### Verified

`tsc -b` 0, vitest 637 passed, lint 0 errors / 54 warnings (pin held). Browser-checked on
`/admin`: one numeral size across the page, KPI card heights still equal, no layout shift.
