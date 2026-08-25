# Next slice — the a11y gate, then supply-first launch

Written 2026-08-25 at the end of the pre-launch UAT session. Paste the block below into a
fresh Claude Code session. Everything above the `---` is context for you, the operator.

---

## Operator context (do not paste)

**Sequencing was corrected by the operator on 2026-08-25.** The launch is **supply first**:
contact ~200 JOB SEEKERS, get them signed up, and only then approach employers — so an
employer arrives to a populated pool rather than posting into silence. My earlier advice
(send employer tranche 1 first) was wrong and is superseded everywhere.

**The blocker for that sequence is inventory, not code.** Measured on prod 2026-08-25:

| | count |
|---|---|
| `lead_staging` where `structured->>'kind' = 'employer'` | 167 pending, 2 approved |
| `lead_staging` where `structured->>'kind' = 'seeker'` | **1 pending** |

The seeker lane is BUILT — same `lead_staging` table, `AdminSeekerStaging` screen, same
dedupe and approval RPCs. It is simply empty. Getting to ~200 seekers is a harvesting and
consent problem, and it is the real critical path.

**Two things to decide before any seeker outreach goes out:**

1. **Consent posture.** UEMA 2007 governs seekers too, and their position differs from
   employers'. An employer's job ad publishes a contact address *inviting* contact; an
   individual posting "looking for dairy work" in a Facebook group has not. Get comfortable
   with the basis before sending, not after. The safer shapes: reply in-thread where they
   posted, or post an invitation and let them come to you, rather than cold-emailing
   scraped personal addresses.
2. **Where the 200 come from.** The 23-post seeker corpus in `docs/SEEKER-INSIGHTS.md`
   shows they are in NZ farming Facebook groups. That implies manual capture or in-group
   posting, not a scraper.

---

## The prompt (paste this)

```
Read .planning/NOW.md and .planning/NEXT-SLICE-PROMPT.md first. Then CLAUDE.md.

Context: a pre-launch UAT pass on live prod (2026-08-24/25) found and fixed five
accessibility defects, all on gated portal surfaces. Three remain, and the CI gate that
should have caught all of them has a specific blind spot. This slice closes both.

Standing rules from the previous session, unchanged:
- Ask before every `git push` — it deploys Vercel prod and the Edge Functions.
- The claude.ai Supabase connector has FULL WRITE to prod; only the project-scoped
  `.mcp.json` server is `--read-only`. Verify project ref `inlagtgpynemhipnqvty` first.
- Throwaway prod accounts are allowed for E2E proof and MUST be purged after, verifying
  what you are about to delete before deleting it.
- Never send an email to any real lead. Drafting and staging only.
- Gates by the project's own commands: `npm run lint`, `npm test -- --run`, `tsc -b`,
  `npm run build`, `npm run design-gate`, `node scripts/contrast.mjs`.
- Every fix ships with a test you have PROVEN fails without the fix (stash it and watch
  it go red). A green test that was never seen red proves nothing.

TASK 1 — three remaining a11y defects (small; same pattern as commit 30295ed)

  a) Seeker onboarding, "DairyNZ qualification" step: an <input> with no accessible name.
     axe rates this CRITICAL (rule: label).
  b) The apply form (from /jobs/:id → Apply): a <textarea> with no accessible name.
  c) Seeker onboarding step 1 ("Your details"): three chip groups — "Farm types you are
     looking for", "Roles you're after", "Type of work" — carry NO required marker, yet
     Continue stays disabled until each has a selection. The user is blocked with nothing
     telling them which field is missing. Give them the `required` treatment ChipSelector
     already supports (visible asterisk + sr-only "(required)"), or make Continue's
     disabled reason explicit. Judge which, and say why.

  Reference fix already on main: src/pages/jobs/steps/JobStep5Description.tsx uses
  useId() + htmlFor + aria-describedby + aria-invalid. Copy that shape.

TASK 2 — fix the gate's blind spot (the high-leverage one)

  tests/e2e/a11y.spec.ts DOES cover the portals, and it was green through all five
  defects. Here is exactly why, verified 2026-08-25:

  - It navigates to /onboarding/employer and /onboarding/seeker, but the CI accounts are
    ALREADY ONBOARDED, so both redirect to the dashboard. The spec notices and logs
    "[a11y] ... redirected to X — scanned that surface" — into CI logs nobody reads. Net
    effect: it has been scanning the dashboard twice and the wizards never.
  - /jobs/new — the 8-step job wizard — is not in the sweep at all.
  - The applicant-dashboard test skips when the employer has no listings, and prod has
    zero jobs, so it always skips.

  Every one of the five defects sat on a wizard step past step 1, or in a branch (the
  new-user dashboard, which has no h1) that an onboarded CI account never renders.

  Make the sweep WALK the wizards:
  - Seed or reset an un-onboarded employer and an un-onboarded seeker for CI, so the
    wizard actually renders. Reuse the temp-account pattern rather than inventing one.
  - Step through each wizard screen and run axe at EVERY step, not just the landing step.
  - Include /jobs/new the same way.
  - When a surface cannot be reached, FAIL or clearly report — do not warn into a log.
    A silent skip is how this happened.

  A working manual harness exists at
  /private/tmp/claude-501/.../scratchpad/uat2/ (audit.mjs + lib.mjs) — it walks wizards,
  drives custom dropdowns and chip groups, types into React-controlled textareas, and
  checks the DESIGN.md §5 blocking set including the four things axe is blind to
  (heading-per-region, horizontal overflow, settled focus rings, skeleton live regions).
  That directory may be gone; if so, rebuild the same idea inside tests/e2e/.

  Scope guard: this is a test-infrastructure change. Do NOT start a portal-wide design
  realignment. Full DESIGN.md alignment is a RATCHET, not a project — surfaces get fixed
  as they are touched. Stopping launch for a big design pass wins zero farmers.

TASK 3 — do not do more engineering after Task 2

  Report what is left, and stop. The remaining launch work is the operator's: harvesting
  ~200 seeker leads and getting them signed up BEFORE any employer outreach.
```

---

## Why this ordering

The three defects are worth 30 minutes. **The gate is worth more than the defects**: it is
the difference between finding this class once, by hand, and finding it on every commit
forever. Five real accessibility defects lived on the employer and seeker cold-start paths
while CI stayed green — that is a gate pointed at the wrong screens, and the code fixes do
not change it.

After Task 2 the engineering side is genuinely done for launch. The score has been at its
ceiling (~81/100) for three days; the remaining points are market points — a real seeker, a
real employer, a real hire — and no amount of design alignment moves them.
