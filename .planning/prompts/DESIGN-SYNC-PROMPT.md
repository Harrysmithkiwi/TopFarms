# Design-system sync — the prompt

One goal: **every surface of TopFarms renders from one token set.** Landing, jobs board,
job detail, signup/auth, seeker portal, employer portal, admin portal, onboarding, the job
wizard, verification, legal — everything.

Paste the block below into a fresh Claude Code session. Prefix it with `/loop` if you want it
to self-pace across sessions; it works pasted plain too. (`/goal` is not a command in this
setup — `/loop` with no interval is the self-paced equivalent.)

---

## The prompt

```
Read docs/design/AUDIT.md first — the whole thing. Then CLAUDE.md, then
docs/design/Brand_and_Design.md and docs/design/topfarms-tokens.css.

GOAL. One design system across the entire TopFarms platform. A person moving between the
landing page, the jobs board, a job detail page, signup, the seeker dashboard, the employer
dashboard, the admin portal and the onboarding wizards cannot tell they are on different
systems: one ground, one green ramp, one typeface pairing, one radius scale, one shadow
model, two badge families.

Phase 1 is DONE. docs/design/AUDIT.md is the survey — do not re-derive it, but do re-run its
§10 commands to confirm the counts still hold before you start, and again at the end.

DECISIONS ALREADY RULED — do not reopen these:
  1. --color-text-subtle stays #5c6a60. The spec's #8A968D measures 2.96:1 on bg and
     regresses a bug fixed twice. Amend the spec, not the code.
  2. rounded-[10px] (28 uses) collapses to 12px.
  3. The four semantic *-text-on-bg values stay as they ship (warn #92400e, danger #991b1b,
     info #075985, ai #5b21b6). All are higher-contrast than the spec's. Amend the spec.
  4. Token naming keeps the repo's -text-on-bg / -bg suffixes. Tag.tsx and
     scripts/contrast.mjs gate by those names and the suffix encodes the rule.
  5. --color-ai-bg stays #f5f3ff.
  6. --color-border-strong stays #d0d5cc.
  7. --color-brand moves to #15803D. Fills darken slightly; that is intended.
  8. #2563eb and #b45309 map to --color-info-text-on-bg / --color-warn-text-on-bg and are
     deleted.
  9. Newsreader lands on app page titles, shipped together with the five sub-20px fixes.
 10. docs/DESIGN.md STAYS at docs/DESIGN.md. Moving it blinds the impeccable skill, which
     auto-discovers it from docs/. Give it a header pointing at the canonical brand doc.

WORK THROUGH THIS ORDER. One commit per row. Do not batch rows.

  0.  DOCS. Amend Brand_and_Design.md + topfarms-tokens.css for decisions 1/3/5/6, strike the
      stale border-t-moss item, correct the "35 elements at 3px" claim. Move the canonical
      pair to docs/_canonical/ and the superseded v2.0 + v12-DIRECTIVE to
      docs/_superseded/2026-08-25/. Rewrite CLAUDE.md §10 — "two worlds, one is closed" is
      obsolete the moment marketing and portal share a token set. Show the §10 diff before
      writing it.
  1.  DELETE the 11 orphaned landing components (CardRow, Close, Counters, Hero, MatchBand,
      OpenRoles, PricingClaim, Problem, Steps, Testimonials, WorkerSplit). Nothing imports
      them; re-verify with the §10 orphan-proof grep before deleting. Removes 95 retired-token
      uses, font-bricolage entirely, 12 rounded-3xl. Zero user-visible change.
  2.  index.css only: tint --shadow-sm/-md/-lg/-xl (fixes 28 black-rgba shadows across 23
      files with no component edits), retire --color-paper -> #F3F5F0 and --color-fern-50 ->
      #E8F5EC, define or replace --color-clay (JobStep5Description.tsx:72 references a token
      that does not exist).
  3.  Archivo out. AuthLayout.tsx:17 drops font-archivo; the 8 auth pages take Newsreader on
      H1 only. Delete the Archivo and Bricolage @import lines once nothing uses them.
  4.  Auth screens: sand palette and near-miss greys together (AuthLayout + 8 pages).
      cream->bg, cream-2/card->surface-2, line->border, ink->text, ink-60/ink-40->text-muted.
  5.  SignUp.tsx: lime -> brand-lite on the dark panel, #123324 -> brand-900, amber selected
      state -> brand-50 fill with a brand-accent border.
  6.  JobDetail.tsx alone (91 uses). Its inline status pills become <Tag>.
  7.  JobSearch.tsx + SearchHero + NotFound + ShellPreview + MyApplicationsSidebar + ShellNav.
      After this, zero cream/ink/line/lime/green-2/ochre in src/.
  8.  v14 marketing tokens become aliases of v2: fern-900->brand-900, fern-700->brand,
      fern-600->brand-accent, fern-100->brand-50, bark->text, sage->text-muted, rule->border,
      linen->surface. Pure rename, 164 sites. Touch the landing page last and least — if a
      landing value disagrees with the token file, FLAG IT, do not change either.
  9.  Serif: flip --font-display to Newsreader AND fix the five sub-20px sites in the same
      commit (MatchCircle numeric score, JobDetailSidebar:183, ApplicantDashboardSidebar:33,
      ErrorState:63, Nav:65 wordmark). Shipping the flip alone regresses five screens.
 10.  Radii: 61 off-system uses -> 8/12/16/pill.
 11.  --color-brand -> #15803D.
 12.  Extend scripts/design-gate.mjs to fail on any hex literal in src/ outside index.css.
      Allowlist exactly six things, each with a one-line reason in the script: the Stripe
      block in PaymentForm.tsx, the Google logo SVGs in Login.tsx and SignUp.tsx, and
      root.tsx's theme-color meta. Exclude &#\d+; entities and code comments or the gate
      fails on an arrow glyph. Do NOT add a second gate script.

RULES.
- Migrate, do not redesign. You are replacing values with tokens. No layout changes, no copy
  changes, no component restructuring, no "improved" spacing. If a change would alter what a
  screen does or how it is laid out, STOP and ask.
- Never introduce a colour. If something on screen has no token, stop and surface it.
- Preserve behaviour. No routing, data-fetching, validation or auth changes.
- Accessibility is not a migration casualty. Every text/background pair you touch gets its
  ratio computed and reported: 4.5:1 body, 3:1 large text and non-text. Focus rings and 44x44
  targets survive every edit.
- Ask before every git push. No history rewriting (CLAUDE.md §4).
- If any single row exceeds 40 files, stop and show the plan.

GATE AFTER EVERY ROW. A row is not done until all of these pass:
    npx tsc -b
    npm run lint
    npm test -- --run
    npm run build
    npm run design-gate
    node scripts/contrast.mjs
    npx vitest run tests/wizard-steps-a11y.test.tsx
Never discard an exit code (CLAUDE.md §9). If a gate goes red, fix it before the next row.

TESTS. Where a row makes token usage assertable, add a test and watch it fail without the
change. A green test that was never seen red proves nothing. At minimum: a test that fails if
any retired token name (cream|cream-2|card|ink|ink-60|ink-40|green|green-2|green-3|lime|
lime-2|ochre|ochre-ink|line|danger-ink|archivo|bricolage) reappears in src/.

DONE means all of these are true, verified by running them, not by asserting them:
    grep -rEn "#[0-9a-fA-F]{3,8}\b" src/ --include=*.{ts,tsx,css,js,jsx} \
      | grep -v "^src/index.css" -> only the six allowlisted entries
    zero font-family declarations outside src/index.css
    zero rounded-* outside {8px,12px,16px,9999px} and the token aliases
    zero shadow-{sm,md,lg,xl} resolving to rgb(0 0 0 / *)
    zero references to a var(--*) that src/index.css does not define
    zero retired v13 or v14 token class names in src/
    docs/design/AUDIT.md shows zero unresolved items
    all seven gate commands green

REPORT AS YOU GO. After each row: what changed, file count, the contrast ratios you computed,
and which gate commands you ran with their result. If a row turns out to be bigger or
different from what AUDIT.md sized, say so and correct the audit — the audit is a hypothesis
about the code, and the code wins.

Do not stop between rows to ask permission. Stop only for: a layout/behaviour change, an
untokenised colour, a row over 40 files, a red gate you cannot fix, or a git push.
```

---

## Why it is shaped this way

The nine open decisions are pre-ruled in the prompt so the executor never blocks on taste.
Everything left is mechanical, gated, and checkable by grep — which is what makes it safe to
run without stopping between rows.

The order is not the audit's priority order. Deletions and one-line token edits come first
because they shrink every later diff: row 1 removes 95 retired-token uses for free, and row 2
fixes 28 shadows across 23 files by editing four lines. By the time the executor reaches the
big files, the greps are already quiet.

The landing page is row 8 of 12, deliberately. It is the reference implementation — it moves
last and least.
