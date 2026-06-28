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

## P-4 — Lead Staging page UI/UX rework ✅ DONE (scoped) — shipped 2026-06-28 (PR #7, merge 13465c6)
**Shipped:** Lead Staging + Outreach reworked to the Daily-Briefing visual language — `DrawerShell`
detail (replaces inline `border-2` panels), capture demoted behind one "Capture / Paste post"
button (queue primary), `Tag` badges with `warn` de-overloaded, lucide icons, `px-4` alignment,
standard section labels + type scale. Operator visual-verified on preview.
**Deferred to a follow-up (not done):** Daily Briefing pass, Leads pipeline page, P-9.

## P-5 — Display name / card formatting is clunky
**Symptom:** North Canterbury staged with display_name "110ha Pivot-Irrigated Dairy Farm,
Rotherham" instead of a clean business name. The Claude extraction puts a descriptive listing
title into display_name when no business name is present.
**Fix (later, UI/UX pass):** clean card formatting — prefer a real business name, truncate/format
the descriptive title, surface locality separately. Possibly tighten the emit_leads prompt so
display_name prefers a business/farm name over a listing headline. Cosmetic; bundle into the
UI/UX rework (P-4).
**✅ DONE 2026-06-28 (PR #7):** `formatLeadName` (src/lib/leadDisplay.ts) cleans the title at
render (strips trailing-locality tail, caps length, full value on hover). `lead-intake` emit_leads
prompt now prefers a clean display_name over a listing headline (deployed via CI). Prompt change
applies to NEW leads going forward.

## P-6 — Sign-out button in admin nav ✅ DONE (verified on preview 2026-06-28)
Pinned bottom of AdminSidebar; `useAuth().signOut()` → lands on admin login.

## P-8 — Surface the locality on lead cards/rows
**Symptom:** leads show only the region (e.g. "Waikato"), not the specific locality/town from
the post (e.g. "Tirohanga"). The locality is in raw_excerpt / the post body but never displayed.
**Fix (UI/UX pass):** extract + show the locality alongside region on the card and list row.
Pairs with P-5 (display-name formatting) and P-10.
**✅ DONE 2026-06-28 (PR #7):** `regionLocalityLabel` shows "Region · Locality" on rows + detail.
`lead-intake` now extracts a never-infer `structured.locality` (deployed via CI). Populates for
NEW leads going forward; existing rows fall back to region-only or a display_name-tail-derived
locality. Watch: confirm new pastes surface the town in prod.

## P-9 — Password show/hide toggle on the admin login
**Symptom:** admin login password field has no reveal affordance.
**Fix (UI/UX pass):** add an eye-icon show/hide toggle (the main SignUp form already has this
pattern — mirror it).

## P-10 — Search result row doesn't show the matched term ✅ DONE — verified on preview 2026-06-28 (PR #7)
**Symptom:** searching "Tirohanga" returns the Halter Farm row, but the row shows only "Waikato"
— the matched word (locality) isn't visible, so it's unclear why the row matched.
**Fix (UI/UX pass):** surface the matched locality/term on the result row. Pairs with P-8.
**Shipped:** `matchSnippet` (src/lib/leadDisplay.ts) — `AdminTable` passes the search term to
`renderRow`; when the hit is only in hidden raw-post text, the row shows a "matched: …term…"
line under the name. Operator confirmed: "tirohanga" → Halter Farm with the matched snippet.

## P-11 — Harden the admin door (FUTURE / OPTIONAL — security, not on any current path)
**Context:** current auth is two authentication doors (normal `/login` + dedicated `/admin`
login) converging on one role-based authorization gate (`requiredRole="admin"` on every route +
`_admin_gate()` on every RPC + RLS). Sound as-is — the role is the boundary, checked everywhere.
**Optional enhancement (only if desired):** narrow admin *authentication* specifically — e.g.
block admin accounts from signing in via the normal `/login` (force the `/admin` door), and/or
add 2FA on the admin login. Deliberate hardening, NOT a bug fix. Do not action unless requested.

---

# Phase 28b — Triage-power round (NEXT INCREMENT — filed 2026-06-28, not yet actioned)

Founder's-eye follow-up to the Phase 28 visual rework (P-4). The rework made the lead surfaces
*clean*; this round makes them a *fast triage tool* — answering "what's Lane B / what's fresh /
what's unactioned" at a glance, without opening each lead. To be scoped as a focused round.

## T-1 — Sortable columns + lane/status on the row (HIGHEST VALUE)
**Need:** triage the queue without opening each lead. Surface lane (A/B) and status directly on
the staging row, and make columns sortable (captured date, confidence, lane, region). The founder
needs to answer "what's Lane B / what's fresh / what's unactioned" at a glance.
**Note:** `AdminTable` currently sorts server-side by `created_at DESC` only — sortable columns
likely need the `admin_leads_staging_list` RPC to accept a sort param, or client-side sort over
the loaded page. Decide page-vs-server sort during scoping.

## T-2 — Separate harvested vs hand-captured leads
**Need:** bulk-harvested leads (NZ Farming Jobs etc.) and the founder's own hand-captures are
different workflows; own captures shouldn't be buried under harvested volume. Filter or split by
source/origin (the `source` field already distinguishes `fb_manual_capture` / `nzfarmingjobs` /
harvested lanes — a filter toggle or grouped view).

## T-3 — Region·Locality column too narrow ✅ DONE 2026-06-28 (PR #8)
**Symptom:** "Canterbury · Rotherham" wrapped to 3 lines in the Region·Locality column.
**Shipped:** Lead Staging table trimmed to 4 work-the-lead columns (Name · Contact ·
Region·Locality · Source); Via/Confidence/Dedupe moved to the drawer; `whitespace-nowrap` on
Region·Locality + Source. No wrap, no horizontal scroll. Operator-verified on preview.

## T-4 — Matched-snippet truncates mid-word
**Symptom:** `matchSnippet` cuts mid-word ("…farm locate…").
**Fix:** snap the snippet window to whole-word boundaries, and/or highlight (bold) the matched
term within the snippet. Lives in `src/lib/leadDisplay.ts:matchSnippet` — extend the existing
helper + its tests.

## T-5 — Outreach sort-by-status
**Need:** as Lane B leads accumulate, the Outreach queue needs sort/grouping by `outreach_status`
(drafted vs approved vs sent vs awaiting-response) so in-flight work is separable from done.
Pairs with T-1 (same sortable-column mechanism, applied to `admin_outreach_list`).

---

# Latent bugs (filed, not actioned)

## L-1 — Placements "Hired" column dead-state
**Symptom:** on `/admin/placements` the **"Hired"** column renders a Tag keyed on `confirmed_at`
(`confirmed_at ? "Hired" : "Pending"`), but `admin_list_placements` (migration 023) only returns
rows where `acknowledged_at IS NOT NULL AND confirmed_at IS NULL`. So `confirmed_at` is always
null in this list → the column can never render anything but "Pending"; the "Hired" branch is
dead. (Also a label-truth nuance: `confirmed_at` means *fee invoiced*, not *hired* — the hire is
implied at acknowledgement.) Found during the Phase-28 polish jargon pass; not on any current
path.
**Decide later (when actually working placements):** wire a confirmed/invoiced view (show
acknowledged + invoiced rows and let this column distinguish them), OR relabel the column to
match what it really tracks, OR drop it. Behaviour question, not jargon — deferred per operator.

---

# Optional voice tweaks (Lane B outreach config)

## V-1 — Macron-on for place names (optional)
**Context:** the outreach reply-config (`docs/_canonical/TopFarms_Outreach_Reply_Config.md` +
`049_seed_outreach_config.sql`) writes place names without macrons (e.g. "Taupo", not "Taupō").
Operator read the live samples and is inclined to leave it — reads fine / authentically casual.
**If wanted later:** one-line addition to the config `voice_guide` (e.g. "use macrons on Māori
place names: Taupō, Whangārei, Ōtorohanga"). Not a code change — edit the doc, re-run the 049
seed in Studio. Deferred per operator; not blocking LEAD-05.

## V-2 — Don't reference a poster's private difficulties too directly (optional)
**Context:** the first live Sonnet draft (Tirohanga, 2026-06-28) wrote "given the circumstances",
referencing the poster's staffing situation. It reads slightly knowing/presumptuous on a public
FB comment. The manual approve gate catches it per-post, so not urgent.
**If wanted later:** one-line addition to the config `voice_guide` or hard rules (e.g. "Don't
reference the poster's private difficulties or speculate about why they're hiring; stick to what
the post plainly states"). Edit the doc + re-run the 049 seed in Studio. Deferred per operator.
