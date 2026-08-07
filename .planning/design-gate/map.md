# Map: Prove the design gate across all three portals

Label: `wayfinder:map` · Charted 2026-08-07

## Destination

The design gate — impeccable critique, the mechanical detector, and `docs/DESIGN.md` §5
required states — has been run against **admin, employer and seeker**, its findings closed,
and the gate automated so it holds without a human remembering to run it.

Reached when nothing is left to *decide* about how the gate applies to any of the three
portals. Execution after that is a hand-off, not a step on this map.

## Notes

**Path override.** The local tracker doc puts efforts in `.scratch/<effort>/`. This map lives
in `.planning/design-gate/` instead, with the doc's structure otherwise unchanged (`map.md`
plus `issues/NN-<slug>.md`, same `Type:` / `Status:` / `Blocked by:` lines). Reason:
`.scratch/` is not gitignored here, and this repo's `.gitignore` explicitly separates scratch
from decision records — "the directive governs the port and **is the decision record**.
Tracked, not scratch." A wayfinder map is a decision record.

**Execution override, 2026-08-07.** Wayfinder is plan-don't-do; the operator overrode it for
[Is WCAG AA a pass/fail condition of the gate](issues/08-is-wcag-part-of-the-gate.md),
instructing that the ruling be implemented in the same pass. The override is per-ticket, not
standing — later tickets return to decisions-only unless told otherwise.

**Otherwise this map holds decisions only.**
Admin Phases B/C/D execution does **not** belong on this map — it is the hand-off. Its state
lives in `.planning/admin-design-gate/STATE.md`. If a ticket here starts to read like a task
list for a build, it is mis-scoped.

**Three planning surfaces, one job each** — keep the boundary or this becomes the sprawl it
was meant to fix:
| Surface | Owns |
|---|---|
| `.planning/NOW.md` | cross-stream index: what's live, in flight, blocked on a human |
| `.planning/design-gate/` (this map) | open **decisions** about the gate |
| `.planning/admin-design-gate/STATE.md` | the admin leg's **execution** state |

**Canon, and it is not up for negotiation in this map's tickets.** Gated portals answer to
`docs/DESIGN.md`; `src/index.css` wins on any hex. Public marketing answers to
`docs/design/v11-DIRECTIVE.md` and is out of scope entirely (`CLAUDE.md` §10). Locked by §6:
hex over OKLCH, Inter, one green. A ticket proposing to change those is mis-scoped.

**Skills every session should consult:** `/grilling` and `/domain-modeling` for the ruling
tickets; `/impeccable critique` dual-agent for any gate run. Known false positives and the
method requirements for contrast and focus-ring measurement are in
`.impeccable/critique/ignore.md` — read it before filing a finding.

**Sequel maps, already chosen by the operator (3 → 2 → 1).** This is map 3. Map 2 is
"everything in flight is merged to `main` and prod is coherent". Map 1 is "TopFarms is live
and taking real money". Work ruled out of scope below is tagged with the map it belongs to.

## Decisions so far

<!-- one line per closed ticket -->

- [Is WCAG AA a pass/fail condition of the gate?](issues/08-is-wcag-part-of-the-gate.md) —
  **Yes, blocking.** A WCAG gate already existed and already failed builds; it just covered the
  three marketing routes and no gated-portal route, and its authenticated half had never run
  because no `E2E_*` secret exists. Split mechanical (axe) from judgement (critique), since axe
  cannot see a missing heading structure. Blocking set and ratchet set written into
  `docs/DESIGN.md` §5, along with the ruling that a11y is the one dimension **not** partitioned
  by canon. Implemented in the same pass, per the override above.

- [What are the employer and seeker surfaces, by route?](issues/04-employer-seeker-surface-inventory.md) —
  **8 employer + 5 seeker routes, 12 components, 5,033 LOC** (and the split is 11/8/5, not the
  13/7/4 previously recorded). Headline: **no `AdminTable` equivalent exists — 0 of 12 inherit
  states from a shared component, and unauthorised is 0 of 12.** Path is meaningless here; the
  directory convention is inconsistent, so scope by route. `ErrorState` is the best state
  primitive in the codebase and should be the model. Three live defects recorded on the ticket.

- [Admin page titles contradict the declared type ramp](issues/02-admin-page-title-exception.md) —
  **Admin's 20px declared correct as Title 20/28 for dense internal tooling.** The
  "admin exception" framing was wrong: measuring found *three* page-title sizes across the
  gated portals (admin 20, dashboards 30, onboarding 24) and two colour treatments, none of
  them the declared Headline. Employer/seeker recorded as a finding and split to `11` rather
  than restyled inside a typography pass.

- [Admin KPI numeric scale is declared nowhere](issues/01-kpi-numeric-scale.md) —
  **Added a `Metric` step (600, 24/28, tabular-nums) and unified the two numeral sizes onto
  it**; one code line. Bigger find: `--text-micro` (11/14) and `--text-label` (13/16) have been
  declared in `src/index.css` since Phase 5.2 and were missing from the doc — so 11px was never
  drift, and the ramp is now documented as following the theme, which already wins on hex.
  Detector on the admin tree **27 → 14**; the remainder is almost entirely `14px`.

- [Which canon governs the session-branching public routes?](issues/10-dual-canon-public-routes.md) —
  **Canon splits by dimension, not only by route.** `v11-DIRECTIVE` §1.3/1.4/1.5 are product
  principles describing the portals, not marketing-page rules, so they bind everywhere — as do
  accessibility, states and authorisation. `/jobs` and `/jobs/:id` are in the gate for those;
  their visual treatment stays settled under the marketing canon. `CLAUDE.md` §10 amended to
  say **visual** finding. Clinching evidence: `MatchCircle` is shared between worker- and
  employer-facing surfaces, and §1.4 permits the number for one and forbids it for the other —
  no route rule can express that.

- Pre-map, recorded here for orientation only — these were settled before charting:
  - **Gate A calibration** (`fc06ff9`) — dual-agent critique, 7/3/1 against the brief's 11,
    0 canon-contradicting false positives; the detector's own 71% FP rate fixed at source.
  - **`ProtectedRoute` ruling** (`606af9e`) — access-denied renders in place, all three
    portals, one guard.
  - **`AdminTable` four states** (`2749e1b`) — unauthorised state added; 9 of 13 admin
    screens inherit it.

## Not yet specified

- **Employer portal findings.** Inventory now exists (`04`) and confirmed the gaps are
  hand-rolled per page; still needs a critique run before findings can be ticketed. First three
  are already recorded on `04`.
- **Seeker portal findings.** Same, and additionally downstream of `03` and `10`.
- **Whether the 12 hand-rolled surfaces get a shared data component** the way admin got
  `AdminTable`, or stay hand-rolled and are fixed one by one. `04` established there is nothing
  to inherit from today; whether to build one is a real question, and an expensive one. Not
  ticketed because it likely depends on `06`.
- **What evidence closes the gate for a portal.** The admin brief defines Gates B and C for
  admin; nothing defines them for the other two. Narrowed by `08`: the **accessibility**
  evidence is now specified for every portal (the blocking table in `docs/DESIGN.md` §5). What
  remains unspecified is the visual and states evidence. May be answered by `05`/`06`.
- **Whether the four hand-rolled admin pages have counterparts** in employer/seeker — pages
  carrying their own state handling rather than routing through a shared component.
- **The `14px` group.** 12 of the 14 remaining admin detector findings, and the largest source
  of noise left. `text-sm` sits between the ramp's Small 13 and Body 15. A ruling of the same
  shape as `01`, not yet ticketed because its blast radius across all three portals is unmeasured.
- **`--text-label` 13/16 versus the prose ramp's Small 13/20.** Same size, different leading,
  two different jobs. Changing a line-height moves layout everywhere, so this wants deliberate
  reconciliation rather than a passing edit.
- **Whether the a11y ratchet items graduate into their own work.** 44px targets are a
  portal-wide layout change (the admin rail ships 40px); `scope`/`<caption>`, decorative-icon
  `aria-hidden` and skip links are mechanical but unscoped. Ratcheted by `08`, not scheduled.
- **Whether the gate needs a motion/interaction dimension.** Gate A only measured static
  states. 254 elements compute `transition-property: all`; nobody has ruled on whether that
  is in the gate's remit.

## Out of scope

Fog gathers only toward the destination. These are ruled beyond it and never graduate.

- **Public marketing** — `Home`, `ForEmployers`, `Pricing`, `legal/`,
  `src/components/landing/`. Settled, different canon, `CLAUDE.md` §10. A design finding
  there is discarded, not filed. **Under challenge at the edge:** `04` found that
  `/jobs/:id` and `/jobs` are public routes rendering session-branching product UI, so the
  §10 boundary does not cleanly hold. Those two specifically are **not** ruled out of scope
  pending [10](issues/10-dual-canon-public-routes.md). The list above is unaffected.
- **Merge order, the both-roles UAT, branch coherence** → **map 2**. The gate can be proven
  on a branch; it does not need prod to be coherent first.
- **PEND-01 Stripe live-mode, the launch gate, legal review, purging UAT accounts** →
  **map 1**. Operational, not design. **One thread crosses back:**
  [Put the a11y gate's credentials in CI](issues/09-e2e-secrets-in-ci.md) needs to know which
  accounts survive that purge, or CI gets credentials that stop working and the suite silently
  returns to skipping. The purge is map 1's; *which accounts CI depends on* is this map's.
- **`_admin_gate()` and the data-layer security boundary.** Correct as built; the brief says
  do not touch it. Client-side gating is presentation — that is already settled canon (§5).
- **Lead streams and the immigration phase.** Unrelated efforts.
