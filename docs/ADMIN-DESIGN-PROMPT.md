# Admin portal — design gate + review/refine prompt

> **How to use:** paste this whole file into a fresh session. It carries the verified state
> of the world as of 2026-08-05 so nothing below has to be re-derived. Where it states a
> fact, that fact was executed and observed, not inferred. Where it states a suspicion, it
> says so.
>
> **Precondition: restart Claude Code before starting.** The impeccable plugin cache still
> holds 3.9.1; 4.0.4 is pulled and waiting. Confirm with `/impeccable` showing 4.0.4 before
> Phase A.

---

## 0. The operating rule this work exists under

The session that produced this document made the same mistake three times: **it verified
against a proxy instead of the real artefact**, and each time the proxy said something
false and alarming.

| The proxy | What it claimed | The truth | What caught it |
|---|---|---|---|
| `prosrc ILIKE '%get_user_role%'` | 0 of 51 admin RPCs guarded | 51 of 51 guarded via `_admin_gate()` | reading one real function body |
| `find -maxdepth 2 -name DESIGN.md` | no design context exists | 346 lines existed at depth 3 | `git log` on the install commit |
| `grep -c "Skeleton\|loading"` | 8 of 13 admin pages lack loading states | 9 of 13 inherit all three states from `AdminTable` | opening `AdminTable.tsx` |

**The rule for this work:** a check that does not exercise the real artefact is not a check.
Run the script, open the file, hit the endpoint, load the page. `grep` and `find` generate
*hypotheses*. Every finding below carries `file:line` or command output, or it is marked
unverified and treated as unverified.

This matters more than usual here, because a design audit produces long lists of plausible
findings and there is no compiler to reject the wrong ones.

---

## 1. Verified state of the world

**Tooling**

| | |
|---|---|
| impeccable | plugin `impeccable@impeccable`, 4.0.4 pulled, cache needs restart. The repo copy (3.0.6, 58 files) was deleted — two versions were loading at once. |
| Design canon | `docs/DESIGN.md` (346 lines) + `docs/PRODUCT.md` (69 lines). Auto-discovered from `docs/` (impeccable path #2). Verified by running `context.mjs --target src/pages/admin/DailyBriefing.tsx`. No env var needed; `IMPECCABLE_CONTEXT_DIR` is unset and must stay irrelevant. |
| Scope rule | `CLAUDE.md` §10. Gated portals in, marketing out, two canons never crossed. |
| Detector | `detect.mjs --json src/pages/admin src/components/admin` → `[]`, exit 0. **Clean, and that means little** — it catches mechanical slop, not judgement. |
| taste-skill | ~12 sub-skills, all aesthetic-direction generators for new work (`brutalist`, `minimalist`, `soft`, `imagegen-*`). No audit protocol, no scoring. **Not in this gate.** Reach for it only if a surface needs a genuinely new visual world, which admin does not — admin's world is settled in `docs/DESIGN.md`. |

**The admin surface — 13 pages, 4,284 lines**

```
988  AdminLeadsStaging      569  AdminDocumentsQueue    519  AdminLeads
457  AdminAnalytics    ★    338  DailyBriefing     ★    335  AdminLeadsOutreach
215  AdminLoginPage    ★    197  AdminRevenue      ★    185  PlacementPipeline
139  JobsManagement         132  EmployerList           130  SeekerList
 80  AdminSkillCoverage
```

★ = **hand-rolled, does not use `AdminTable`.** The other 9 route through it and inherit
loading (`TableSkeleton`), empty (`emptyHeading`/`emptyBody`, required props) and error
(`errorCopy`, required prop) for free.

**So the state-coverage job is four pages, not thirteen.** Do not restate it as a
whole-portal problem. There is no "36 components missing states" finding — that number
appeared in a pasted brief, was never measured, and is not supported by anything in this repo.

**Security — already correct, do not "fix" it**

`_admin_gate()` raises on null `auth.uid()` and on `role != 'admin'`. All 51 `admin_*` RPCs
call it (checked `prosrc`, zero ungated). `anon` has no EXECUTE grant — live unauthenticated
REST probe returned `HTTP 401 {"code":"42501","message":"permission denied for function"}` on
three RPCs. `authenticated` has EXECUTE, so `_admin_gate()` is the boundary for signed-in
non-admins. **This is correct defence in depth.**

The one real gap: `tests/admin-rpc-gate.test.ts` mocks `supabase.rpc` and asserts the
*frontend* surfaces the error string. **It would pass with `_admin_gate()` deleted.** A true
data-layer test needs a real non-admin session; Playwright here does not read `.env` and
GitHub has no `E2E_*` secrets, so this is a half-day with a credentials problem attached.
It is independent of the design work and blocks nothing.

**Repo conditions that will bite**

- `npm run lint` is RED on `main`: 1 error (`react-refresh/only-export-components` on
  `AudienceContext.tsx`) + 53–54 warnings against a `--max-warnings 46` pin. CI runs it.
  **A second gate added to a repo whose first gate is routed around gets routed around too.**
- Two unmerged branches (`v13-stage3b-framework-mode`, `pricing/model-v3`); `main`
  auto-deploys to prod. Cross-cutting UI work on top of both will rebase forever.
- No declared breakpoints. `@theme` has none, so Tailwind v4 defaults are in force. Actual
  usage: `md:` 130, `sm:` 64, `lg:` 22, `xl:` 2, `2xl:` 0. `md` (768px) is structural — every
  nav flips rail-to-drawer there (`AdminSidebar`, `Sidebar`, `Nav`, `AuthLayout`).

---

## 2. Findings already made — do not re-derive these

A full audit of `DailyBriefing.tsx` was completed. Re-running it wastes a pass and produces a
worse list. **Three were fixed** (misleading `↓100%` delta pill now floored at a base of 5;
`allowDecimals={false}` on the chart; sidebar moved to `--color-surface-2` with hovers
retoned). **Eleven remain**, ranked:

1. Four yesterday-counts render `0 0 0 0` on most days — wrong period, should be 7-day rolling
2. Nothing on the page is actionable; `LeadsWorklist.tsx` exists, is built, and is not on the home page (59 rows sit in `lead_staging` unmentioned)
3. Flat hierarchy — every panel identical, no entry point after the h1
4. `System Alerts` empty state renders good news as a large blank box (~250px dead space)
5. `100%` delivery rate shown without its denominator (n=2)
6. Same fact twice, 6px apart: `100%` at 24px beside a `100% delivery rate` Tag
7. Raw `toLocaleString()` → `05/08/2026, 15:45:02`
8. Card title casing inconsistent (Title Case vs sentence case)
9. "yesterday" printed four times across KPI labels; one wraps
10. Delta pill has no accessible text for direction/comparison
11. No refresh, no poll, no freshness indicator; page rots silently in an open tab

Also verified: `AdminAnalytics.tsx:194` and `:205` use `xl:grid-cols-2` where every other
two-column grid in the codebase uses `md:`. Two uses, one file, nowhere else. That is drift.

---

## 3. The work

### Phase A — finish the wiring and calibrate (do not skip)

1. Confirm impeccable 4.0.4 is live and `context.mjs --target src/pages/admin/DailyBriefing.tsx` loads TopFarms canon. **Run it; do not assume.**
2. Add a `### Breakpoints` subsection to `docs/DESIGN.md` §5 Components — inline, **not** a new top-level section (§6 forbids a "Responsive Behavior" section, and the stated reason is that this guidance lives inline). Declare: Tailwind v4 defaults, `md` = 768px = the structural breakpoint where navigation changes shape, `sm`/`lg` = content reflow only, `xl`/`2xl` = unused. That last line converts the two `AdminAnalytics` grids from a mystery into a finding.
3. Fix the red lint gate, or explicitly decide in writing that it stays red and why. Do not add a design gate on top of an ignored one.
4. Run `/impeccable critique src/pages/admin/DailyBriefing.tsx` **as designed: two isolated sub-agents (A design review, B detector + live browser), which this prompt explicitly authorises.** A single-context run must print the `⚠️ DEGRADED` banner. Compare its output against the eleven known findings above.
   - **This is the calibration.** Findings it produces that contradict `docs/DESIGN.md` are false positives (expect hits on hex-vs-OKLCH, on Inter, on the single-green palette — all three are explicitly locked in §6). Record them in `.impeccable/critique/ignore.md`, which is the only prior-run input critique consumes.
   - If it surfaces fewer than half the eleven, the canon is not reaching it. Stop and fix the wiring before Phase B.

**Gate A:** critique runs dual-agent, loads TopFarms canon, and its false-positive rate is
understood and written down. Admin is internal-only — this is the safe place to get the gate
wrong. Do not carry an uncalibrated gate onto employer or seeker.

### Phase B — shared surfaces before screens

`AdminTable` covers 9 of 13 pages. `KpiCard`, `AdminPageHeader`, `DrawerShell`,
`AdminNotesField` cover most of the rest. Fixing a defect in `AdminTable` fixes it nine
times; finding it screen-by-screen finds it nine times.

Audit and fix, in this order: `AdminTable`, `KpiCard`, `AdminPageHeader`, `DrawerShell`,
then the `src/components/tremor/*` wrappers. Only then look at pages.

**Gate B:** each shared component demonstrably has all four required states
(`docs/DESIGN.md` §5), verified in a browser, not by reading props.

### Phase C — the four hand-rolled pages

`DailyBriefing`, `AdminAnalytics`, `AdminRevenue`, `AdminLoginPage`. These carry their own
state handling and are where real state gaps live. `DailyBriefing`'s eleven findings are the
worked example; expect the other three to rhyme.

Mergeable per page. `DailyBriefing` first — it is the landing screen and half its list is
already written.

**Gate C:** per page — `tsc -b` clean, vitest green, lint no worse than baseline, and the
page's own critique re-run showing the findings closed.

### Phase D — lock it

The gate is the deliverable; Phases A–C are its first run. Automate before attention moves:
add `detect.mjs` to CI over `src/pages/admin` and `src/components/admin`, exit 2 fails the
build. Note honestly in the CI comment that this catches mechanical slop only and does not
replace critique.

---

## 4. Out of scope — do not touch

- **Public marketing surfaces.** `Home`, `ForEmployers`, `Pricing`, `legal/`, `src/components/landing/`. Settled. A design finding there is discarded, not filed. (`CLAUDE.md` §10.)
- **Rewriting `docs/DESIGN.md`.** It is on-spec (Google Stitch), 22 KB against a 28 KB median across the 74 files in `VoltAgent/awesome-design-md`, and its anti-drift rules ("Don't 'improve' Inter by suggesting Geist", "hex is canonical, not OKLCH", "one green means one green") are the parts doing the work. Additions go inline in existing sections; the six-section structure is fixed.
- **The employer and seeker portals.** Later phases. Note when you get there that they have no directory boundary — `src/pages/dashboard/` and `src/pages/onboarding/` each hold both, split only by a `Seeker*` filename prefix. Scope by route, not path.
- **The admin authorisation guard.** It is correct. Write the test if you want; do not touch `_admin_gate()`.

---

## 5. Unresolved decisions this work will collide with

**Match-score display.** `docs/design/v11-DIRECTIVE.md` §1.4 says workers never see a personal
number. `JobDetail.tsx` shows a signed-in seeker a numeric total plus per-dimension scores,
and shows visitors a fabricated blurred `VISITOR_TEASER_SCORE` of 78. Nothing arbitrates it.
This is a **product decision, not a gate condition** — it must be ruled on before the seeker
phase or the audit will simply re-open the argument. Surface it; do not resolve it unilaterally.

---

## 6. Standing constraints

From `CLAUDE.md`, in force throughout: Supabase MCP `--read-only` ON (writes via the claude.ai
connector or Studio, never by silently flipping flags); no history-rewriting git commands
without explicit operator instruction in chat; never `git add -A`, stage explicit paths and
read `git status` first; never discard an exit code; verify before destroying; label
provenance — "an agent reported X" is not "I verified X"; `tsc -b` is the typecheck gate,
never `tsc --noEmit`; one phase per commit.
