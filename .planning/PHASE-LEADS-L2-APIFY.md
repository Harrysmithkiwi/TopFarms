# Leads L2 — Apify commercial feeds (Seek + TradeMe, employer-only)

*2026-06-11 · In-repo receiving side BUILT + verified. Going live needs your
Apify account (the first external paid-service dependency). Employer-only per
§9.5; no evasion/anti-detection anywhere (§3).*

## What's built in-repo (done)

`lead-intake` now accepts the **Apify webhook event** shape in addition to the
direct `{source, items}` shape:

- Detects an Apify event by `resource.defaultDatasetId`.
- `source` comes from the URL query: `?source=seek` or `?source=trademe`.
- Fetches the run's results: `GET https://api.apify.com/v2/datasets/{id}/items?clean=true&format=json`
  with `Authorization: Bearer ${APIFY_TOKEN}`.
- Each row → `{ source_ref: <first of url/link/jobUrl/listingUrl/positionUrl/adUrl>,
  raw_text: JSON.stringify(row) }` → Claude Haiku structuring → `_lead_intake`
  core → staging. No coupling to any specific actor's field names.
- Capped at 50 items/run (inline Haiku per item; NZ-ag volume is small — if it
  ever exceeds, structuring moves to a queue, not a higher cap).
- **Idempotent on retries:** Apify webhooks are at-least-once; dedupe on
  `source_ref` turns a redelivered run into `exact_duplicate`s, not new leads.

Verified locally (deno serve, bogus token): no-`?source` → 400; `?source=seek`
+ token → real Apify fetch (401 on bogus → 502); invalid source → 400; direct
paste path regresses at 200.

## What YOU configure in Apify (external — I can't do this)

1. **Account + API token.** Create an Apify account; copy the API token.
2. **Choose maintained actors** — a Seek scraper and a TradeMe Jobs scraper
   from the Apify Store (maintained actors absorb layout churn). Configure each
   actor's input for **NZ ag/farming categories + regions only, employer job
   ads only** (no seeker/"wanted work" — §9.5). Set **polite limits**:
   default/low concurrency, identifiable user-agent, respect robots — **no
   anti-detection/fingerprint options** (if the actor offers stealth toggles,
   leave them OFF).
3. **Schedule** each actor 2×/day (Apify Schedules).
4. **Webhook per actor** (Apify → actor → Integrations → Webhook), on event
   `ACTOR.RUN.SUCCEEDED`:
   - URL: `https://inlagtgpynemhipnqvty.functions.supabase.co/lead-intake?source=seek`
     (use `?source=trademe` for the TradeMe actor).
   - Header: `X-Webhook-Secret: <LEAD_INTAKE_SECRET value>`.
   - Default payload template is fine (we only need `resource.defaultDatasetId`).

## Secrets — Edge Function secrets ONLY, never the bundle

Set both via `supabase secrets set` (or Studio → Edge Functions → Secrets):
- `LEAD_INTAKE_SECRET` — any strong random string; the same value goes in each
  Apify webhook's `X-Webhook-Secret` header. (Also unblocks the manual webhook
  lane.)
- `APIFY_TOKEN` — your Apify API token (used only to fetch the run's dataset).
- `ANTHROPIC_API_KEY` — Claude Haiku structuring (without it, items stage at
  confidence 0 for fully-manual review — honest degrade, not a failure).

```
supabase secrets set LEAD_INTAKE_SECRET=... APIFY_TOKEN=apify_api_... ANTHROPIC_API_KEY=sk-ant-... --project-ref inlagtgpynemhipnqvty
```

## Verify after you set it up

`scripts/verify-lead-intake.sh <FUNCTION_URL> <LEAD_INTAKE_SECRET>` replays a
synthetic Apify event and a synthetic direct paste against the live endpoint
and prints the staging outcome. Then confirm rows landed in /admin/leads/staging.

## Privacy / posture (unchanged from design §8)

Employer commercial listings only; polite + identifiable + robots-aware; the
human approval gate at /admin/leads/staging remains the privacy checkpoint —
nothing reaches the live leads table without it. Raw row JSON lives only in the
transient staging excerpt (30-day purge), never on the approved lead.

## Not done / deferred
- Seeker commercial capture — out of scope (§9.5), revisit post-launch.
- Inline-Haiku → queue migration — only if per-run volume exceeds 50.
- Registry backlog now 036–041 (041 = leads L0); repair stays deferred.
