# Parser Field Extension + `raw_ingest` Landing Zone — Build Plan

> **Created:** 2026-07-08 (Stage-2 remediation, product-specs workstream). **Status: BUILD PLAN for two already-made design decisions — this is not a re-design.**
> The decisions live in `.planning/INGESTION-ARCHITECTURE.md`: §5.1.1 `raw_ingest` (operator §7.1 — **✅ YES, decided 2026-07-02**, transient, 30-day clock) and §5.1.2 `contact_phone_norm` (designed, unbuilt). The gaps are audit-confirmed: the parser drops accommodation / roster / right-to-work / start-timing ("volunteered in prose but dropped today", `TopFarms_Platform_Audit.md` §2.5 LH-2), phone dedup is missing (LH-3), and raw text is discarded so extraction can never be re-run (`INGESTION-ARCHITECTURE.md` §1 invariant 2 — "the single biggest robustness upgrade").
> Labels: [V]/[A]/[MODELLED]/[OPINION]. Sizes are solo-founder + AI.

---

## 1. Scope — three additive changes, one Edge Function, two-ish migrations

1. **Four new `structured` keys** in the Haiku parser: `accommodation`, `roster`, `right_to_work`, `start_timing`.
2. **`raw_ingest` landing zone** exactly per the §5.1.1 shape, + `p_raw_ingest_id` on `_lead_intake()`.
3. **`contact_phone_norm` dedup key** per §5.1.2/§5.3.3.

Explicitly NOT in scope (already decided elsewhere, don't reopen): FB automation level (assisted capture, §7.2), Seek/TradeMe mechanism (own research task, §7.3), Sheets adapter (parked, §7.4), Sonnet retry tail (deferred, §7.5), and the deferred lead-harvest items in MEMORY (60s-gateway `EdgeRuntime.waitUntil` scale fix, non-NZ drop).

---

## 2. New `structured` keys

Same shape discipline as the existing FB-extract fields (`shed_type`, `herd_details`, `application_method` — verbatim strings, NEVER-INFER, null-unless-stated, `lead-intake/index.ts:107-114` and prompt lines 418-424). **Verbatim text, not parsed enums** — enum coding happens downstream (Index aggregation / dataset coding, §5), where a human or a bigger model can be second-guessed. The extractor's only job is faithful capture.

| Key | Type | Verbatim examples (from the study rows, `TopFarms_Combined_Data.md`) | Emitted for |
|---|---|---|---|
| `accommodation` | `string \| null` | "3-bed house w/ fireplace" (E01) · "own accommodation required, shared not ideal" (S21) · "drive-in (no accom)" (E12) | both types — offered (employer) or needed (seeker); the `type` field disambiguates |
| `roster` | `string \| null` | "8/3 all year round" (E01) · "5-2 (6-2 through calving)" (E02) · "every 2nd weekend off" (S27) | both |
| `right_to_work` | `string \| null` | "NZ citizens only" (E02) · "not accredited — must have right to work" (E07) · "AEWV (expires 2028)" (S16) | both — restriction (employer) or status (seeker) |
| `start_timing` | `string \| null` | "ASAP" · "start 20 Jul – end Aug" (E12) · "Calving 2026" (S34) | both |

**The explicit-only rule extends unchanged:** null unless literally present in the post, listed in `missing_fields` when absent, no inference — the same sentence that already governs `contact` (`lead-intake/index.ts:421-424`) covers all four; they get named in it.

### 2.1 Prompt diff sketch (`structureWithClaude`, `lead-intake/index.ts:403-425`)

```diff
   'application_method = VERBATIM how to apply ("PM me", "email jane@x.co.nz", "call 027…").',
+  'accommodation = VERBATIM what the post says about accommodation, offered or',
+  'needed ("3-bed house", "drive-in, no accom", "own accommodation required").',
+  'roster = VERBATIM roster/hours if stated ("8/3", "5-2, 6-2 through calving",',
+  '"every 2nd weekend off").',
+  'right_to_work = VERBATIM any visa/citizenship/accreditation statement',
+  '("NZ citizens only", "not accredited employer", "AEWV expires 2028").',
+  'start_timing = VERBATIM start/availability timing ("ASAP", "start 20 July",',
+  '"Calving 2026", "next season").',
-  'NEVER guess or infer absent fields — use null and list them in',
+  'NEVER guess or infer absent fields — accommodation, roster, right_to_work,',
+  'start_timing and contact especially — use null and list them in',
   'missing_fields. Only include contact details EXPLICITLY stated in the',
```

Plus, mechanically: the four keys added to the `emit_leads` `input_schema` `required` list and `properties` (as `{ type: ['string','null'] }`, `lead-intake/index.ts:439-472`), to the `StructuredLead` interface (:100-115), to the fallback object (:373-384), to the post-parse normalisation map (:497-506), and to the staged `structured` payload (:239-252). The keys ride through `_lead_intake()` untouched — 041 stores the whole jsonb blob (041:57), so **no `lead_staging` DDL is needed for this part** (the 047 header note confirms the pattern: "fields ride INSIDE lead_staging.structured … passed through 041's _lead_intake untouched").

### 2.2 `leads` columns at approval

The audit's LH-2 artefact line names "`leads` columns" [V — audit §2.5]. Additive, 044-style:

```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS accommodation text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS roster text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS right_to_work text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS start_timing text;
-- + admin_lead_approve CREATE OR REPLACE carrying the four keys across,
--   exactly the 044:43-98 precedent (which added salary_text etc. the same way).
```

### 2.3 Mirror in the Firecrawl lane

`lead-harvest` (the boards parser, employer-only) extracts business/role/region/salary/contact today [V — audit §1.8]. Add the same four keys to its Firecrawl JSON schema so both parsers emit one vocabulary (`TopFarms_Master_Report.md:104` — "the same parser vocabulary"). Boards state roster/accommodation less often than FB posts do; nulls are fine and expected.

---

## 3. `raw_ingest` landing zone

DDL per the decided §5.1.1 shape — reproduced, not re-designed:

```sql
CREATE TABLE IF NOT EXISTS public.raw_ingest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,            -- same vocab as lead_staging_source_check (044:33-34)
  source_ref text,
  natural_key text NOT NULL,       -- source_ref where stable; else content hash
  content_hash text,
  payload jsonb NOT NULL,          -- the raw content, verbatim
  captured_at timestamptz NOT NULL DEFAULT now(),
  adapter_ver text,
  process_status text NOT NULL DEFAULT 'landed'
    CHECK (process_status IN ('landed', 'extracted', 'staged', 'error')),
  error text,
  UNIQUE (source, natural_key)     -- idempotency at the door (§1 invariant 5)
);
ALTER TABLE public.raw_ingest ENABLE ROW LEVEL SECURITY;
-- Deny-by-default, zero client policies; service_role writes, admin reads via a
-- gated RPC — the lead_harvest_runs posture, as §5.1.1 specifies.
```

Wiring:

- **`_lead_intake()` gains `p_raw_ingest_id uuid DEFAULT NULL`** and `lead_staging` gains `raw_ingest_id uuid REFERENCES raw_ingest(id) ON DELETE SET NULL` — the staging→raw provenance pointer (§5.1.1). `DEFAULT NULL` keeps every existing caller valid; Postgres treats the added parameter as a new function signature, so the migration must `DROP FUNCTION` the old 6-arg form after re-granting (or `CREATE OR REPLACE` the 7-arg and revoke/re-grant per the 041:392-402 grant block) — one careful block, not a redesign.
- **`lead-intake` Edge Function lands raw first:** per item, insert into `raw_ingest` (`ON CONFLICT (source, natural_key) DO NOTHING` → conflict = duplicate delivery, skip cheaply — this makes Apify's at-least-once webhook retries idempotent *before* any Haiku spend, strengthening the existing dedupe-on-source_ref note at `lead-intake/index.ts:183-184`), then structure, then call `_lead_intake(..., p_raw_ingest_id)`, then update `process_status` ('staged' | 'error' + message). `natural_key` = `source_ref` when present, else sha256 of `raw_text` (the §1.1 contract rule for keyless paste).
- **Re-extraction is the payoff:** a replay path (admin-invoked, batch) reads `raw_ingest` rows and re-runs `structureWithClaude` with an improved prompt — never re-scrapes, never re-asks the founder to re-paste. v1 ships the *table and provenance*; the replay script itself is a small follow-up (§6 #7) — landing raw is what makes it possible at all.

### 3.1 Retention — consistent with the 30-day staging posture

Operator decision §7.1: "transient with the 30-day clock" [V — `INGESTION-ARCHITECTURE.md:332-334`]. Extend the existing weekly purge cron (041:413-419) rather than adding a second schedule:

```sql
-- appended to the 'lead-staging-purge' weekly cron body:
DELETE FROM public.raw_ingest WHERE captured_at < now() - interval '30 days';
```

No carve-outs: `error` rows must be retried within their 30 days or they purge with everything else — raw is a working buffer, not an archive (that's the §5.1.1 privacy trade the operator already accepted). Cron change verified by jobid + a `cron.job` SELECT, never the Studio banner (MEMORY: Studio silent-partial-paste rule).

---

## 4. `contact_phone_norm` dedup key

Per §5.1.2 ("Phone, when present, is the strongest cross-source identity key") and §5.3.3 (phone match → `suspect_duplicate`, human arbitrates — **never** auto-merge).

### 4.1 NZ normalisation rule

E.164, mirroring the digits the intake regex already accepts (`PHONE_RE`, `lead-intake/index.ts:79`):

```sql
CREATE OR REPLACE FUNCTION public._phone_norm(p_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN d LIKE '64%'  THEN '+' || d                       -- bare country code
    WHEN d LIKE '0%'   THEN '+64' || substring(d from 2)   -- domestic 0-prefix
    ELSE NULL                                              -- not confidently NZ: store nothing
  END
  FROM (SELECT regexp_replace(coalesce(p_raw, ''), '[^0-9]', '', 'g') AS d) t
  WHERE length(d) BETWEEN 8 AND 12 OR d = '';
$$;
```

Rules, stated plainly: strip everything non-digit (spaces, dashes, parens, the `+`); `+64…`/`64…` → `+64…`; leading `0` dropped and replaced with `+64`; anything that doesn't confidently normalise → **NULL, not a guess** (the never-infer rule applies to derived fields too). Length bounds reject fragments. `ponytail:` NZ-only on purpose — AU/UK prefixes are a two-line CASE extension when a non-NZ lane actually exists.

### 4.2 Schema + dedup wiring

```sql
ALTER TABLE public.lead_staging ADD COLUMN IF NOT EXISTS contact_phone_norm text;
ALTER TABLE public.leads        ADD COLUMN IF NOT EXISTS contact_phone_norm text;
CREATE INDEX IF NOT EXISTS leads_phone_norm_idx ON public.leads (contact_phone_norm)
  WHERE contact_phone_norm IS NOT NULL;
```

- `_lead_intake()` computes `_phone_norm(p_structured->'contact'->>'phone')` at the door and inserts it on the staging row.
- **New dedup layer** between the existing fingerprint check (041:121-137) and the fuzzy-name check (041:139-150): a `leads` (or pending-staging) row with the same non-null `contact_phone_norm` → `suspect_duplicate` with the candidate id — surfaced side-by-side in the existing staging drawer, human decides. Deliberately *suspect*, not *exact*: one phone can legitimately front two lanes (a farm's employer post and its manager's seeker-side relief post), per §5.3's no-auto-merge rationale.
- `admin_lead_approve` carries the value to `leads` (same CREATE OR REPLACE as §2.2).
- The 6-month anonymise cron (041:427-432) adds `contact_phone_norm = NULL` to its SET list — it's PII-derived and must strip with the rest.

---

## 5. How this feeds the Index and the dataset coding template

**Index dependency (the reason this builds first):** three of the Index's marquee cuts — `accommodation_offered_rate`, `rtw_restriction_rate`, `roster_pattern_mix` (`docs/commercial/INDEX-SPEC.md` §2.1/§3) — aggregate exactly these four keys. Until this ships, those cuts have only the 47 hand-coded study rows behind them. The Index's `_index_snapshot_build()` reads the new `leads` columns (§2.2), applies its own k/n rules, and does the verbatim→category coding at aggregation time (e.g. `right_to_work ILIKE '%citizen%'` → restriction bucket) — coding lives there, not in the parser, so a coding fix never requires re-extraction.

**Dataset coding template** — the audit's standing instruction: "keep one column-mapping note so future harvested batches code against the same vocabulary the parser emits" [V — audit §5]. This table is that note:

| `TopFarms_Combined_Data.md` column (Seekers / Employers) | `structured` key | Status |
|---|---|---|
| Role_Sought / Role_Offered | `role_or_category` | live |
| Region (town-level) | `region` (canonical) + `locality` (verbatim town) | live |
| Shed_System | `shed_type` (+ herd/system prose in `herd_details`) | live |
| Herd_Size / Farm_System / Calving_Pattern | `herd_details` (one verbatim field covers all three) | live |
| Contact_In_Post | `contact` (+ `application_method`) | live |
| Accommodation_Need / Accommodation_Offered | `accommodation` | **this build** |
| Roster_Hours / Roster_Offered | `roster` | **this build** |
| Visa_Residency / Visa_RightToWork | `right_to_work` | **this build** |
| Availability_Timing / Start_Timing | `start_timing` | **this build** |
| Sector | — (implicit in role/prose) | not extracted — [A] acceptable while dairy-dominant; becomes a key when a second vertical goes live (aligns with the Seasonal-Insights "leads.sector waits for the platform canon" call) |
| Farm_Tech / Dog_Pet_Policy / Progression / Couple_Family / Experience / Certifications / Repost_Signal | — | **known residual gap, deliberately not in this build** — four keys is the audited gap (LH-2); each further key adds prompt surface and review load. Revisit after the §7 acceptance run shows the first four are captured faithfully. [OPINION] |
| Pay_Info | `salary_text` (harvest lane only, 044:21) | partial — FB-lane pay extraction joins the residual list above |

---

## 6. Migration + Edge Function change list

Numbering: 057 is applied, 058 is claimed by `seasonal_events` (`SEASONAL-INSIGHTS-SPEC.md` §2) → this lands as 059+ (final numbers at build time; Studio apply path per CLAUDE.md §2).

| # | Change | Artefact | Size |
|---|---|---|---|
| 1 | `raw_ingest` table + RLS + gated admin read RPC + purge-cron extension (§3, §3.1) | migration | **S** |
| 2 | `_lead_intake` signature change (`p_raw_ingest_id`) + `lead_staging.raw_ingest_id` + grant re-do | same migration | **S–M** (grant/signature care, see §3) |
| 3 | `_phone_norm()` + phone columns + index + dedup layer in `_lead_intake` + anonymise-cron SET extension (§4) | migration | **S–M** |
| 4 | Four `leads` columns + `admin_lead_approve` CREATE OR REPLACE carrying keys + phone (§2.2, §4.2) | migration (044 precedent) | **S** |
| 5 | `lead-intake` Edge Fn: prompt diff + schema/interface/fallback/normalise/payload plumbing (§2.1) + land-raw-first flow (§3) | `supabase/functions/lead-intake/index.ts`; deploy via `gh workflow run supabase-deploy.yml` (MEMORY: personal CLI/MCP deploy blocked) | **M** |
| 6 | `lead-harvest` Firecrawl schema mirror (§2.3) | `supabase/functions/lead-harvest/` | **S** |
| 7 | Re-extraction replay script (reads `raw_ingest`, re-runs structuring, re-stages at `confidence` from the new run) | small admin script / Edge Fn param | **S** (follow-up; not gating) |
| 8 | Staging-drawer UI: show the four new keys + phone-suspect candidate chip (fields already render generically from `structured`, so this may be near-zero) | `AdminLeadsStaging` drawer | **S** |
| 9 | Acceptance run (§7) | test harness + eval note | **M** |

Total: ~2–3 migrations + one Edge Function rework + one mirror + one eval. No new external services, no new dependencies.

---

## 7. Verification plan — the 47-row acceptance test

**Acceptance test: re-run the study's 47 posts through the extended parser and score it against the hand-coded dataset** (`TopFarms_Combined_Data.md` = ground truth; the batch-paste lane at `lead-intake` items[] is the harness — no new infrastructure).

One honesty caveat first: the pipeline deliberately discards full post text after structuring (`PHASE-LEADS-DESIGN.md` §8 — "raw page HTML is never stored; full post text discarded"), so the original 47 raw texts exist only if the founder's own study working-notes retained them. Two paths:

- **Path A (preferred):** the founder still holds the copied post texts from the Feb–Jul study → paste them through the extended parser (batch lane, `source: fb_manual_capture`), diff `structured` output against the coded rows field-by-field.
- **Path B (fallback, and the ongoing regime either way):** run the acceptance protocol on the **next 47 captured posts** — hand-code each with the §5 template at capture time, then compare. Slower to accumulate, but it also validates the template on fresh data instead of the sample the prompt examples were drawn from. [OPINION: do Path B even if Path A works — Path A alone grades the parser on its own study.]

**Pass criteria [MODELLED — tune with a dated note]:**

1. **Faithful capture:** ≥ 90% field-level agreement with the hand-coded value on the four new keys *where the ground-truth cell is non-empty* (verbatim-equivalent counts as agreement; formatting differences don't).
2. **Zero inference:** **0** cases where the parser emits a non-null value for any of the four keys when the ground-truth cell is empty. This criterion is absolute, not a percentage — one invented right-to-work gate is a trust failure (the same severity logic as the audit's veto-field reasoning, §3.3).
3. **No regression:** the existing fields (`role_or_category`, `region`, `locality`, `contact`, `shed_type`, `herd_details`) score no worse than a pre-change baseline run on the same inputs.
4. **Plumbing proof:** every acceptance item lands a `raw_ingest` row (status `staged`), staging rows carry `raw_ingest_id`, and the S06↔S06-repost / E06-cross-post style duplicates with a shared phone produce `suspect_duplicate` via the phone key (E06's Turakina cross-post is the named test case, `TopFarms_Master_Report.md:76`).

Failures route per the confidence design: prompt fix → re-run **from `raw_ingest`** (the new capability proving itself), never a re-paste.
