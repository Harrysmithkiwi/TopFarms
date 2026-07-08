# Lead Pre-fill — the `?lead=` pre-seeded listing flow

> **Created:** 2026-07-08 (Stage-2 remediation, product-specs workstream). **Status: SPEC — nothing built.**
> Named in-repo as the high-value next build: *"a pre-seeded 'post this job' flow that carries a code (e.g. `?lead=<id>`) and lands the employer on their own job, pre-filled from the `lead_staging` structured data, so the ask becomes 'log in to publish' rather than a cold signup form … this is where the real conversion gain lives"* [V — `docs/_canonical/TopFarms_Outreach_Reply_Config.md:213-219`]. The Master Report makes the same call from the data side: *"onboarding can pre-fill from an approved lead and ask the user to confirm"* [V — `TopFarms_Master_Report.md:105`]. The audit files it as LH-4 [V — `TopFarms_Platform_Audit.md` §3.5].
> Labels: [V]/[A]/[MODELLED]/[OPINION]. Sizes are solo-founder + AI.

---

## 1. What changes for the employer

Today the Lane-B outreach message points at the generic employer entry page — `outreachLink()` hardcodes `/for-employers` [V — `supabase/functions/lead-intake/index.ts:532`]. The employer clicks, hits a cold signup, then an 8-step blank wizard (`src/pages/jobs/PostJob.tsx:20-31`). Everything they already wrote in their FB post gets typed again — or, more likely, doesn't.

With pre-fill: the message carries an invite link. The employer signs up (or in), lands on `/jobs/new?lead=<token>`, and the wizard opens with their role, region and town already filled and a small **"From your post"** panel showing what we read. The ask collapses from "fill in a form about your farm" to "check this and hit publish".

---

## 2. URL contract + token security

### 2.1 The URL

```
https://topfarms.co.nz/jobs/new?lead=<token>
```

- Route already exists: `/jobs/new` → `PostJob` behind `ProtectedRoute requiredRole="employer"` [V — `src/main.tsx:221-222`]. Unauthenticated clicks flow through the existing auth redirect and return with the query string intact (verify the redirect preserves `?lead=` — see §7 change list).
- `<token>` is an **opaque invite token, never the raw `leads.id`**.

### 2.2 Why a token and not the lead UUID (security note)

`leads.id` is a `gen_random_uuid()` (041:30) — not practically enumerable — but a raw ID in the URL is still wrong for three reasons:

1. **It leaks a stable DB identifier into Facebook message history**, screenshots, and forwarded chats, permanently. A token is revocable and expiring; a primary key is neither.
2. **No expiry, no binding.** A raw ID link works forever, for anyone, and can't distinguish "the person we messaged" from "someone who got the link forwarded".
3. **It couples the public URL surface to the schema.** Tokens decouple.

**Mechanism (ponytail: a random column beats HMAC infrastructure — no shared secret, no clock skew, revocation is a row update):**

```sql
-- On leads (approved rows only — see §3 approval gate):
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS invite_token text UNIQUE,          -- 22+ chars base64url random
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_claimed_at timestamptz;
```

- Token minted by a gated admin RPC (§6), `encode(gen_random_bytes(16), 'base64')`-class randomness — unguessable, single-purpose.
- **TTL 30 days** [A — matches the staging-purge posture, `PHASE-LEADS-DESIGN.md` §2.1; renewable by re-minting, which rotates the token].
- **First-claim binding:** the first authenticated employer to open the link claims it (`invite_claimed_by`). A different user opening the same link later gets the blank wizard (§8). One token, one employer.
- Anonymisation wins: the 6-month dead-lead anonymise cron (041:424-433) — add `invite_token = NULL` to its UPDATE so a stale link can never resolve to an anonymised row.

---

## 3. Approval gate + privacy constraints (non-negotiable)

The leads privacy posture (`PHASE-LEADS-DESIGN.md` §8) holds unchanged. Pre-fill adds a *read* path for lead data, so the constraints are explicit:

1. **Only approved leads get tokens.** Tokens live on `leads` (post-approval), never on `lead_staging`. The human approval gate (041:267-316, the privacy checkpoint) therefore *precedes* any invite by construction. Note the operational wrinkle: Lane-B outreach state currently lives on `lead_staging` rows (047 ❶) and a draft can be sent while the row is still pending — so the Outreach UI's "Copy invite link" action (§6) must run approve-then-mint when the row hasn't been promoted yet. The gate is not bypassed; it is pulled earlier.
2. **Only leads whose own author was invited.** The token is minted for a specific lead as part of that lead's outreach thread; it is not a general referral code. Admin-only minting, audited (`admin_audit_log`, 023 pattern).
3. **The employer sees only THEIR OWN post's data back.** The claim RPC returns exclusively fields extracted from the public post that employer authored: `role_or_category`, `region`, `locality`, `shed_type`, `herd_details` (+ the §4 extension fields once `PARSER-EXTENSION-SPEC.md` lands). Nothing cross-lead, no other leads' existence, no internal fields (`notes`, `status`, `fingerprint`, `outreach` state, `contact` — see §4 on why even their own contact is excluded), no staging data, no raw excerpt beyond what maps.
4. **Claiming is a conversion *suggestion*, not an automatic identity join.** `invite_claimed_by` feeds the existing suggest-then-human-confirms pattern (`PHASE-LEADS-DESIGN.md` §2.2 — "suggestion only, the human confirms"). The founder confirms `converted_user_id` from the pipeline view as today; a forwarded link never silently links a stranger's account to a lead.
5. **RLS posture unchanged:** `leads` keeps zero client policies. The claim RPC is SECURITY DEFINER with the corrected-037 grants, callable by `authenticated`, and returns data only when token valid + unexpired + (unclaimed OR claimed by the caller).

---

## 4. Field mapping — lead `structured` → job wizard

Parser output today [V — `lead-intake/index.ts:100-115` `StructuredLead`; wizard fields [V — `PostJob.tsx:33-80` `JobPostingData`, audit §1.2]. **Rule: no fabricated prefills — a wizard field is filled only when the lead field maps without interpretation. Anything needing a parse-guess stays empty and appears in the "From your post" panel instead.**

| Lead field (`structured`) | Wizard field | Step | Maps? | Rule |
|---|---|---|---|---|
| `role_or_category` | `role_type` | 1 Basics | ✅ verbatim | `jobs.role_type` is unconstrained text today (audit §1.2), so verbatim is safe; revisit when the EM-1 role CHECK lands |
| `role_or_category` | `title` | 1 Basics | ✅ suggested | pre-filled as the title starting point ("Farm Assistant"), plainly editable — never composed with anything not in the post |
| `region` | `region` | 1 Basics | ✅ | already canonicalised to the 16-region vocab at intake (`lead-intake/index.ts:67-73`) — same vocab the wizard dropdown uses |
| `locality` | `nearest_town` | 2 Farm Details | ✅ verbatim | NEVER-INFER already enforced at extraction (`lead-intake/index.ts:104-106`) |
| `shed_type` (verbatim, e.g. "54-bale rotary") | `shed_type[]` chips | 2 | ◐ conditional | fill the chip ONLY on a case-insensitive substring match against the chip vocab (rotary / herringbone); otherwise leave chips empty and show the verbatim string in the panel. A "54-bale rotary" ticks `rotary`; a "16-aside HB" does NOT silently become `herringbone` unless the matcher says so |
| `herd_details` (e.g. "550 cows, split calving") | `herd_size_min/max`, `calving_system` | 2 | ❌ panel-only | ints + a dropdown from free prose = interpretation. Show verbatim in the panel; the employer types the numbers |
| `contact` | — | — | ❌ never | jobs carry no contact field, and echoing their own scraped contact back is pure creepiness for zero conversion value [OPINION] |
| `display_name` | — | — | ❌ | employer identity comes from their signup/profile, not from how the parser named the post |
| `application_method`, `source_group`, `post_timestamp`, `lane` | — | — | ❌ | pipeline internals |
| `salary_text` (harvest lane, 044:21) | `salary_min/max` | 4 | ❌ panel-only | same no-parse rule as herd_details |
| **Post parser-extension** (`PARSER-EXTENSION-SPEC.md`): `accommodation` | `accommodation.available` + panel | 2 | ◐ | `available: true` when the field is non-null (the post stated accommodation); type/bedrooms stay panel-only until those are structured columns (audit EM-4) |
| `roster` | `weekend_roster` | 4 | ❌ panel-only | `weekend_roster` is a dropdown vocab; "8/3 all year round" doesn't map without interpretation |
| `right_to_work` | `visa_requirements[]` / `visa_sponsorship` | 2/3 | ❌ panel-only | getting a visa gate wrong on a live listing is a trust failure; panel until the EM-3 canonical RTW vocab exists |
| `start_timing` | `start_date` | 1 | ◐ conditional | fill only when the value parses as an unambiguous date ("20 July"); "ASAP" / "this season" stay panel-only |

**The "From your post" panel** is the release valve that keeps the mapping honest: every extracted field the wizard can't take structurally still shows up beside the form (read-only, quoted), so the employer transcribes their own facts instead of re-remembering them. It renders inside the existing `LivePreviewSidebar` slot on steps 2–5 (`PostJob.tsx:512-540`) — no new layout.

---

## 5. Instrumentation — prefill → publish vs blank-wizard baseline

The conversion claim ("where the real conversion gain lives") must be measured, not asserted:

- **Attribution column:** `jobs.source` already exists with `CHECK (source IN ('direct','scraped'))` [V — `supabase/migrations/001:109`]. Widen to include `'lead_prefill'` (044-style DROP/ADD), and `PostJob` inserts `source: 'lead_prefill'` when a claimed token seeded the draft (today it hardcodes `'direct'`, `PostJob.tsx:239`).
- **Funnel counters** (additive block in `admin_analytics_funnel`, the 042 "leads block" precedent): tokens minted → claimed → wizard started (`jobs` row with `source='lead_prefill'`) → published (`status <> 'draft'`) → first placement. Baseline = the same stage conversion for `source='direct'` employers arriving from outreach in the same period.
- **Decision rule [MODELLED]:** with Lane-B volumes this is a months-not-weeks readout; review after ~20 claimed tokens. If prefill→publish is not clearly better than blank-wizard→publish at that point, stop investing here and put the effort into the wizard itself.

---

## 6. RPC / route / function changes (with sizes)

| # | Change | Artefact | Size |
|---|---|---|---|
| 1 | Migration: 4 invite columns on `leads` (§2.2) + widen `jobs.source` CHECK + extend the anonymise cron UPDATE to null `invite_token` | new migration (059+ — 058 is claimed by `seasonal_events`) | **S** |
| 2 | `admin_lead_invite_create(p_lead_id)` — gate-first, mints/rotates token + expiry, writes `admin_audit_log`, returns the full URL | same migration | **S** |
| 3 | `lead_prefill_claim(p_token)` — SECURITY DEFINER, `authenticated`; validates token + expiry + first-claim binding; sets `invite_claimed_by/at` on first claim; returns ONLY the §4 mapped fields as jsonb | same migration | **M** (this is the security-sensitive one — adversarial tests per the 039 PII-test pattern: wrong token, expired, second user, anonymised lead) |
| 4 | Outreach UI: "Copy invite link" action on the Lane-B queue row (`AdminLeadsOutreach`), running approve-if-pending → mint → clipboard. The generated draft keeps its plain `/for-employers` link; the operator pastes the invite link when sending — zero change to `draftReply`/`lead-intake` in v1 (ponytail: drafts are written pre-approval, so baking tokens into drafts would invert the approval gate; upgrade path = substitute the link at approve-time if the manual paste proves annoying) | `AdminLeadsOutreach.tsx` + existing approve RPC calls | **S–M** |
| 5 | `PostJob.tsx`: read `?lead=`, call `lead_prefill_claim`, merge mapped fields into initial `jobData` (never overwriting a non-empty draft field), render the "From your post" panel, set `source='lead_prefill'` on insert | `PostJob.tsx` (+ small panel component) | **M** |
| 6 | Verify the auth redirect preserves the query string end-to-end (signup → email confirm → return) — this is the whole funnel; if it drops `?lead=`, stash the token in `sessionStorage` at first touch | auth flow check + possibly 3 lines | **S** |
| 7 | Funnel instrumentation block (§5) | `admin_analytics_funnel` additive migration | **S** |

Total: one migration + two UI touches + one Edge-Function *non*-change. No new Edge Function, no new page.

---

## 7. Edge cases

| Case | Behaviour |
|---|---|
| Token expired | `lead_prefill_claim` returns `{status:'expired'}`; wizard opens blank with a quiet one-liner ("that link's expired — you can still post your job here"), no error wall. Never block the signup because the *bonus* failed. |
| Lead already converted (`converted_user_id` set, different user) | claim returns `{status:'unavailable'}`; blank wizard; row surfaces in the founder's conversion-suggestion view for a look |
| Employer mismatch (token already claimed by another user) | first-claim binding (§2.2): second user gets blank wizard; claim attempt logged (audit) — a forwarded link is a normal event, not an attack, but it never leaks lead data to the second user |
| Same employer returns later (claimed by them, link reopened) | claim RPC is idempotent for the claiming user — prefill works again while unexpired (their draft job may already exist; the merge-never-overwrite rule in change #5 protects it) |
| Lead anonymised / dead | token nulled by the extended cron (§2.2); resolves as expired |
| Lead is a **seeker** lead | out of scope — tokens mint only for `type='employer'` (enforced in `admin_lead_invite_create`). The seeker mirror ("pre-filled profile") is real but waits on LH-1 (`/for-seekers` route, audit §3.5), which doesn't exist yet |
| Post-signup role isn't employer | `/jobs/new` already requires the employer role (`main.tsx:222`); the invite link should point through the employer signup entry so role selection is pre-answered |
| Employer profile not onboarded | existing gate redirects to `/onboarding/employer` (`PostJob.tsx:126-141`); token stays claimable on return (idempotent re-claim) — stash-in-sessionStorage from change #6 covers the detour |
