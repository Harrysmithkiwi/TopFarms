# Leads triage — punch list (deferred, not yet actioned)

Captured during Phase 1 verification. Not on the critical path; revisit after Phase 1 close.

## P-3 — Staging keyword search is too narrow ✅ DONE (migration 048, verified on preview 2026-06-28)
**Symptom:** staged a Tirohanga lead; searching "Tirohanga" in Lead Staging returned nothing.
**Cause:** `admin_leads_staging_list` (migration 041) searches only
`structured->>'display_name'`, `structured->>'region'`, and `source`. A locality name that
lives in `raw_excerpt` (or in `role_or_category` / sub-region text) isn't matched.
**Fix (later):** broaden the search predicate — add `raw_excerpt` and likely `role_or_category`
(and consider `structured->>'application_method'`). Additive RPC change (CREATE OR REPLACE), no
schema change. Mirror the same broadening in `admin_leads_list` and `admin_outreach_list` for
consistency.

## P-4 — Lead Staging page UI/UX rework
**Symptom:** the page is functional but far from optimal.
**Scope:** full UI/UX brief for the Lead Staging surface (and likely the Outreach queue +
Leads pipeline alongside it) — to be written as a separate brief after Phase 1 closes.

## P-5 — Display name / card formatting is clunky
**Symptom:** North Canterbury staged with display_name "110ha Pivot-Irrigated Dairy Farm,
Rotherham" instead of a clean business name. The Claude extraction puts a descriptive listing
title into display_name when no business name is present.
**Fix (later, UI/UX pass):** clean card formatting — prefer a real business name, truncate/format
the descriptive title, surface locality separately. Possibly tighten the emit_leads prompt so
display_name prefers a business/farm name over a listing headline. Cosmetic; bundle into the
UI/UX rework (P-4).

## P-6 — Sign-out button in admin nav ✅ DONE (verified on preview 2026-06-28)
Pinned bottom of AdminSidebar; `useAuth().signOut()` → lands on admin login.

## P-8 — Surface the locality on lead cards/rows
**Symptom:** leads show only the region (e.g. "Waikato"), not the specific locality/town from
the post (e.g. "Tirohanga"). The locality is in raw_excerpt / the post body but never displayed.
**Fix (UI/UX pass):** extract + show the locality alongside region on the card and list row.
Pairs with P-5 (display-name formatting) and P-10.

## P-9 — Password show/hide toggle on the admin login
**Symptom:** admin login password field has no reveal affordance.
**Fix (UI/UX pass):** add an eye-icon show/hide toggle (the main SignUp form already has this
pattern — mirror it).

## P-10 — Search result row doesn't show the matched term
**Symptom:** searching "Tirohanga" returns the Halter Farm row, but the row shows only "Waikato"
— the matched word (locality) isn't visible, so it's unclear why the row matched.
**Fix (UI/UX pass):** surface the matched locality/term on the result row. Pairs with P-8.

## P-11 — Harden the admin door (FUTURE / OPTIONAL — security, not on any current path)
**Context:** current auth is two authentication doors (normal `/login` + dedicated `/admin`
login) converging on one role-based authorization gate (`requiredRole="admin"` on every route +
`_admin_gate()` on every RPC + RLS). Sound as-is — the role is the boundary, checked everywhere.
**Optional enhancement (only if desired):** narrow admin *authentication* specifically — e.g.
block admin accounts from signing in via the normal `/login` (force the `/admin` door), and/or
add 2FA on the admin login. Deliberate hardening, NOT a bug fix. Do not action unless requested.
