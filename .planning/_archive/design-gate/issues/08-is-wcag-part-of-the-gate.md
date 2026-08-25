# Is WCAG AA a pass/fail condition of the gate, or adjacent to it?

Type: grilling
Status: resolved

## Question

Gate A's browser pass measured accessibility properly for the first time and the results split
hard:

**Passing, measured:** 0 contrast failures at 1440 and 390; focus rings settle at 4.57:1;
0 horizontal overflow; 0 occurrences of the Tailwind v4 `outline-none` trap.

**Failing, on the portal's landing screen:** one `h1` and zero `h2`–`h6` across six regions of
content, so screen-reader heading navigation does not exist; the only content tab stop is an
`svg` with `role="application"` and an empty `<title>`; table `<th>`s with `scope=null` and no
`<caption>`; 14 unlabelled decorative icons; no skip link; every mobile nav target 40px against
a 44px minimum.

`docs/DESIGN.md:164` says "the gate is not only visual… Authorisation, auth states, and state
coverage are part of this contract" — it names states and auth, **not** WCAG.

Decide whether the gate **fails** a surface on WCAG AA, or merely reports it. That single
choice sets the size of the employer and seeker legs, because the same shared components
carry the same defects everywhere.

If the answer is "part of the gate", the follow-on is which subset is blocking — contrast and
focus are already automatable and already pass; heading structure and accessible naming are
neither automatable nor currently passing.

## Answer

Ruled by the operator 2026-08-07: **as recommended, all five parts.** Execution was carried
into the map by explicit instruction, overriding wayfinder's plan-don't-do default for this
ticket only.

**The question was framed wrong and the research corrected it.** A WCAG gate already existed
and already blocked the build — `tests/e2e/a11y.spec.ts` (Phase 4.6), axe-core, serious and
critical failing, moderate logged with a documented ratchet. Three facts reframed the ruling:

1. **It covered the surfaces the design gate excludes and none of the ones it includes.**
   Six routes: three marketing (out of design-gate scope), seeker ×2, employer ×1. **Zero
   admin.**
2. **The authenticated half had never run.** Both workflows wire six `E2E_*` secrets;
   `gh secret list` returns only `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. Every
   role-gated a11y test called `test.skip` in CI and the suite reported green.
3. **Axe would have missed the worst Gate A finding.** It checks that an `h1` exists and that
   present headings are ordered — never that content regions have headings. Six regions with
   one `h1` and zero `h2`–`h6` passed every mechanical check.

### The rulings

1. **A11y is in the design gate**, split by what a machine can see: axe keeps the mechanical
   subset, the critique owns the judgement subset axe is blind to.
2. **It blocks.** A surface with an outstanding blocking-set defect is not signed off.
3. **Blocking:** contrast AA, focus visibility, accessible name on every interactive element
   and chart, heading structure (one `h1` + a heading per region), no horizontal scroll at
   360px, skeletons paired with a live region.
   **Ratchet:** 44px targets, `scope`/`<caption>`, decorative-icon `aria-hidden`, skip links.
4. **Closing the coverage hole is in scope for this map** — an automated gate that skips two
   of three portals does not satisfy "holds without a human remembering to run it".
5. **Accessibility is the one dimension not partitioned by canon.** As written, `CLAUDE.md`
   §10 licensed discarding a legitimate a11y finding on a marketing route.

### Delivered

- `docs/DESIGN.md` §5 — new **Accessibility** subsection, inline per the brief's constraint:
  the two gates, the blocking table, the ratchet list, the not-partitioned-by-canon rule, and
  the measurement traps that have already burned a run.
- `AreaChart` / `BarChart` — `ariaLabel` is now a **required** prop, written into the SVG's
  `<title>`/`<desc>` with `role="img"` replacing Recharts' `role="application"`. Recharts 3.x
  renders those elements empty unless fed, which is why the chart was a tab stop announcing
  nothing. Both callers named.
- `CardHeading` (DailyBriefing) and `KpiCard` label → `<h2>`. Heading navigation on the admin
  landing screen went from one heading for six regions to a usable list.
- `AdminTable` — `tabIndex` on the scroll container, settled state only.
- `tests/e2e/a11y.spec.ts` — admin sweep added (landing + one AdminTable screen × 2 widths),
  plus a heading-navigation assertion that is deliberately **not** an axe rule, because the
  defect it guards is one axe cannot see.
- Tremor tooltip cursors `#d1d5db` → `var(--color-border)` in both charts (drift the hook
  caught while the file was open).

### Verified

New sweep caught a real defect on its first run: `scrollable-region-focusable` (**serious**)
on `.overflow-x-auto` at 360px — a keyboard user could not pan any admin table sideways on
mobile, across all nine AdminTable screens. Fixed, then **17 passed / 6 skipped, exit 0**
across the whole a11y spec. Two `region` findings logged as moderate, correctly ratcheted.
Gates: `tsc -b` 0, vitest 637 passed, lint 0 errors / 54 warnings (pin held).

### Not done, and why

Setting the six `E2E_*` repo secrets — the operational half of ruling 4 — was **not** executed.
Pushing live credentials to a GitHub repo is outward-facing and hard to reverse, and two facts
need an operator decision first: `.env` holds only **admin and seeker** credentials (no
employer pair exists), and three UAT accounts are flagged for purging on the launch list, so
enshrining them in CI may be wrong. Carried to
[Put the a11y gate's credentials in CI](issues/09-e2e-secrets-in-ci.md).
