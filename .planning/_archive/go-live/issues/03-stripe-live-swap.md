# Stripe test→live swap (PEND-01) — operator-owned pointer

Type: task
Status: open

## Question

Pointer only, so the launch frontier shows it: the authoritative 9-step checklist lives in
`.planning/DECISIONS-PENDING.md` § PEND-01 (key rotation across three surfaces, live-mode
webhook registration, $0.50 smoke charge + refund, idempotency re-delivery check).

**Operator-owned end to end** — live keys never pass through an agent session. Flagged as the
dependency of M4; also the sole blocker on `/gsd:complete-milestone v2.0`.

Engineering's only part: after the swap, verify the webhook fires 200 against the deployed
function and `placement_fees` reflects the smoke charge + refund (read-only checks).

Deferred twice before because it wants dedicated focus (2026-05-18 operator note). Day 5–6
is the slot this map assumes.
