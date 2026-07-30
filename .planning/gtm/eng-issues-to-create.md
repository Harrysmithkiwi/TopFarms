# Linear issues to create at Phase 1, Step 8 (TopFarms Eng)

*Staging list. These become real Linear issues when the `TopFarms Eng` team is
created (first-week-checklist.md Step 8), once Linear MCP is connected and the
operator says go. Nothing is created in Linear from this file directly.*

Step 8 already creates the **3 quality gates** named in `first-week-checklist.md`
(`tsc -b` errors · no frontend CI · bundle size). In addition, create:

## Issue: main has no branch protection + red CI = no production merge gate

- **Labels:** `quality-gate`
- **Priority:** medium–high (production merge safety)
- **Problem:** `main` has **zero branch protection** (verified 2026-07-02 — GitHub API returns `404 Branch not protected` for required_status_checks, enforce_admins, and required_pull_request_reviews). Separately, CI on `main` is **red** (`e2e`, `e2e-preview`, `quality` failing on docs-only PRs, so it's pipeline redness, not change-specific). Net: anything can merge to production `main` with no passing-CI gate and no review gate.
- **Impact:** production (topfarms.co.nz, Vercel auto-deploys from `main`) has **no merge gate**. A bad merge ships live. All session docs-PRs merged over red CI precisely because nothing blocks it.
- **Pairs with:** the existing "fix red CI" tech-debt + the Vercel-MCP build-log-visibility thread (carry-forward in `.planning/STATE.md`).
- **Proposed sequence (do NOT invert):**
  1. Fix red CI so `quality` + `e2e` are green.
  2. *Then* enable branch protection on `main` with those as required status checks + require ≥1 PR review.
  - Enabling protection **before** CI is green would block every merge — that's why the order matters.
- **Not fixing now** — backlog capture so it survives.
