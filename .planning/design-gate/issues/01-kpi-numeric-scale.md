# Admin KPI numeric scale is declared nowhere

Type: grilling
Status: open

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
