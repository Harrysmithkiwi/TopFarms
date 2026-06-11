# Lead Discovery & Pipeline — Design (Step 1, pre-build)

*2026-06-11 · Status: APPROVED — operator §9 decisions recorded below;
build greenlit L0-L4 (L0 first, stop for review). Sequencing per operator:
runs BEFORE live Stripe (PEND-01 stays gated); 037/040 RLS prerequisites
applied and verified 2026-06-11.*

## §9 DECISIONS (operator, 2026-06-11)
1. Seek/TradeMe collection: **Apify maintained actors**.
2. Own Facebook group: **SEMI-AUTOMATED batch intake** — NOT fully automated.
   Deciding factor: zero automation-detection exposure on the founder's
   account; lawful basis covers the data, the account risk is not worth it.
   Batch paste/intake (not one-at-a-time) to keep the time saving.
3. Retention: staging buffer **30 days**; dead leads anonymised at
   **6 months** — anonymise means genuinely stripping PII (name + contact
   nulled in place), NOT a soft-delete flag.
4. Structuring model: **Claude Haiku** (claude-haiku-4-5).
5. Commercial boards: **EMPLOYER-ONLY**. No seeker "wanted work" ad
   collection from Seek/TradeMe; seeker discovery stays in the human-capture
   Facebook lane. Revisit post-launch with a considered individual-privacy
   posture.

Standing constraints carried through the build (operator, same date):
single intake door (lead-intake Edge Function); deny-by-default RLS with the
CORRECTED 037 grant pattern (REVOKE ALL FROM PUBLIC + explicit grants); no
evasion/anti-detection anywhere; mandatory human approval gate = privacy
checkpoint; durable suppression (opt-out cannot be re-created by later
crons); admin surfaces on the 039 RPC + ProtectedRoute pattern; PEND-01 and
registry repair stay deferred behind this phase.*

---

## 1. What this phase automates (and what it deliberately doesn't)

The founder's acquisition loop today: spot a relevant post (Seek, TradeMe,
Facebook), copy into a spreadsheet, chase contact info, dedupe by hand. This
phase automates **parse → structure → dedupe → file → track** and keeps a
**human approval gate** between "machine saw something" and "it's in the
database" — the gate doubles as the privacy checkpoint.

Not in scope: outreach/messaging automation, relationship history beyond the
status pipeline, training-provider anything (Phase 25, gated), and any form
of stealth scraping (explicitly prohibited — §3).

## 2. Data model

Two tables + one suppression list. All RLS deny-by-default (no anon or
authenticated policies at all — same posture as admin_audit_log); every read
AND write goes through SECURITY DEFINER admin RPCs gated by `_admin_gate()`,
grants per the corrected-037 pattern (`REVOKE ALL FROM PUBLIC, anon` at
birth, `GRANT EXECUTE TO authenticated` only).

### 2.1 `lead_staging` (the buffer — pre-approval, short-lived)
```
id uuid PK, created_at
source            text CHECK (seek | trademe | fb_own_group | fb_manual_capture)
source_ref        text        -- listing URL / post permalink / 'manual'
raw_excerpt       text        -- minimal raw text needed for review context
structured        jsonb       -- Claude output (the §4 schema)
confidence        numeric     -- 0..1 from the structurer
missing_fields    text[]      -- e.g. {contact, region}
dedupe_status     text CHECK (unique | suspect_duplicate | exact_duplicate)
dedupe_match_id   uuid NULL REFERENCES leads(id)   -- best candidate match
review_status     text CHECK (pending | approved | rejected) DEFAULT pending
reviewed_at       timestamptz NULL
```
Auto-purge: rejected rows and rows pending > 30 days are deleted by a weekly
cron (pg_cron, SQL only). The staging buffer is transient by design.

### 2.2 `leads` (post-approval)
```
id uuid PK, created_at, approved_at
type              text CHECK (employer | seeker)
display_name      text        -- business name or person-as-posted
region            text        -- existing 16-region vocabulary
role_or_category  text        -- e.g. 'herd_manager', or free text
skills            uuid[]      -- tagged against existing skills taxonomy
source            text        -- as staging
source_ref        text
contact           jsonb NULL  -- ONLY publicly-stated contact: {phone?, email?, url?}
notes             text NULL   -- founder's note at approval time
status            text CHECK (new | contacted | onboarded | dead) DEFAULT 'new'
status_changed_at timestamptz
converted_user_id uuid NULL REFERENCES auth.users(id)  -- set when they sign up
```
**Conversion link:** when a lead signs up, the founder links the account from
the pipeline view (RPC sets `converted_user_id` + `status='onboarded'`).
Auto-suggest: an admin RPC surfaces signups whose email domain / name
fuzzy-matches an open lead — suggestion only, the human confirms (no
automatic identity joins). This is what wires lead → signup → placement into
the funnel panel.

### 2.3 `lead_suppression`
`(fingerprint text PK, reason text, created_at)` — when a lead is rejected as
"do not re-add" (opt-out, irrelevant, competitor), its dedupe fingerprint
lands here so the next collection cycle can't resurrect it. Without this,
deleting a lead just re-imports it next cron run.

## 3. The three feeds — exactly how each enters

| Feed | Mode | Mechanics |
|---|---|---|
| **Seek + TradeMe Jobs** | Scheduled, 2×/day | Apify **maintained actors** (preferred over raw Playwright for resilience to layout churn). Apify runs on its own schedule; on completion it POSTs the dataset to our `lead-intake` Edge Function (X-Webhook-Secret header — existing notify-job-filled pattern). Search scope: ag/farming categories, NZ regions. **Commercial public listings only**: business name, title, region, listing URL, publicly-stated contact. **No stealth**: identifiable UA, Apify's default polite rates, robots-aware actors, no fingerprint/anti-detection work of any kind — if a source blocks us, we stop, not sneak. |
| **Founder's OWN Facebook group** | Automated, first-class | Lawful basis exists (founder is owner/admin; group terms disclose collection for recruitment). Mechanics are the weakest link of the three (Graph API group-content access is effectively dead for this use; third-party group scrapers sit badly with FB ToS even for owned groups). **Recommended v1:** semi-automated — the founder (or a scheduled export where group tooling allows) drops new-post text into the same intake endpoint in batches; the automation does 100% of the structuring/dedupe/filing. Full automation is a §9 decision with the ToS trade-off stated honestly. |
| **Other Facebook groups** | Human-in-the-loop ONLY | Founder is a legitimate member reading the group. Capture = paste the post text (+ permalink) into a one-tap **Capture form** in the admin dashboard (textarea + source dropdown; phone-friendly). Everything downstream is automated. **No unattended scraping of groups the founder doesn't own — no lawful basis, not built, not configurable.** |

All three converge on one entry point: `lead-intake` Edge Function
(`verify_jwt` false + X-Webhook-Secret for Apify; the manual capture form
calls it authenticated-admin instead). One pipeline, three doors.

## 4. Claude structuring step

- **Model:** `claude-haiku-4-5` (cheap, fast; this is extraction, not
  reasoning). Budget: at expected volumes (≤ ~100 items/day) under NZ$5/mo.
- **Call site:** inside the `lead-intake` Edge Function (server-side; key in
  Edge secrets — never client).
- **Prompt shape:** system prompt carries (a) the lead JSON schema, (b) the
  24-competency taxonomy slugs + the 16-region vocabulary as closed lists,
  (c) NZ-ag terminology notes (same messy-vocab handling the matching prompt
  uses — '2IC', 'OAD', 'calf rearing' etc.), (d) instruction to emit
  `confidence` 0–1 and `missing_fields[]`, and to output `null`, never to
  guess, for absent fields (especially contact).
- **Output:** tool-use/structured output against the schema; non-conforming
  output → staging row with `confidence=0` + flag, never dropped silently.
- **PII rule at the prompt level:** extract only what the post states
  publicly. No enrichment, no cross-referencing, no inferring contact info.

## 5. Dedupe — what makes two leads "the same"

Computed at intake, against BOTH `leads` and pending `lead_staging`, plus
`lead_suppression`:

1. **Exact:** same `source_ref` URL (a listing seen again next cycle) →
   `exact_duplicate`, auto-skip (refresh `last_seen` metadata only).
2. **Fingerprint:** `lower(unaccent(display_name)) + region + type` →
   exact fingerprint hit = `exact_duplicate`.
3. **Fuzzy:** `pg_trgm` similarity ≥ 0.6 on normalized name within the same
   region+type → `suspect_duplicate`, lands in staging WITH the candidate
   match shown side-by-side; the human approves as new / merges / rejects.
   (pg_trgm is already a common Supabase extension; one CREATE EXTENSION IF
   NOT EXISTS in the migration.)

The same employer posting different roles = one lead, multiple
`role_or_category` notes (merge path), not two leads.

## 6. Dashboard surfaces (existing patterns only)

- **/admin/leads/staging** — approval queue: AdminTable over
  `admin_leads_staging_list` RPC; row → drawer with structured fields,
  confidence, missing-field chips, raw excerpt, dedupe candidate (if any);
  actions = Approve / Reject / Reject+Suppress / Merge-into-existing
  (4 mutation RPCs, each writing `admin_audit_log` like the 023 mutations).
- **/admin/leads** — pipeline: AdminTable over `admin_leads_list` RPC,
  filters by status/type/source/region; status chips; drawer with
  link-to-converted-account action.
- **Capture form** — small panel on the staging page (textarea + source +
  submit → `lead-intake`).
- **Funnel wiring** — `admin_analytics_funnel` gains a `leads` block (counts
  by status + lead→signup conversion) — additive change to the 039 family.
- All routes: `ProtectedRoute requiredRole="admin"` + AdminLayout + sidebar
  entries, exactly like /admin/analytics.

## 7. Scheduling

**Recommendation: Apify-side schedules + webhook push** (not Supabase-side
polling): Apify runs the 2×/day collections on its scheduler and pushes
results to `lead-intake`. Rationale: scrape duration belongs on Apify's
infrastructure, not inside an Edge Function's execution window; we already
have the inbound-webhook-with-secret pattern deployed twice.
Supabase pg_cron is used only for the weekly staging purge (pure SQL — the
existing migration-008/011 cron pattern; note pg_cron+pg_net quirks from
KNOWN_QUIRKS are avoided because the purge needs no HTTP).

## 8. Privacy posture (explicit, per source)

- **Lawful basis:** Seek/TradeMe — publicly-advertised commercial listings,
  collected politely and identifiably, stored minimally (NZ Privacy Act 2020
  IPP1/IPP2: collection necessary + from publicly-available source). Own FB
  group — disclosed purpose in group terms, founder is the agency collecting.
  Other FB groups — no automated collection at all; a human member files what
  they personally read, and the approval gate re-checks it before storage.
- **The approval gate is the checkpoint:** nothing reaches `leads` (the
  long-lived table) without a human approving the specific record. Staging is
  transient (30-day purge); raw page HTML is **never stored** — only the
  minimal excerpt needed to review.
- **Stored vs discarded:** stored = name/business, region, role, skills tags,
  source link, publicly-stated contact, status. Discarded = everything else
  (full post text after structuring, photos, commenters, any third parties
  mentioned).
- **Retention:** staging 30 days; `dead` leads auto-anonymised (contact +
  name nulled, aggregate row kept for funnel stats) after 6 months —
  configurable, §9. Suppression list keeps fingerprints only, not contact.
- **Opt-out:** anyone asking to be removed → Reject+Suppress / dead+suppress;
  the suppression list guarantees they stay out.
- **Access:** admin-only via gated RPCs; leads tables have NO client
  policies. Leads PII never enters analytics aggregates (the 039 PII tests
  pattern extends to the new RPCs).

## 9. Operator decisions needed (the scope/source calls)

1. **Apify vs Firecrawl vs raw Playwright** for Seek/TradeMe. Recommend
   Apify (maintained actors absorb layout churn; built-in politeness;
   schedules + webhooks). Firecrawl is a crawl/LLM-extract generalist —
   fine fallback if a maintained actor doesn't exist for TradeMe Jobs.
   Needs: Apify account + token (external dependency, ~US$5–49/mo tier).
2. **Own-FB-group mechanics:** semi-automated batch intake (recommended v1 —
   zero ToS exposure, ~5 min/day) vs fully-automated group collection
   (faster, but third-party FB scraping tooling sits against FB ToS even on
   owned groups — your account carries the risk). Honest recommendation:
   start semi-automated, revisit after volume proves the 5 min/day hurts.
3. **Retention windows:** staging purge 30d? dead-lead anonymise 6mo? (both
   easily changed later; need a starting value).
4. **Structuring model:** claude-haiku-4-5 (recommended) — or pay more for
   higher extraction fidelity with Sonnet on low-confidence retries only
   (hybrid; adds complexity, suggest deferring).
5. **Seeker leads from commercial boards:** Seek/TradeMe are employer-side
   (job ads). Seeker discovery is FB-only in practice. Confirm employer-only
   for the commercial feeds (recommended) or also collect "wanted work" ads.

## 10. Phase/milestone breakdown

| Milestone | Delivers | Value gate |
|---|---|---|
| **L0 — Pipeline core** | Migration 041 (tables + RPCs + RLS posture + purge cron), staging/approval + pipeline dashboard pages, capture form, adversarial tests (gate, not-widened, PII) | Manual capture works end-to-end day 1 — founder stops using the spreadsheet immediately |
| **L1 — Structuring** | `lead-intake` Edge Function with Claude structuring + dedupe + suppression; capture form switches from "founder fills fields" to "founder pastes post" | The 80% drudgery win |
| **L2 — Commercial feeds** | Apify actors configured (Seek, TradeMe), schedules + webhook wiring, secrets | Top-of-funnel runs while founder sleeps |
| **L3 — Own-group feed** | Batch intake flow per §9.2 decision | FB seeker pipeline |
| **L4 — Funnel wiring** | converted_user_id linking UI + suggestion RPC; leads block in admin_analytics_funnel | lead→signup→placement visible in the cockpit |

External dependencies (not in repo): Apify account/token, Anthropic API key
(Edge Function secrets — never client-side), nothing else. In-repo: one
migration, one Edge Function, two admin pages, tests.

**STOP — awaiting §9 calls before L0 code.**
