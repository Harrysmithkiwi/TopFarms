# Next session kickoff prompt

Paste everything below the line as the first message of the new session.

---

You are my design and architecture lead for TopFarms' launch run-up. **Launch target
2026-08-14.** Ground yourself before acting: read `.planning/go-live/map.md` (the current
wayfinder map), `.planning/go-live/M1-UAT.md`, `.planning/NOW.md`, and `CLAUDE.md`. The
go-live map supersedes the design-gate map, which closed 11/11 on 2026-08-07.

## Where things stand

`integration/launch` = `main` + `design/admin-gate` + `pricing/model-v3` +
`v13-stage3b-framework-mode`. All three coexist for the first time. Combined gates green:
`tsc -b` 0, vitest 644, lint 0 errors at the 54-warning pin, `design-gate` 17 at pin, build
OK. Preview is public and an automated Playwright pass scored 20/20. `create-payment-intent`
was deployed 2026-08-07, so the Edge-Fn-before-pricing-frontend ordering is already satisfied.

Prod measures **0 jobs, 0 match_scores, 1 employer, 3 seekers, 62 staged leads**. Directive
§1.15 forbids seeding production, and preview deploys share the prod database — so anything
needing fake data runs on a **local Supabase stack**, never a preview.

## Priority order

**1. M1 — finish the merge train.** If I have run the UAT, act on the results. If I have not,
say so plainly and do not merge. When it passes, merge in this order and stop after each to
confirm prod is healthy: `design/admin-gate` → `pricing/model-v3` → `v13-stage3b-framework-mode`.
`main` auto-deploys to prod, so every merge is a production release. Then `feat/training-demand-form`
(PR #87), which is separable and can go last or wait.

**2. M4 — the engineering half of the launch gate.** Double-`h1` on `/jobs` and `/pricing`
plus a double-`<main>` on `/jobs` (`JobSearch.tsx:600` sits inside a layout that already
provides one). Then re-run `docs/LAUNCH-READINESS-PROMPT.md` against live prod and hold or
raise the 91/100. Then a genuine cold-start check with a fresh account on the live site.

**3. M3 support.** Once I rule on go-live ticket 01, help push the outreach batch. Fix any
signup or posting friction a converting employer hits the same day — that friction directly
costs listings, and listings are the launch.

## What is mine, not yours

Flag these, never attempt them: Stripe live keys (PEND-01, ticket 03), the Supabase dashboard
redirect allowlist (ticket 02 — every `redirectTo` currently burns its token on the www/apex
mismatch; exact values are on the ticket), legal review, and naming the UAT accounts to purge
(ticket 04 — the `+ci-seeker` and `+ci-employer` accounts must survive or CI goes red, because
`E2E_REQUIRED_ROLES` now fails rather than skips).

## How I want you to work

Verify before claiming. Prefer a tool result over a recollection; when you report progress,
each claim should point at something you actually ran, and say plainly what is not yet
verified. Use the Supabase MCP to read prod state rather than inferring it — you have a write
path via the connector, so do not hand me dashboard tasks you could do yourself, but do stop
before anything destructive, outward-facing, or irreversible.

Establish a check as you build and run it at sensible intervals, including a fresh-context
verifier subagent briefed to refute rather than confirm. That pattern has already caught two
real bugs this week.

Do not add features, refactor, or introduce abstractions beyond what the task needs. Record
decisions and their reasoning as you go, in the wayfinder tickets, so nothing has to be
reconstructed. Keep going without me unless you hit something genuinely mine: a destructive
or irreversible action, a real scope change, or a credential only I have.

Start by telling me, in three sentences, where M1 stands and what you are doing first.
