---
target: src/pages/admin/DailyBriefing.tsx
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-05T21-42-52Z
slug: src-pages-admin-dailybriefing-tsx
---
Method: dual-agent (A: design review, isolated · B: detector + browser evidence, isolated). Neither assessment could read `docs/ADMIN-DESIGN-PROMPT.md` or `.planning/` — this run doubled as the Gate A calibration, so both worked unprimed. Surface mode: **Operate**. Live target: `http://localhost:5174/admin`, branch `design/admin-gate`, authenticated as a real admin against production data.

## Design Health Score — 18/40 (Poor)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No data-as-of stamp; four cards say "yesterday" without naming a date (`DailyBriefing.tsx:218-237`). Status shown *while* loading, never *about* the data. |
| 2 | Match System / Real World | 2 | `Endpoint` column header sits above a cell rendering `error_body` (`:286`); timestamps render US `8/6/2026, 7:15:00 AM` in an NZ product; "vs prior day —" is system-speak for "insufficient baseline". |
| 3 | User Control and Freedom | 1 | Zero controls: `main a, main button, main input, main [tabindex]` returns an empty list. `TREND_DAYS` hardcoded (`:102`); the error state's only remedy is ⌘R (`:210`). |
| 4 | Consistency and Standards | 3 | Strong internally (`Card`, `Tag`, `KpiCard`, `CardHeading` all reused). Deductions: hand-rolled `h1` (`:190-195`) where 10 sibling admin pages use `AdminPageHeader`; one `en-NZ` formatter (`:116`) beside two locale-default ones (`:151`, `:293`). |
| 5 | Error Prevention | 2 | `DELTA_MIN_BASE` (`:94-100`) is exemplary — refuses to print a lying percentage. Two cards over, `100%` ships with no denominator though `value.total` is in the payload (`:25-26`) and never rendered. |
| 6 | Recognition Rather Than Recall | 2 | Chart dates exist only on hover; `.slice(0, 5)` (`:284`) hides the true alert count; "yesterday" requires recalling today's date and whether the tab is stale. |
| 7 | Flexibility and Efficiency | 1 | No range control, no drill-through, no refresh, no shortcut, mount-once fetch (`:164-186`, `[]` deps). A daily-use screen with no lever. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained, flat, well-spaced, one green. Deductions: `100%` printed adjacent to a pill reading `100% delivery rate` (`:146-148`); a 337px card holding one 40px row; a 323px chart carrying two non-zero points. |
| 9 | Error Recovery | 1 | The alert row identifies nothing; a toast *and* an inline banner fire for one failure (`:183` + `:208-212`); an `_admin_gate()` rejection, an RPC fault and a dead connection all produce the identical sentence. |
| 10 | Help and Documentation | 1 | "Acknowledged" vs "Invoiced", "Stale", and "—" are undefined on screen. The one explanation is a `title` attribute (`KpiCard.tsx:12`) — mouse-only. |
| **Total** | | **18/40** | **Poor** |

Visual craft scores above this number; interaction completeness scores below it.

## Design Specificity Verdict

**LLM assessment — fails.** This composition could ship unchanged as the admin console of any B2B SaaS, and it is the stock Tremor dashboard *literally*: `Card.tsx:1-5` and `AreaChart.tsx:1` are vendored Tremor Raw, adapted for tokens only. Adaptation to tokens is not authorship.

Canon states the mechanism by which this product becomes specific — "the warmth… comes through content (real farm photos, real job counts, real NZ-specific copy like '8/2 roster' and 'relief milking') — never through chrome" (`docs/DESIGN.md:133`). Judged by its own stated mechanism the screen fails, because the *content* is domain-neutral: Signups, Jobs posted, Applications, Growth, Monitoring, Deliverability, Revenue. Nothing indicates a country, a sector, a season, or a marketplace. Most tellingly there is no match quality — canon calls the Match Score circle "the single most identifying component in the product" (`docs/DESIGN.md:301-308`), and it is absent from the one screen where the founder decides whether a matching marketplace is working.

The chrome is disciplined and on-canon. The composition is generic.

**Deterministic scan.** CLI detector on the target: `exit=2`, **10 findings, all one rule** (`design-system-font-size`) at lines 71, 132, 143, 150, 263, 268, 319, 320, 325, 326. Widened over `src/pages/admin` + `src/components/admin`: `exit=2`, **94 findings, 100% the same single rule.**

**6 of the target's 10 are false positives, and 67 of 94 repo-wide.** `detect.mjs` reads the machine-readable YAML at `docs/DESIGN.md:29-58`, which declares 5 type steps; the prose ramp at `:198-205` declares 8, omitting `Subtitle 17/24`, `Body Large 17/26` and `Small 13/20` from the YAML. 13px is canon and the detector cannot see it. **Genuine remainder on the target: 4** — `11px` (`:71`) and `24px` (`:143`, `:320`, `:326`), off both the YAML and the prose ramp. The admin KPI numeric scale (24px, 28px) is undeclared in either and needs a ruling.

**In-page detector** (injected successfully into the authenticated page; header printed `2 anti-patterns found` while logging 5 rule lines — discrepancy observed, unresolved). Identical at 1440×900 and 390×844: `all-caps-body`, `overused-font`, `bounce-easing`, `layout-transition`, `repeating-stripes-gradient`, `text-occlusion`. **Five are false positives, one is real.** `text-occlusion` is the detector auditing its own overlay (`inReactRoot: false`). `bounce-easing` / `layout-transition` / `repeating-stripes-gradient` are CSSOM-derived and render nowhere on `/admin` — verified 0 matching elements by walking `#root *`; every `repeating-linear-gradient` in the repo lives on the marketing surface. `overused-font` (Inter, 100%) is what canon mandates.

**`all-caps-body` is real and corroborated twice.** Three KPI labels are uppercase at 11px — `"Jobs posted yesterday"` (21ch), `"Applications yesterday"` (22ch), `"Placements acknowledged yesterday"` (33ch). `docs/DESIGN.md:205` scopes the uppercase Label step to "eyebrow labels, badge text, table headers" at 12px. The same element is the source of the CLI's `11px` hit at `KpiCard.tsx:12` — two independent signals on one element.

**Visual overlays: none available.** Assessment B ran headless, so the overlay rendered into an offscreen DOM only. No human-reviewed overlay tab exists; treat the in-page output as a console/API signal. The bundled live server was started on port 8400 and confirmed stopped.

## Overall Impression

The craft floor here is genuinely high and the *interaction* floor is genuinely low. Contrast passes at both viewports with zero failures, focus rings paint correctly at 4.57:1, there is no horizontal overflow at 390px, no Tailwind v4 focus-ring trap anywhere, and `DELTA_MIN_BASE` is real statistical discipline that cost the screen its only colour and shipped anyway. Then: the page has **zero interactive elements inside `main`**, one `h1` for six regions of content, and a System Alerts panel that cannot answer the only question it exists to answer.

The single biggest opportunity is a change of composition, not of styling. Most mornings this screen's honest answer is "nothing happened" — and a page that can only say `0` four ways is a report, not a briefing. Exceptions-first, metrics-second, is a different screen from this one restyled.

## What's Working

1. **The delta floor is real statistical discipline, rare in dashboards.** `DELTA_MIN_BASE = 5` with a null return and a comment stating that −100% on n=1 is "arithmetically true and informationally worthless" (`:83-100`). This is `docs/DESIGN.md:371` implemented rather than written.
2. **Contrast is engineered, not eyeballed.** `Tag.tsx:8-11` pairs every tint with a proven ≥4.5:1 partner and carries the scar of a deleted 1.93:1 variant; `index.css:23-26` records darkening `text-subtle` from `#8A968D` (3.08:1) to `#647268`, independently measured at 5.03:1. Zero contrast failures across every text node at both viewports.
3. **The unauthorised state is done properly — the §5 requirement most products fail.** `AdminGate` resolves role *before* deciding, renders `AccessDeniedView` in place with `role="alert"` and a working escape link, and never redirects or flashes the protected view (`AdminLoginPage.tsx:191-215`).

## Priority Issues

### [P0] System Alerts cannot answer the only question it exists to answer
- **What.** The `Endpoint` column can never show an endpoint: `webhook_failures` has no endpoint field (`:29-35`) and the cell renders `error_body.slice(0, 60)` (`:286`) — live, it reads `—`. `cron_health` is typed, fetched and rendered nowhere (only `:36` and the docblock at `:54`), so the empty copy "No system alerts in the last 24 hours" asserts something the component never checked. `.slice(0, 5)` (`:284`) truncates with no "5 of N". No drill-through. The good-news branch (`:262-265`) renders 13px subtle text inside a card measured at **337px** — the exact anti-pattern `docs/DESIGN.md:263` names.
- **Why it matters.** On an Operate surface a failed webhook is the reason to open this page. The operator can see that something failed and cannot learn what, where, how many, or what to do — every path is closed. Cron failure, whose silence most endangers this briefing, is fetched and discarded.
- **Fix.** Rename the column to `Error` and render `error_body` with a `title` for the full string. Add a second table for `cron_health` (`jobname` / `last_status` / `last_start`) — that is why it is in the payload. Show `Showing 5 of N` with a link to the full log. Make rows links. For the empty branch: a `Brand`-tinted check line carrying the eyebrow's own promise, and `items-start` on the grid (`:257`) so the card shrinks to content instead of stretching to its neighbour.
- **Suggested command:** `/impeccable harden`

### [P1] A rate shipped without its denominator, 40 lines from the guard that forbids it
- **What.** `100%` plus a `100% delivery rate` pill, no total. `resend.value.total` is in the type and payload (`:25-26`), never rendered.
- **Why it matters.** `docs/DESIGN.md:371` — rates are not safe without their denominator. 100% on 1 email and 100% on 4,000 are the same pixels and different businesses. The file already enforces this for deltas, so it is a lapse, not a disagreement.
- **Fix.** `{ratePct}% of {total} emails delivered`; below `DELTA_MIN_BASE`-equivalent volume print raw counts. Drop the pill's numeric repeat and let it carry only the traffic-light signal.
- **Suggested command:** `/impeccable clarify`

### [P1] Stale by design: no as-of, no refresh, mount-once fetch
- **What.** The effect runs once with `[]` deps (`:164-186`). Nothing states when the data was read; there is no way to re-read it. "Signups yesterday" never names the day.
- **Why it matters.** A briefing left open in a tab silently becomes yesterday's briefing with today's confidence — the highest-probability wrong-decision path on the screen. The remedy the error copy offers is "Refresh the page" (`:210`), i.e. ⌘R.
- **Fix.** Swap the hand-rolled `h1` for `AdminPageHeader`, which already has `eyebrow`, `description` and an `action` slot (`AdminPageHeader.tsx:9-41`): `description="Yesterday = Tue 5 Aug (NZT) · read 7:31am"` plus a Refresh button in `action` re-running the same `Promise.all`. One shared component, one extracted `load()`.
- **Suggested command:** `/impeccable harden`

### [P1] Six regions of content, one heading — and the chart is an unnamed tab stop
- **What.** Heading order is `h1: "Daily Briefing"` and **nothing else**; zero `h2`–`h6`. Every card title is a `<div>` (`CardHeading`, `:70-76`), so "Signups, last 14 days", "System Alerts", "Email Delivery", "Placements this month" and all four KPI labels are invisible to heading navigation. `svg.recharts-surface` is the **only** content tab stop: `tabindex="0"`, `role="application"`, `<title>` and `<desc>` both empty strings, data hover-only, no table alternative. The table has no `caption` and `scope=null` on all three `<th>`s. The error banner (`:208-212`) is a plain `<div>` with no `role="alert"`. `PanelSkeleton` is `aria-hidden` with no live region (`Skeleton.tsx:135-142`), unlike `RouteSkeleton`/`SectionSkeleton` which both pair with `LoadingAnnouncement`. 14 lucide icons carry no `aria-hidden`. No skip link, and 14 focusables precede `<main>`.
- **Why it matters.** Heading navigation is the primary screen-reader wayfinding method on a dashboard, and it is unavailable. The 14-day trend is entirely inaccessible. `docs/DESIGN.md` §5 makes states a functional requirement, and the page-data wait announces nothing.
- **Fix.** `CardHeading` renders `<h2>` (the eyebrow stays a `<div>`); `aria-label` + a visually-hidden data table for the chart, or drop `tabindex`/`role="application"`; `scope="col"` and a `<caption>` on the table; `role="alert"` on the error banner and drop the duplicate toast; `aria-hidden="true"` on decorative icons; a skip link.
- **Suggested command:** `/impeccable audit`

### [P2] Hierarchy is inverted: the biggest element carries the least information
- **What.** Measured boxes: chart 1152×**323** (two non-zero points), System Alerts 564×**337** (one 40px row), Email Delivery 564×159, Revenue 564×155, KPIs 276×115 with four 28px numbers all reading `0`. The page's only actual anomaly is 13px body text.
- **Why it matters.** In Operate mode size is a claim about importance. Every claim on this screen is currently false, which is why it scans as "nothing here" while showing a failure.
- **Fix.** Shrink the chart to a sparkline inside the Growth card until daily volume justifies 323px (`h-56` at `:244` is a one-token change); promote the alerts panel to full width, first position, above the KPIs whenever failures exist. Exceptions-first, inverting to metrics-first only on a clean day.
- **Suggested command:** `/impeccable layout`

### [P2] Entry is a 4-second blank, then a skeleton of the wrong shape
- **What.** Measured on a warm dev server: layout first appears at **3.94s**, content at 4.39s; for the first ~4s `document.body.innerText` is the single word "Loading" (`AdminLoginPage.tsx:194-204`). A soft nav from Analytics puts the `h1` up in 92ms, so this is auth/role resolution, not Vite — corroborated by `[useAuth] loadRole timeout after 3s, keeping previous role` firing **4× per desktop load, 3× per mobile load**, reproducible across five runs. Then the page's own skeleton draws 5 shapes against 8 settled cards, so ~500px of layout appears on resolve, against `docs/DESIGN.md:262`.
- **Fix.** Extend the skeleton to the full settled shape; have the role-resolution branch render `AdminLayout` with that skeleton inside it so the rail and title paint immediately. Investigate the 3.9s role resolution as a separate performance item — the repeated `loadRole` timeout is the lead.
- **Suggested command:** `/impeccable optimize`

## Persona Red Flags

**Alex (power user).** Nothing on this screen is operable — verified empty focusable set inside `main`. Cannot click a failed webhook through to its log (`:285-295` renders `<tr>`, not links), cannot change 14 days (`:102`), cannot refresh without ⌘R (which costs 4s of "Loading"), cannot expand past 5 alerts, cannot see `cron_health` at all. The single tab stop in the content area is an unlabeled SVG. Realistic outcome: he stops opening `/admin` and goes to `/admin/analytics` or straight to SQL.

**Sam (keyboard / screen reader).** One heading for eight panels. The only content tab stop announces nothing. Table cells arrive as unlabeled strings ("—, failed, 8/6/2026"). Page-data loading is silent. The error is a plain `<div>`, so only the toast may announce it — the duplicate signal canon forbids. The delta's only explanation is a mouse-only `title`. *Passing, and verified:* every focusable element takes a visible `2px #15803d` ring at 4.57:1 against the rail, settled — an earlier 1.77:1 reading was a mid-transition sample and was withdrawn.

**Harry (the operator — founder, morning check, often on a phone in a ute).** At 390×844 the entire first viewport is four cards reading `0 / vs prior day —`; the only anomaly is three scrolls down, revenue is four. No hover on touch, so the chart's dates do not exist on his actual device — the largest element on the page is decorative there. Timestamps read `8/6/2026, 7:15:00 AM`: on 6 August in NZ that is ambiguous with 8 June, two lines from a formatter that correctly pins `en-NZ` (`:116`). A card with the eyebrow `REVENUE` contains no money, though `KpiCard` already accepts `"$12,500"` (`KpiCard.tsx:31-32`). With single-digit daily volume, `DELTA_MIN_BASE = 5` means the delta pill effectively never fires in production — four permanently dead pills occupying ~25% of each KPI card. **Every touch target in the mobile navigation is 40px — 4px short of 44×44:** `Open menu` at 40×40 closed, and with the drawer open 13 nav/sign-out rows at 263×40 plus both menu buttons. All layout-owned; `DailyBriefing.tsx` contributes no interactive elements.

## Minor Observations

- **Duplicate error signalling** — `toast.error` (`:183`) *and* an inline banner (`:208-212`) for one failure; `docs/DESIGN.md:264` forbids exactly this.
- **Silent-blank branch.** `!loading && !errored && briefing &&` (`:214`) — if the RPCs resolve without error but `briefing` is null, the screen renders the `h1` and nothing else: no loading, error, or empty affordance.
- `100%` printed beside a pill reading `100% delivery rate` (`:146-148`) — the same fact twice, adjacently.
- Seconds precision on "Last checked" is noise; `toLocaleString()` at `:151` and `:293` should use `en-NZ` like `:116`.
- The hand-rolled `h1` (`:190-195`) is the only admin page not using `AdminPageHeader` (used by `AdminRevenue.tsx:91`, `PlacementPipeline.tsx:97`, `EmployerList.tsx:53`, `AdminAnalytics.tsx:187` and 6 more) — and it is the reference screen the others were told to copy.
- **Hypothesis (code read, not observed):** no `AbortController` or cleanup on the effect (`:164-186`), so a remount can let a stale response call `setState`.
- **Hypothesis (code read, not observed):** `AreaChart` with `startEndOnly` indexes `data[0][index]` unguarded (`AreaChart.tsx:686-690`); an empty trend array would throw. `:243-254` passes `formatTrend(trend)` with no length guard. The RPC currently returns 14 rows, so this is latent.
- The chart's y-domain auto-scales to 4, so one signup renders as a dramatic peak — no low-data treatment matching the honesty of the delta floor.
- 254 elements compute `transition-property: all`; the focus ring consequently fades in over 150ms rather than appearing instantly.
- **Breakpoints comply.** KPI grid uses `sm:`/`lg:` for column counts, panel grid uses `md:`, no `xl:`/`2xl:` — matching `docs/DESIGN.md:269-275` exactly. Recorded so a later pass does not file it as drift.
- **Contrast, overflow and focus all pass.** 0 text nodes below WCAG AA at either viewport; `scrollWidth === clientWidth` at 390px with the drawer both closed and open; 0 occurrences of the Tailwind v4 `outline-none` + `focus-visible:outline-*` trap.

## Questions to Consider

1. If the briefing's honest answer most mornings is "nothing happened", what is the screen *for*? A page that can only say `0` four ways is a report. An exception list is a different composition, not a restyle of this one.
2. Canon calls the Match Score circle the product's most identifying component. Why does the screen where the founder judges whether a *matching* marketplace works contain no measure of match quality?
3. Four cards say "yesterday". At what NZ hour does yesterday roll over, and does a 7am check see the same "yesterday" as an 11pm one?
4. `cron_health` is fetched every load and rendered nowhere. Was a second table intended — or is the cron precisely the thing whose silence you would most want to hear about?
5. "Invoiced" renders `placements_confirmed_this_month`. Does confirmed mean invoiced? If a placement is acknowledged but never invoiced, which number here tells you?
6. `DELTA_MIN_BASE = 5` makes the delta pill dead in production at current volume. Would "0 yesterday, 1 the day before" not be both honest *and* useful, where "—" is only honest?

## Canon Gaps Surfaced (doc fixes, not code findings)

Both assessments independently hit the same section of `docs/DESIGN.md`. Filed here as doc reconciliation, deliberately **not** as design findings against the code:

1. **The YAML type block (`:29-58`) declares 5 steps; the prose ramp (`:198-205`) declares 8.** Missing: `Subtitle 17/24`, `Body Large 17/26`, `Small 13/20`. This single gap generates 67 of 94 repo-wide detector findings.
2. **`:201` assigns Headline (36/44) to page titles, but the whole admin portal ships them at 20px** (`AdminPageHeader.tsx:31-36`, all 11 screens). The shipped consistency is right for a dense internal tool; the doc should record the admin exception, or every future audit files a correctly-consistent choice as drift.
3. **The admin KPI numeric scale (24px, 28px) is undeclared** in either the YAML or the prose ramp. It needs a step, or the numbers need to snap to an existing one.
