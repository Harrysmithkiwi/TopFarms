# Leads — Feed Architecture (going live)

*2026-06-12 · Framing + architecture for the three live feeds, ahead of keys.
Supersedes the source-mapping in PHASE-LEADS-L2-APIFY.md per the operator
handoff: Seek/TradeMe move from Apify → **Firecrawl**; the own Facebook group
moves to an **Apify FB actor** (revised from semi-automated paste).*

## The whole flow (one core, three doors)

```
                                    ┌──────────────────────────────┐
  A. FB own group   (Apify actor) ─▶│  lead-intake  (Edge Fn)      │
     daily, low cap, webhook        │   • Apify-event lane:        │
                                    │     fetch dataset → Haiku    │─┐
  B. Manual / batch paste ─────────▶│   • JWT admin lane: paste→Haiku│ │
     (admin UI, today)              └──────────────────────────────┘ │
                                                                      │
  C. Seek + TradeMe (Firecrawl) ──▶ lead-harvest (Edge Fn, cron) ─────┤
     2×/day, WE pull + poll          • Firecrawl extract (schema)     │
                                     • pre-structured → no Haiku      │
                                                                      ▼
                                              public._lead_intake()  (service_role)
                                                 suppression → dedupe → lead_staging
                                                                      │
                                              human approval gate  (/admin/leads/staging)
                                                                      ▼
                                                    leads → pipeline → cockpit (L4)
```

Everything still converges on `_lead_intake()` (migration 041), so suppression
+ dedupe + the human approval gate are unbypassable regardless of feed. No
change to that core or to the approval/privacy posture.

## Why two different mechanisms (push vs pull)

| Source | Content | Mechanism | Structuring |
|---|---|---|---|
| **A. FB own group** | messy free-text posts | Apify actor **pushes** (webhook → lead-intake, existing lane) | **Claude Haiku** (messy NL) |
| **B. Manual/paste** | messy free-text | admin UI → lead-intake | **Claude Haiku** |
| **C. Seek/TradeMe** | clean commercial listings | Firecrawl, **we pull** on cron | **Firecrawl extract schema** (no Haiku — listings are structured) |

The elegant split: Firecrawl's schema extraction already returns clean fields
from commercial HTML, so the harvest path stages **pre-structured** items at
high confidence — Haiku is only spent on genuinely messy FB text.

## C. Firecrawl commercial feed — the new piece (`lead-harvest`)

Firecrawl `/v2/extract` is **async**: POST returns a jobId, then poll
`GET /v2/extract/{jobId}` until `status: completed` (24h result window).

`lead-harvest` (new Edge Function, cron-triggered):
1. POST `https://api.firecrawl.dev/v2/extract` (Bearer `FIRECRAWL_API_KEY`)
   with the NZ-ag Seek/TradeMe search URLs + the schema below.
2. Poll the jobId (short backoff, capped ~60s) until completed.
3. For each extracted listing → call `_lead_intake` directly (service_role)
   with **pre-structured** fields (confidence ~0.9, source 'seek'/'trademe').
4. Dedupe on `source_ref` (listing URL) makes re-runs idempotent.

Honest-degrade: no `FIRECRAWL_API_KEY` → function returns
`{ skipped: 'FIRECRAWL_API_KEY not configured' }` (no error, no fake data).
Timeout note: extract of a few NZ-ag search pages completes in seconds; if a
run ever exceeds the function wall-clock, the job is split (one URL per
invocation) rather than raising the poll cap.

### Firecrawl extraction schema (commercial fields — employer-only, §9.5)
```json
{
  "type": "object",
  "properties": {
    "listings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "business_name":  { "type": "string", "description": "Hiring farm/company; null if not stated" },
          "job_title":      { "type": "string" },
          "region":         { "type": "string", "description": "One of the 16 NZ regions, else null" },
          "listing_url":    { "type": "string", "description": "Canonical public listing URL" },
          "public_contact": { "type": "string", "description": "ONLY a contact explicitly in the ad; else null" }
        },
        "required": ["job_title", "listing_url"]
      }
    }
  },
  "required": ["listings"]
}
```
Mapped to the lead schema: `type='employer'`, `display_name=business_name ?? job_title`,
`region`, `role_or_category=job_title`, `source_ref=listing_url`,
`contact={ url|phone|email from public_contact }`. Employer-only — no seeker
"wanted work" extraction (§9.5).

## Scheduling

- **C (Firecrawl):** `pg_cron` calls `lead-harvest` 2×/day via `pg_net.http_post`
  with the `X-Webhook-Secret` header (same in-function secret pattern). Staged
  as a migration, **applied only once the function is deployed + keys set** (an
  unkeyed cron would just no-op twice daily — pointless until live).
- **A (Apify FB):** scheduled inside Apify (daily, low cap), webhook → lead-intake.
- **B:** on-demand (human).

## Secrets — Edge Function secrets ONLY, never the bundle

```
supabase secrets set \
  LEAD_INTAKE_SECRET=<random>        # Apify FB webhook header + harvest cron header \
  APIFY_TOKEN=apify_api_...          # lead-intake fetches the FB actor's dataset \
  FIRECRAWL_API_KEY=fc-...           # lead-harvest commercial extract \
  ANTHROPIC_API_KEY=sk-ant-...       # Haiku structuring (FB + paste lanes) \
  --project-ref inlagtgpynemhipnqvty
```

## Click-by-click console checklist (your external setup)

### Apify — FB own group
1. Create Apify account; **Settings → Integrations → API token** → copy → this is `APIFY_TOKEN`.
2. Apify Store → a **Facebook Group/Posts** actor → **+ Try / Create task**.
3. Task input: your own group URL; **results cap LOW** (e.g. 20) to watch credit burn; English.
   Leave any stealth/anti-detection toggles **OFF** (§3).
4. Task → **Schedule** → once daily.
5. Task → **Integrations → Webhook**: event `Run succeeded`;
   URL `https://inlagtgpynemhipnqvty.functions.supabase.co/lead-intake?source=fb_own_group`;
   add header `X-Webhook-Secret: <LEAD_INTAKE_SECRET>`.

### Firecrawl — Seek/TradeMe
1. Create Firecrawl account; **Dashboard → API Keys** → copy → this is `FIRECRAWL_API_KEY`.
2. No console job needed — `lead-harvest` calls Firecrawl on our cron. You only
   provide the key + confirm the Seek/TradeMe NZ-ag **search URLs** to target
   (lives in the function config / a small `lead_feed_sources` note).
3. Start on a **low frequency** (1×/day) and a few search URLs; widen after
   watching credit burn.

### Supabase
1. Set the 4 secrets above (`supabase secrets set ...`).
2. Deploy functions (push to main — functions CI).
3. Apply the staged harvest-cron migration.
4. Run `scripts/verify-lead-intake.sh <url> <secret>` + the harvest verify, then
   watch one real post/listing land in `/admin/leads/staging`. **That closes leads.**

## What I build now (keyless, plug-and-play)
- `lead-harvest` Edge Function (Firecrawl extract + poll + map → `_lead_intake`),
  honest-degrade without the key.
- Staged harvest-cron migration (NOT applied — applied at go-live).
- `config.toml` entry; verify path.
- (FB own-group needs no new code — the existing Apify webhook lane handles it.)

## Decisions changed from the original design (flagged honestly)
1. Seek/TradeMe: Apify actors → **Firecrawl extract**. Cleaner (schema → no
   Haiku for commercial), one fewer Apify actor to maintain.
2. FB own group: semi-automated paste → **Apify FB actor** (operator accepts
   the account/ToS posture for their OWN group, low cap, watched). The paste
   lane stays as the fallback + for other-groups human capture.
3. Registry backlog at 036–042; a harvest-cron migration (043) will be staged,
   not applied — backlog flagged, not grown live, until the pre-launch repair.
