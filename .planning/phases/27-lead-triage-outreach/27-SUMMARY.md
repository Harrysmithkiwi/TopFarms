# Phase 27 — Lead Triage & Lane-B Outreach (retroactive record)

**Status:** ✅ SHIPPED (built off-roadmap 2026-06; folded into the roadmap 2026-06-28 as v2.2 Phase 27).
**Milestone:** v2.2 Lead Acquisition & Admin Ops.

This phase was executed as the off-roadmap "leads-triage Phase 1" before the v2.2 milestone
existed. It is recorded here retroactively so the shipped work is legible on the roadmap. The
"Phase 1" label collided with v1.0 Foundation; canonical reference is **Phase 27**.

**Authoritative detail lives in `.planning/leads-triage/`:**
- `PHASE-1-SPEC.md` — the full build spec (Lane A/B model, schema, RPCs, Edge Fn, dashboard).
- `PUNCHLIST.md` — deferred items (P-4/5/8/9/10 → Phase 28; P-11 future/optional).

## What shipped (LEAD-01..04 closed; LEAD-05 open)
- Migrations **041–048** (Studio-applied): `lead_staging`→`leads`→`lead_suppression` pipeline,
  human-approval gate, `047` outreach columns + `lead_outreach_config` + `admin_outreach_*` RPCs,
  `048` broadened staging search. Deny-by-default RLS; gated SECURITY DEFINER RPCs; zero `jobs` touch.
- `lead-intake` Edge Function: Claude-Haiku extraction + FB fields + in-code Lane A/B + regex
  backstop + region alias canonicalisation + CORS/OPTIONS.
- Dashboard: `/admin/leads/staging`, `/admin/leads/outreach` (Lane B queue, manual-send), `/admin/leads`.
- Verified live on production (both lanes); admin sign-out + broadened search shipped as quick-fixes.

## Open carryforward
- **LEAD-05** — Lane B reply-draft is a placeholder until the operator supplies `lead_outreach_config`
  (do-not rules + voice + template + 6 groups); then the Claude draft assembly is wired (no further
  code change). Tracked, not blocking.
