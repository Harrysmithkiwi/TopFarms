# TopFarms — Data Ingestion Architecture (source-agnostic spine + adapters)

*2026-07-01 · Chief-architect design pass. 2026-07-02 · operator decisions
recorded in §7. Status: **DESIGN — FILED + DECIDED. No build yet.** When
implementation is picked up (fresh session): §6 leverage order, adapter contract
+ raw landing zone first. No tool installed, no session automated in this pass.*

*Supersedes the per-source framing in `PHASE-LEADS-DESIGN.md` and
`PHASE-LEADS-FEEDS-ARCHITECTURE.md` **only where it generalises them** — the
`_lead_intake()` core, RLS posture, approval gate and privacy mechanics from
041 are kept verbatim as the spine. This doc names the seams and closes three
gaps; it does not reinvent the pipeline.*

---

## 0. The objective (restated so the design is judged against it)

Continuously ingest **employer opportunities** *and* **job-seeker intent** from
many heterogeneous channels into TopFarms with **least founder effort** and
**highest long-term leverage**. Facebook is *today's* source, not the design
target. Optimise: founder leverage · robustness · extensibility · data quality.

The headline finding: **you already built the spine.** `_lead_intake()`
(migration 041) is a single convergence door; everything downstream
(suppression → dedupe → `lead_staging` → human approval → `leads` → pipeline)
is already source-agnostic. The correct move is to **generalise that**, per the
stated design principle — not build something new per source. This document
formalises the adapter seam above the door and closes the gaps that block true
source-agnosticism.

---

## 1. The ideal spine — seven stages, one seam

```
  ┌── ADAPTERS (source-specific, thin) ──┐
  │  FB group   boards    Seek/TM   Sheets│   each emits the SAME shape:
  │  Reddit     email     WhatsApp   ...   │        RawItem
  └───────────────────────┬───────────────┘
                          │  (the ONE seam — the adapter contract)
                          ▼
   ①  LAND        raw_ingest      immutable, dedup by (source, natural_key/hash)
                          ▼
   ②  EXTRACT     strategy per source-class:
                    • structured  → schema-map      (boards: no LLM)
                    • messy NL     → LLM extract     (FB/paste/Reddit: Haiku)
                  → structured jsonb + per-field confidence + missing_fields[]
                          ▼
   ③  RESOLVE     suppression check → dedup (exact / fingerprint / fuzzy /
                  phone) → verdict {unique|suspect|exact} + candidate match
                          ▼
   ④  STAGE       lead_staging   (the buffer that already exists)
                          ▼
   ⑤  APPROVE     human gate  /admin/leads/staging   (approve/edit/reject/merge)
                          ▼
   ⑥  PROMOTE     leads        (canonical, post-approval)
                          ▼
   ⑦  FEEDBACK    human edits + reject reasons → calibrate extraction &
                  dedup thresholds; watchdog observes adapter health
```

**Design invariants (what makes this a spine, not a pile of scripts):**

1. **One seam.** Every adapter's *only* job is to produce a `RawItem`. Adapters
   never extract, never dedup, never decide. All source-specificity lives at the
   edge; everything from ① inward is written once and shared. Adding a channel =
   writing one adapter to one contract.
2. **Land raw before you process it (GAP today).** Acquisition and processing
   are decoupled by an immutable landing zone. If extraction fails or the model
   improves, you re-run over stored raw — you never re-scrape. Current design
   discards full text and keeps only `raw_excerpt`; that optimises storage at
   the cost of re-extractability. Given member-consent is handled, store the raw
   payload (transiently, same 30-day clock as staging) so extraction is
   idempotent and improvable. This is the single biggest robustness upgrade.
3. **Extraction is a pluggable step, not a universal LLM pass.** Commercial
   boards return clean fields via Firecrawl's schema — spending an LLM on them
   is waste. Keep the existing intelligent split: *schema-map* for structured
   sources, *LLM* for messy NL. The spine cares that ② emits the same
   `structured` jsonb + confidence; it does not mandate *how*.
4. **The human approval gate is unbypassable and is the quality + privacy
   checkpoint.** Unchanged from 041. Nothing reaches `leads` without a human
   approving the specific record.
5. **Idempotency is a first-class property, keyed on a natural key.** Re-running
   any adapter must not create duplicates. Natural key = `(source, source_ref)`
   for URL-bearing sources; content hash for keyless sources (paste, email).
6. **Adapter isolation.** One source breaking (Seek redesigns its HTML) must not
   stall the others — independent adapters, watermarks, schedules, health.

### 1.1 The adapter contract (the seam — formalise this)

Every adapter, regardless of channel, emits zero-or-more of exactly this:

```ts
RawItem {
  source:       string   // 'nzfarmingjobs' | 'fb_own_group' | 'seek' | 'sheets' | ...
  source_ref:   string   // listing URL / post permalink / sheet row id / email msg-id
  natural_key:  string   // = source_ref where stable; else content hash
  payload:      json      // the raw content, verbatim (text + whatever structured
                          //   fields the source already gives, e.g. Firecrawl json)
  captured_at:  timestamp
  adapter_ver:  string   // for provenance + re-extraction bookkeeping
  hints?:       { record_type?: 'employer'|'seeker', pre_structured?: bool }
}
```

`pre_structured: true` (boards via Firecrawl schema) tells ② to skip the LLM and
map directly. `record_type` hint lets a messy source declare "this lane is
seekers" so extraction picks the right schema. That is the *entire* surface a new
source has to satisfy.

---

## 2. How each source plugs in as an adapter

| Source | Class | Acquire mechanism | Extract strategy | Idempotency key | Notes |
|---|---|---|---|---|---|
| **nzfarmingjobs** (live) | structured board | `lead-harvest` Edge Fn, cron pull, Firecrawl map→filter→dedup→scrape(json schema) | schema-map (no LLM) | `source_ref` = /job/ URL | Already live. Becomes the reference adapter. |
| **Seek / Trade Me** (queued) | structured board | **API-first** (see §3); Firecrawl fallback | schema-map | `source_ref` = listing URL | JS-heavy SPAs — API or Firecrawl `--wait-for`. |
| **Google Sheets** (existing lists) | structured feed | Sheets API pull on cron; each row = one RawItem | schema-map (columns→fields); LLM only on a free-text notes column | `source_ref` = sheet id + row id (+ content hash to catch edits) | Cheapest, most robust adapter. Also doubles as a **manual-entry lane**: a VA/founder pastes into a sheet, it ingests. High leverage, near-zero fragility. |
| **FB own group** (today's primary) | messy NL, both record types | **assisted human capture** → paste/Capture affordance → `admin_lead_capture()` (JWT). *Not* headless automation — see §4. | LLM (Haiku) | content hash of pasted text | The Apify FB actor is dead (STATE: "Apify L2 dead/zero-rows"). Level it at assisted capture. |
| **Other FB groups** | messy NL | human-in-loop paste only (founder is a member) | LLM (Haiku) | content hash | No unattended collection of groups you don't own — same lane as own-group capture. |
| **Reddit / WhatsApp / email / referrals** (future) | messy NL | each a thin adapter → RawItem: email via inbound-parse webhook; Reddit via API; WhatsApp via export/forward; referral via a form | LLM (Haiku) | msg-id / permalink / content hash | All reuse the messy-NL extract path. Zero spine changes — this is the extensibility payoff. |

The point of the table: **four already-designed lanes and every future one
collapse to two extract strategies and one contract.** Nothing below the seam
changes as sources are added.

---

## 3. Technology evaluation (only now — architecture first)

Rated on the two axes that matter here: **fragility** (susceptibility to
platform change / breakage) and **founder/ops overhead**.

| Need | Tool | Fragility | Overhead | Verdict |
|---|---|---|---|---|
| Structured boards (nzfarmingjobs, static) | **Firecrawl** map→filter→dedup→scrape | Medium (site redesign) | Low (managed, keyed) | **Keep** — live, proven, 5 credits/new-ad, dedup-before-spend. Reference adapter. |
| Seek / Trade Me | **Official/partner API** if one exists | Low | Low–med (contract/keys) | **Investigate first** (the API-first mandate). A sanctioned feed beats any scrape. |
| Seek / Trade Me (if no API) | **Firecrawl** with `--wait-for` for the SPA | High (SPA churn + anti-bot) | Medium | Fallback only. Per-board verdict pending a real map/extract run. |
| Google Sheets | **Sheets API** (read) | Very low | Very low | **Add** — highest leverage-per-effort channel; also the manual-entry lane. |
| FB own/other groups | **assisted human capture** (paste today; thin browser-extension "Capture" button later) | Low (a human does the viewing; no bot surface) | Low–med (seconds/post) | **Recommended level** — see §4. |
| FB via **Apify / headless Playwright** | logged-in group automation | **Very high** (FB actively breaks automation; session/2FA churn; account risk) | High (constant maintenance) | **Reject** for FB. Already empirically dead here. |
| Messy-NL structuring | **Claude Haiku** (`claude-haiku-4-5`) via structured output | Low | Low (<NZ$5/mo at volume) | **Keep** — core value-add; extraction not reasoning. |
| Low-confidence retry | **Claude Sonnet** on the small low-confidence tail only | Low | Low (rare) | **Defer** — add only if Haiku's low-confidence rate proves painful. |
| Cross-source dedup (fuzzy) | **pg_trgm** (names) + **normalised phone** + optional **pgvector** embeddings for adjudication | Low | Low | pg_trgm already in 041; add phone key; embeddings only if trgm+phone miss. |
| Scheduling / orchestration | **pg_cron + pg_net + status columns** (the live pattern) | Low | Low | **Keep.** This is already durable-enough (run rows + watchdog). |
| Durable multi-step agent orchestration (e.g. Vercel Workflow) | — | — | — | **Not needed.** This is a poll-and-stage pipeline, not a crash-safe long-running agent. Revisit only if an adapter grows a genuinely long, multi-step, resumable flow. |

**Orchestration note:** the pull adapters belong on a scheduler that owns the
scrape wall-clock. Two valid shapes coexist today: **push** (source runs on its
own schedule, webhooks into `lead-intake` — the Apify/webhook pattern) and
**pull** (`pg_cron` → `pg_net.http_post` → `lead-harvest`, EdgeRuntime.waitUntil
for the long tail — the live nzfarmingjobs pattern). Keep both; pick per adapter
by where the work should run.

---

## 4. Where Facebook lands (a recommendation, not a given)

**Recommendation: FB = assisted human capture. Do not automate the browser.**

Rationale, weighted on the stated engineering axes (reliability/longevity ·
maintainability · ops overhead — not legal):

- **Fragility.** Headless FB automation is the single most fragile approach in
  the whole design. FB actively breaks automation; sessions and 2FA churn; the
  account carries risk. This is not theoretical here — the Apify FB actor was
  built and is **dead / zero-rows** (STATE). Betting the primary source on the
  most breakable mechanism is backwards.
- **Founder leverage.** The admin already reads the group. Assisted capture
  (paste the post, or one tap of a future "Capture" button) costs seconds and
  routes into the exact same spine — the machine still does 100% of the
  structuring, dedup and filing. The drudgery win is preserved; only the
  *seeing* stays human.
- **Data quality.** A human at the capture point is a free first-pass filter
  (obvious spam/irrelevance never enters the pipeline) and disambiguates
  seeker-vs-employer at source.
- **Longevity.** Assisted capture is immune to FB layout/anti-bot changes by
  construction — there is no bot to detect.

**Level:** assisted capture now (paste lane already live via
`admin_lead_capture()`), with an optional thin **browser-extension "Capture to
TopFarms" button** as the next leverage step (pre-fills the paste call from the
post the admin is looking at — still human-initiated, still zero bot surface).
**Upgrade to automation only if capture volume empirically proves the
seconds/post cost hurts** — and even then prefer extension-assisted batch over a
headless bot. Retire the Apify FB actor dependency.

---

## 5. Schema, extraction, dedup, sync, failure handling

### 5.1 Schema — reuse `lead_staging`; three additive changes

Keep 041/044 as-is (`leads`, `lead_staging`, `lead_suppression`,
`lead_harvest_runs`, `_lead_intake()`, the RLS posture). Additive deltas only —
**staged, not applied**:

1. **`raw_ingest` (new) — the landing zone that closes the re-extract gap.**
   ```
   raw_ingest(
     id uuid pk, source text, source_ref text, natural_key text,
     content_hash text, payload jsonb, captured_at timestamptz,
     adapter_ver text,
     process_status text CHECK (landed|extracted|staged|error) DEFAULT 'landed',
     error text,
     UNIQUE (source, natural_key)          -- idempotency at the door
   )
   ```
   Deny-by-default RLS, service_role writes, admin reads (the `lead_harvest_runs`
   posture). Same 30-day purge clock as staging. Adapters write here; ② reads
   here; re-extraction re-reads here. `_lead_intake` gains an optional
   `p_raw_ingest_id` FK so a staging row points back at its raw source.
   *(If storing raw payload is undesirable for a given source, that adapter may
   write only a hash + excerpt — the spine tolerates it, it just loses
   re-extractability for that source.)*

2. **Stronger dedup key for seekers — normalised phone.** Add
   `contact_phone_norm text` (E.164-normalised) to `lead_staging` + `leads`,
   indexed. The 041 fingerprint (name+region+type) is fine for employers but
   weak for PM-only seekers with common names and misspelled regions. Phone,
   when present, is the strongest cross-source identity key.

3. **`source_sync_state` (new) — generalise incremental sync.**
   ```
   source_sync_state(
     source text pk, watermark text, last_run_at timestamptz,
     last_status text, last_error text
   )
   ```
   Generalises what `lead_harvest_runs` does for one harvester into a per-adapter
   cursor + health row. Watchdog (`lead_harvest_notify_check`, 056) generalises
   to alert on *any* adapter that is stale / erroring / backlogged.

`record_type` already exists as `leads.type` / `structured->>'type'`
(`employer|seeker`) — no change needed; the spine is already two-entity.

### 5.2 LLM extraction (② for messy sources)

Unchanged in shape from PHASE-LEADS-DESIGN §4, generalised:

- **Model:** Claude Haiku, structured output against the lead schema. Sonnet
  retry on the low-confidence tail only — deferred until measured.
- **Prompt carries closed lists:** 24-competency taxonomy slugs + 16 NZ regions
  + NZ-ag vocabulary ('2IC', 'OAD', 'break-fencing', 'milk for rent'…), so the
  extractor maps the real seeker-post language in the brief
  ("2ic near whakatana… keen to do milk for rent… can find mastitis").
- **Region normalisation is its own sub-step:** a gazetteer/alias map
  (whakatana→Whakatāne, BOP→Bay of Plenty) with LLM fallback; emit the
  normalised region *and* keep the raw string.
- **Emit per-field confidence + `missing_fields[]`; output `null`, never guess**
  — especially contact. Non-conforming output → staging row at `confidence=0`
  with a flag, never silently dropped.
- **Confidence routes review effort** (the leverage lever): high-confidence
  batch-approves; low-confidence gets full manual review. Founder attention is
  spent only where the machine is unsure.
- **Re-runnable:** because raw now lands in `raw_ingest`, an improved prompt/model
  re-extracts historical raw without re-scraping.

### 5.3 Dedup (③)

Layered, computed against `leads` + pending `lead_staging` + `lead_suppression`:

1. **Exact source_ref** → `exact_duplicate`, auto-skip (refresh last-seen).
2. **Exact fingerprint** (name+region+type, 041) → `exact_duplicate`.
3. **Phone key** (new) → normalised-phone match across sources →
   `suspect_duplicate` with the candidate shown (strongest seeker cross-source
   signal; catches the same person on FB + a board).
4. **Fuzzy** pg_trgm ≥ 0.6 on normalised name within region+type →
   `suspect_duplicate`, candidate shown side-by-side.
5. **Human is the arbiter for suspects** — approve-as-new / merge / reject. **No
   auto-merge** at high fragility; auto-merge that's wrong corrupts canonical
   data and is expensive to unwind. (Optional pgvector embedding adjudication
   only if trgm+phone prove insufficient — deferred until measured.)

Same employer, different roles = one lead + multiple `role_or_category` (merge
path), not two leads.

### 5.4 Incremental sync (⑤ of robustness)

- Per-adapter **watermark** in `source_sync_state`; pull only since watermark.
- **Dedup-before-spend** (proven on nzfarmingjobs): drop URLs already present as
  `source_ref` *before* calling the paid extractor. Steady state = only new
  items cost credits.
- Push adapters (webhook/email/extension) land ad hoc through the same door;
  idempotency via `UNIQUE(source, natural_key)` on `raw_ingest`.

### 5.5 Failure handling / robustness

- **Land-first decoupling:** raw is safe before any processing; extraction
  failures park at `raw_ingest.process_status='error'` and are retryable — never
  lost, never re-scraped.
- **Per-stage status** on raw + staging rows makes the pipeline observable and
  each stage independently retryable.
- **Watchdog generalised** (056 pattern): alert on stale adapter, error-rate
  spike, or staging backlog — quiet on healthy no-op.
- **Adapter isolation:** independent schedules/watermarks/health; one breakage
  is contained. `EdgeRuntime.waitUntil` for long pull tails (live pattern);
  `partial` run status when a budget cap is hit.
- **Verify the live process, not the config** — the standing lesson (probe, don't
  trust the file) applies to adapter health too: assert against run rows, not
  assumptions.

---

## 6. What this means to build (HOLD — for the go, in leverage order)

Not a plan, a sequence sketch. **Do not start without operator go.**

1. **Formalise the adapter contract + land raw** (`raw_ingest`, `p_raw_ingest_id`
   on `_lead_intake`). Unlocks re-extraction + clean idempotency. Biggest
   robustness ROI. Retrofit nzfarmingjobs as the reference adapter.
2. **Google Sheets adapter** — highest leverage-per-effort; also the
   manual-entry lane. Very low fragility.
3. **Seeker dedup upgrade** (phone key) — the data-quality gap the brief's real
   posts expose.
4. **FB assisted-capture** (decided §7.2) — retire the dead Apify FB actor;
   Capture browser-extension is a later upgrade, not part of this build.
5. **Seek / Trade Me** — gated on its own API-first research task (§7.3); that
   research picks the mechanism (API / partnership / Firecrawl) before any adapter.
6. **`source_sync_state` + generalised watchdog** — as adapter count grows.

Reddit/WhatsApp/email/referrals need **no spine work** when they arrive — each
is one thin adapter to the §1.1 contract. That is the design succeeding.

---

## 7. Decisions (operator, 2026-07-02)

Settled — this doc now reflects what's decided vs still-open:

1. **Store raw payload (§5.1) — ✅ YES**, transient with the 30-day clock.
   Re-extractability is worth it. (The `raw_ingest` landing zone is confirmed
   design.)
2. **FB level (§4) — ✅ assisted capture; retire the dead Apify FB actor.** The
   Capture browser-extension is a **LATER** upgrade — noted, **not built now**.
   Assisted paste (`admin_lead_capture()`, already live) is the level for v1.
3. **Seek / Trade Me — ⏸ NOT decided here.** This doc's "API-first, Firecrawl
   fallback" is a **placeholder**. Seek/TradeMe gets its **own research task**
   (already queued) — per-source: official API? partnership? ToS? feasibility?
   *That* research decides the mechanism, not this doc.
4. **Sheets — ⏸ PARKED.** Operator to confirm actual sheet usage (append-only
   vs edited-in-place — it drives the content-hash idempotency choice) **before**
   the Sheets adapter is built. Do not build until confirmed.
5. **Extraction retry — ✅ Haiku-only for now.** Defer the Sonnet low-confidence
   tail until measured.

**Status: DESIGN — filed + decided. No build yet.** When implementation is
picked up (a fresh session), follow the §6 leverage order:
**(1) adapter contract + raw landing zone first.** Two threads remain their own
tasks: Seek/TradeMe mechanism research (#3), and Sheets usage confirmation (#4).

**STOP — no build in this pass. Nothing installed or automated.**
