# Phase 1 Build Spec — FB lead triage → fields + lane + drafted reply

> **Status:** APPROVED 2026-06-27. Build target: *paste a FB post → extracted fields + Lane A/B
> classification + a Claude-drafted reply the founder approves and sends manually.*
> Sequenced for fastest path to first drafted reply; analytics + Sheets come later.

## Gates
- **T0 (done):** parked 046 + dashboard pair committed (`2216db6`, branch `feat/leads-triage`).
- **046 applied:** operator confirms via Studio + 3 checks (columns `category`/`follow_up_date`,
  `leads_status_check` includes `follow_up`, `admin_lead_categorise` exists). **Phase 1 code may be
  written before this; 047 apply + Edge Fn deploy wait until 046 is confirmed applied.**
- **Reply-draft config (A4/D):** required input before the draft step is wired — do-not rules +
  6-group list + voice guide + template, supplied as a `lead_outreach_config` row (NOT code).

## Decisions locked
- **Lane classification is in code, not LLM:** `lane = (contact.email || contact.phone) ? 'a' : 'b'`,
  with a **regex backstop** that promotes any clear email/phone found in `application_method`/raw text
  into `contact` before the test (guards against misfiled Lane B). KEPT.
- **Outreach state = columns-on-`lead_staging`** (not a dedicated table) for shipping speed.
  Additive, so promoting to a dedicated table later is **not a one-way door** if we outgrow it.
- **Additive-only 047.** No change to any 041–046 RPC/logic. **Zero `jobs`-table touch.**
- **Manual-send is the default.** Automation stays on the *draft* side; the human sends. Agent-send
  is a disabled, feature-flagged stub only (not built in Phase 1).

## ⚠️ REQUIRED FOLLOW-UP (condition of the columns-on-staging choice)
**Before any Lane B outreach can age past 30 days**, amend the 041 `lead-staging-purge` cron to spare
active outreach:
```sql
-- reschedule (cron.schedule is idempotent on name): pending branch gains
--   AND outreach_status NOT IN ('approved','sent','responded')
```
Rationale: the 041 purge deletes `pending` rows >30d; a sent-but-unresponded Lane B row is still
`pending` and would be deleted with its draft + sent record. Adopted fix = **(a) reschedule the cron**
(operator's explicit choice 2026-06-27) — a known, written follow-up rather than silent risk. Not on
the first-drafted-reply path, so it does not block Phase 1; it blocks letting outreach backlog age.

---

## A. Edge Function — extend `lead-intake`

**A1. `emit_leads` tool-schema additions** (Claude Haiku). Current per-lead shape:
`{type, display_name, region, role_or_category, contact{email,phone,url}}`. Add (all nullable,
**NEVER-INFER** — null unless literally in the post):
```jsonc
{
  "shed_type":          "string|null",  // "rotary" | "herringbone" | "60-bail rotary" — verbatim
  "herd_details":       "string|null",  // "550 cows, split calving"
  "application_method": "string|null",  // VERBATIM: "PM me", "email jane@x.co.nz", "call 027…"
  "contact": { "email":"…|null","phone":"…|null","name":"…|null","notes":"…|null" } // + name, notes
}
```
`post_url`, `source_group`, `post_timestamp` = **founder-supplied paste metadata, NOT Claude-extracted**
(no hallucinated URLs). Passed as Edge-Fn input params, merged into `structured` after the Claude call.
`post_url` → `source_ref` (existing dedupe key). `source = 'fb_manual_capture'` (already in 041/044 CHECK).

**A2. Lane classification — in code:**
```ts
// regex backstop first: scan application_method + raw text for a clear email/phone,
// promote into contact if Claude missed it; THEN:
const lane = (contact?.email || contact?.phone) ? 'a' : 'b'
```

**A3. Region canonicalisation — consistency fix.** Port `lead-harvest`'s `NZ_REGIONS` + `REGION_ALIASES`
+ `canonicalRegion()` into `lead-intake` (today: exact-match-or-null, no aliases). Inline copy per the
044 no-shared-module precedent. Deliberate behaviour change, flagged.

**A4. Draft step — ⚠️ PLACEHOLDER (swappable config).** If `lane==='b'`, draft the FB reply via Claude
using the prompt-config loaded from the `lead_outreach_config` DB row (see D). Wording is operator input,
not code. **Not wired until the config row is supplied.** Until then the seed writes a placeholder draft.

**A5. Write path (no 041 touch):**
```
structured = { type, display_name, region(canon), role_or_category,
               shed_type, herd_details, application_method, contact{…},
               source_group, post_timestamp, lane }     // lane + FB fields ride INSIDE structured
→ _lead_intake(source='fb_manual_capture', source_ref=post_url, raw_excerpt=postText, structured, confidence)
   // 041 _lead_intake passes structured through UNTOUCHED → suppression + dedupe gate intact
→ if lane==='b': _lead_outreach_seed(staging_id, draft, model)   // sets the new outreach columns
```

## B. Migration 047 — additive only
```sql
-- ❶ outreach workflow state (MUTABLE) → columns on lead_staging
ALTER TABLE public.lead_staging
  ADD COLUMN IF NOT EXISTS outreach_status text NOT NULL DEFAULT 'none'
    CHECK (outreach_status IN ('none','drafted','approved','sent','responded','skipped')),
  ADD COLUMN IF NOT EXISTS drafted_reply text,
  ADD COLUMN IF NOT EXISTS draft_model   text,
  ADD COLUMN IF NOT EXISTS sent_at       timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at  timestamptz;
-- lane + FB fields are NOT columns — they live in structured (jsonb), set at intake.

-- ❷ preferred_path STUB on leads (Phase 3 populates; analytics Phase 5)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferred_path text
    CHECK (preferred_path IS NULL OR preferred_path IN ('human','self_serve'));

-- ❸ swappable prompt-config (single row); content = operator input, mechanism = code
CREATE TABLE IF NOT EXISTS public.lead_outreach_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  do_not_rules jsonb NOT NULL DEFAULT '[]',
  voice_guide  text, template text,
  groups       jsonb NOT NULL DEFAULT '[]',   -- [{name,url,norms}]
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_outreach_config ENABLE ROW LEVEL SECURITY;  -- deny-by-default, RPC-only

CREATE INDEX IF NOT EXISTS lead_staging_outreach_idx
  ON public.lead_staging (outreach_status) WHERE outreach_status <> 'none';
```
Does not touch `_lead_intake`, `_lead_fingerprint`, `admin_lead_approve/reject/categorise/set_status`,
or any 041–046 RPC. Zero `jobs` touch. Apply via Studio (registry-rowless), idempotent, AFTER 046.

## C. RPC signatures (023 pattern: `_admin_gate()` first, `SET search_path=public`, jsonb out, audit on mutation)
```
_lead_outreach_seed(p_staging_id uuid, p_draft text, p_model text) RETURNS jsonb   -- service_role only
admin_outreach_list(p_search text=NULL, p_limit int=25, p_offset int=0) RETURNS jsonb  [STABLE]
   -- WHERE structured->>'lane'='b' AND outreach_status IN ('drafted','approved','sent','responded')
admin_outreach_update_draft(p_staging_id uuid, p_draft text, p_status text='approved') RETURNS jsonb
admin_outreach_mark_sent(p_staging_id uuid) RETURNS jsonb        -- 'sent', sent_at=now()
admin_outreach_skip(p_staging_id uuid, p_reason text=NULL) RETURNS jsonb   -- 'skipped'
admin_outreach_get_config() RETURNS jsonb  [STABLE]
admin_outreach_set_config(p_config jsonb) RETURNS jsonb         -- swap wording without code
```
Grants: `REVOKE ALL … FROM PUBLIC, anon`; `_lead_outreach_seed` → `service_role`; rest → `authenticated`.

## D. Reply-draft config contract (swappable, no code change)
`lead_outreach_config` row read at draft time:
```jsonc
{ "do_not_rules":[ "…" ], "voice_guide":"…", "template":"…", "groups":[ {"name":"…","url":"…","norms":"…"} ] }
```
Edit via `admin_outreach_set_config` (settings panel or paste JSON). Phase 1 builds the mechanism;
operator supplies content. A4 not finalised until it lands.

## E. Dashboard states / transitions
**Staging review** (`/admin/leads/staging`, existing): lane badge (A/B) per row (reads
`structured->>'lane'` — no 041 RPC change) + FB fields in detail panel. Lane A → existing approve/reject.

**Outreach queue** (`/admin/leads/outreach`, NEW route + sidebar entry) — Lane B work surface:
```
drafted ─[Edit]→(inline)─[Approve draft]→ approved ─[Copy reply + Mark sent]→ sent ─[Mark responded]→ responded
   └─[Skip]→ skipped                                                                          │
                                                          (Phase 2: add contact → admin_lead_approve → lead)
```
- drafted: post + draft side-by-side; Edit / Approve / Skip / (optional) Regenerate.
- approved: "Copy reply & mark sent" (copies + sets sent). **Manual send — founder pastes into FB.**
- sent → responded: "Mark responded" (Phase 2 → add-contact-and-approve).
Lane A needs no new surface in Phase 1.

## Deferrals
- preferred_path: stub column only (Phase 3 wires UI; Phase 5 funnel).
- Conversion = first PAID Stripe invoice — Phase 5 needs the invoice/placement-fee join target.
- Per-path funnel (human vs self_serve → signup → first job → paid; slice region + recruiter/direct) — Phase 5.
- Sheets mirror (daily one-way, single denormalised tab) — Phase 6, last.

## Build order within Phase 1
1. 047 migration (DDL + RPCs).  2. `lead-intake` extension (A1–A3, A5; A4 placeholder).
3. Dashboard outreach queue + lane badge + FB fields.  4. Apply 047 (Studio, after 046) + deploy Edge Fn + verify.
5. Drop in `lead_outreach_config` content → finalise A4 draft step.
