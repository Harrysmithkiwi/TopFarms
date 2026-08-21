# Session handoff — 2026-08-01 (Phase 5, Stages 0–2)

Supersedes `docs/SESSION-HANDOFF-2026-07-30-PHASE-4.md`.

**State: `main` at `a09c384`. PR #84 MERGED and deployed to production. Working tree clean, no
open PRs. Repo total 947 → 445 inline styles (53% of Phase 5's migration done).**

**Next session: read `docs/PHASE-5-STAGING-PLAN.md` and start Stage 3.** Branch off fresh `main`.

***
Run tests like this, or the suite lies

    set -a; . ./.env; set +a
    npx playwright test

Playwright does **not** read `.env`. Without those two lines every role-gated spec skips and the
run reports green while testing nothing. That false-green is what hid seven defects until
2026-07-31.

Current: **27 passed / 0 failed / 10 skipped**, every skip reason-labelled (3 employer creds,
5 empty marketplace, 1 signup-flow, and one `/jobs/:id` case that flips pass↔skip with discovery
timing).

***
Phase 5 progress

| Stage | Scope | Status |
|---|---|---|
| 0 · get the suite honest | — | ✅ |
| 1 · marketing | 217 styles | ✅ **colour props 0**, 15 layout-only survivors, each commented |
| 2 · auth | 108 styles | ✅ 8 survivors, 4 colour (all third-party Facebook blue) |
| **3 · shared** | **73 styles, 18 files** | **next** |
| 4 · seeker dashboards | — | verifiable now (seeker cred exists) |
| 5 · admin | 182 styles | verifiable now (admin cred exists) |
| 6 · employer | 171 styles | **BLOCKED — no employer password** |
| 7 · 5.3 / 5.4 / 5.8 / 5.9 | — | pending |

Also complete earlier in the phase: 5.1b (`text-brand` sweep + gate rule), 5.2 (type scale),
5.5 (one loading idiom), 5.6 (error states, 24 sites), 5.7 (offline banner).

**Stage 3 is the delicate one.** `components/ui` is consumed by everything, and `SearchJobCard`,
`Tag`, `Button`, `MatchCircle` and `Toggle` all carry class contracts from Phase 4. Run
`npx vitest run tests/tap-targets.test.tsx tests/a11y-focus-motion.test.tsx` after **every** change
there. `Skeleton.tsx` and `ErrorState.tsx` are already token-clean — skip them.

***
What shipped to production in #84

24 commits, 98 files. User-visible:

- **Password reset survives a misconfigured redirect** (`RecoveryRedirect`) — verified live in the
  prod bundle after deploy
- `/jobs/:id` no longer renders the **404** on a dropped request
- **14 screens stopped claiming "nothing here"** on a failed fetch — including the employer
  applicant dashboard, which told paying employers nobody had applied
- Offline banner; one loading idiom; nav contrast 3.04:1 fixed
- A `cn()` bug that was **silently stripping text colours** across 44 call sites

***
Three defects worth remembering (all now in Claude memory)

1. **tailwind-merge reads custom size tokens as colours.** `twMerge('text-white','text-label')`
   returns `'text-label'` — colour dropped. Shipped a 3.43:1 CTA whose source said `text-white`.
   Fixed in `cn()` via `extendTailwindMerge`; guarded by `tests/cn-font-size-tokens.test.ts`.
   **Any new custom size token must be registered there in the same commit.**
2. **Prod is `www.topfarms.co.nz`; the apex 308s to it.** The Supabase redirect allowlist needs both
   hosts × (bare + `/**`) or every `redirectTo` falls back to Site URL and burns the recovery token.
   Fixed in the dashboard 2026-08-01.
3. **The retired v1 brand green `#7aaf3f` is still in the codebase** as raw `rgba()`. Phase 6's
   "final sweep" checked token *names*, not literals. Cleared from marketing; **may still exist in
   admin/employer/shared** — check as those stages land.

***
Tooling — `scripts/phase-5/` (delete at phase exit)

| Script | Use |
|---|---|
| `ledger.mjs` | regenerates `docs/design/phase-5-ledger.md`; **the authority** on what remains |
| `migrate.mjs <file>` | inline colour styles → utilities. Handles single- and multi-prop objects, `rgba()` alpha → `/NN`, `border`/`borderTop` shorthand, `borderRadius`, `backdropFilter`, `fontFamily`, `accentColor`, numeric `opacity`. **Reports what it cannot handle instead of dropping it** |
| `shot.mjs <label> <route...>` | before/after at 1200 and 360; stubs REST `/jobs` so `/jobs/:id` renders. Needs `npx vite preview --port 4173`; `SHOT_DIR` overrides output |

`migrate.mjs` output is **not trustworthy without reading the diff.** It converts only when every
property maps, but the surrounding edits still need eyes.

***
Rules paid for in blood this phase

1. **Never a positional regex when an exact block will do.** A regex targeting "the preceding
   className" stamped classes onto ~20 unrelated elements in three files. `tsc` was clean. Now:
   exact full-block string match with a `count == 1` assertion.
2. **Never pipe a command whose exit code you need.** `npx tsc -b | tail -3` reported success while
   tsc exited 2. Redirect to a file, read `$?`.
3. **Recover with `git show HEAD:<file>`, never `git checkout --`.** (Phase 4 §8.)
4. **Verify a measurement before planning around it.** Four separate counts in this phase were
   wrong: `text-brand\b` also matches `text-brand-hover`; BSD grep silently ignores `-P` so any
   lookahead does nothing; "6 `Loading...` sites" missed four spelled differently; "~99 text-brand
   sites" was really 37. Compute in node with a real regex when a count drives a decision.
5. **A check that cannot fail is not a check.** The admin auth setup and the marketplace guard were
   both that shape and both shipped. Prove every new gate trippable.

***
Operator actions outstanding, in value order

1. **Put `E2E_*` into GitHub secrets.** CI passes while skipping every role-gated spec. Six secrets:
   `E2E_{SEEKER,EMPLOYER,ADMIN}_{EMAIL,PASSWORD}`. Earlier advice was rotate-first; since rotation is
   deferred, set them now and update on rotation — ordinary secret hygiene.
2. **Employer password** for `harryssmith11@icloud.com` → `.env` as `E2E_EMPLOYER_PASSWORD`.
   Unblocks Stage 6 (171 styles on `PostJob` + 8 wizard steps — the revenue funnel).
3. **Post one real job.** Arms 5 currently-skipping checks in one action.
4. **Rotate the credentials** shared in the 2026-07-31 transcript. `admin@topfarms.co.nz` is
   full-access.

***
Documents

| File | What it is |
|---|---|
| **`docs/PHASE-5-STAGING-PLAN.md`** | **Start here.** Stage order and per-stage notes |
| `docs/PHASE-5-PROMPT.md` | The brief — locked decisions still hold |
| `docs/PHASE-5-MIGRATION-PROMPT.md` | Task 5.1 detail; its ordering is superseded by the staging plan |
| `docs/PHASE-5-CONTINUATION-PROMPT.md` | Owns 5.3 / 5.4 / 5.8 / 5.9 |
| `docs/design/phase-5-ledger.md` | The work list. Regenerate before trusting any count |
| `CLAUDE.md §9` | Verification discipline |
