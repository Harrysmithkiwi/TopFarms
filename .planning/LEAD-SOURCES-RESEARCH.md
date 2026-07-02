# TopFarms — Lead-Source Ingestion Research (per-source, feeds the adapters)

*2026-07-02 · Research pass that feeds the adapters in
`.planning/INGESTION-ARCHITECTURE.md` (the source-agnostic spine: adapters →
RawItem → raw landing → LLM extract → staging → human approval → leads).*
*Status: **RESEARCH — HOLD. No tool installed, run, or scraped in this pass.**
No Apify actor was run; the two named actors were read (their public pages
only), not executed.*

---

## 0. Framing

**Objective:** continuously ingest employer opportunities *and* seeker intent
from many channels with least founder effort + highest leverage. FB (the NZ
Dairy Jobs group TopFarms admins) is today's primary manual source; this
researches the general case.

**Compliance is handled — this is an engineering-reliability analysis.**
Member-consent + privacy are settled (TopFarms admins the group, is transparent
to members). Not re-litigated here. What *is* in scope as an engineering input:
**does an approach risk the admin's personal FB account being rate-limited,
flagged, or banned, and how fragile is it to platform change?** An approach that
bans the account in week 3 is not reliable, however elegant. Account-safety and
fragility are weighed alongside maintainability and overhead. The stakes are
higher than they look: **the admin account that would drive any FB automation is
the same account that administers the group** — lose it to a ban and you lose the
source itself, not just the pipeline.

Ratings below: **Fragility**, **Founder-overhead**, **Account-safety-risk** —
each Low / Med / High (for account-safety, Low = safe).

---

## 1. Per-source / per-mechanism assessment

### Summary matrix

| Mechanism | Applies to | Fragility | Founder-overhead | Account-safety-risk | Verdict |
|---|---|---|---|---|---|
| **Firecrawl harvest** (live) | static public job boards | Med | Low | Low (no login) | **KEEP / EXTEND** to more static boards |
| **Seek / Trade Me** | those two boards | High (JS SPA + anti-bot) | Med | Low–Med | **DEFER to its own API-first research task** (not decided here) |
| **Meta Graph API** | FB group posts | — | — | — | **DROP — impossible** (API removed Apr 2024) |
| **Apify `agentify/claude-code`** | — | — | — | — | **IRRELEVANT** — not a scraper (runs Claude Code on Apify infra) |
| **Apify `dtrungtin/claude-ai-web-automation`** | generic sites; FB via cookie-inject | High | Med | **High** (logged-in FB) | **REJECT for FB** (vendor says unsuited; ban risk) |
| **Playwright / computer-use agent** | FB group (logged-in) | High | High | **High** (logged-in FB) | **REJECT for FB** |
| **Assisted / semi-manual capture** | FB + any messy source | **Low** | Low (seconds/post) | **Low** (no bot) | **RECOMMEND for FB** (primary) |
| **Thin "Capture to TopFarms" extension** | FB + browser sources | Low | Low once built | Low (human-initiated) | **LATER** leverage upgrade — not now |

### 1a. Firecrawl harvest (already live — nzfarmingjobs)

- **Mechanism:** cron pull → Firecrawl `map → filter → dedup-before-spend →
  scrape(json schema)`. Live and proven (5 credits per new ad; dedup on
  `source_ref` before spending). No login anywhere.
- **Assessment:** Fragility **Med** (a board redesign breaks the extract schema,
  but it's a managed service and the failure is loud, not an account event).
  Overhead **Low** (keyed, cron'd, watchdog'd). Account-safety **Low** — public
  pages, identifiable UA, no session.
- **Recommendation: KEEP; extend to additional *static* public boards** by
  adding per-board config (the reference adapter pattern). This is the lowest-risk
  automation in the whole design.

### 1b. Seek / Trade Me

- **Mechanism options:** official/partner API (if one exists) · Firecrawl with
  SPA `--wait-for` · a maintained scraper. Both are JS-heavy SPAs with anti-bot
  posture, so a raw scrape is materially more fragile than a static board.
- **Recommendation: DEFER.** Per the ingestion doc §7.3 this is **its own
  API-first research task** — per-source: is there an official/partner API? a
  data partnership? what do the ToS allow? feasibility? *That* task picks the
  mechanism; this doc does not. Flagged so it isn't quietly folded into a scrape
  by default. (Account-safety here is Low–Med — no personal-account login, but
  aggressive anti-bot can IP-block the harvester.)

### 1c. Meta Graph API — **not an option**

- **Honest check, confirmed:** Meta **fully removed the Facebook Groups API**.
  Deprecated in v19 (Jan 2024), removed from **all versions on 22–23 April
  2024** — including `groups_access_member_info` and the Group Feed API, and the
  ability for admins to install apps on a group. **Third-party apps can no longer
  read group member posts or the group feed via the API**; only historical data
  is view-only, and there is no announced path to restoration.
- **Implication:** there is **no sanctioned programmatic path** to group posts —
  not even for the group's own admin. Every automated alternative therefore has
  to drive a logged-in *human* session, which is exactly where account-safety
  risk lives. **DROP.**

### 1d. Apify actors (named — read only, not run)

- **`agentify/claude-code`:** runs Anthropic's Claude Code on Apify
  infrastructure (a coding agent in a sandbox). **Not a scraper / not browser
  automation** — irrelevant to ingestion. Discard for this purpose.
- **`dtrungtin/claude-ai-web-automation`:** LLM-driven browser automation (plain-
  English task → click/type/scroll/extract), supports **authenticated sessions
  via injected `loginCookies`**. Its own page states it is **not well-suited to
  Facebook** — FB's anti-bot protection triggers CAPTCHAs and the actor is built
  for public e-commerce/content sites. Using it against FB means injecting the
  admin's session cookies into a cloud browser → **High account-safety risk**.
- Consistent with local history: the previously-built **Apify FB actor is
  empirically dead here (zero-rows)** (STATE). Nothing in the current research
  changes that verdict.

### 1e. Playwright / browser-automation / computer-use agent (FB)

- **Mechanism:** drive a logged-in FB session (Playwright, or a computer-use
  agent) to read the group feed.
- **Assessment:** Fragility **High** — FB actively detects and breaks
  automation; sessions and 2FA churn; DOM changes frequently. Overhead **High** —
  ongoing maintenance of selectors, session refresh, proxy/fingerprint churn.
  Account-safety **High** — the classic path to rate-limit → checkpoint → ban on
  the driving account, which here is the group's admin account.
- **Recommendation: REJECT for FB.** This is the most fragile *and* highest-risk
  mechanism in the whole design, for the lowest-volume source. Wrong trade on
  every axis.

### 1f. Assisted / semi-manual capture — **the recommended FB lane**

- **Mechanism:** the admin (already reading the group) captures a raw post —
  paste text into the existing admin paste-box (`admin_lead_capture()`, live) or
  into a Google Sheet that becomes a Sheets adapter — and the machine does 100%
  of structuring / confidence / dedup / staging / approval. The *seeing* stays
  human; nothing else does.
- **Assessment:** Fragility **Low** — immune to FB layout/anti-bot change by
  construction (there is no bot to detect). Overhead **Low** — seconds per post
  at this group's volume. Account-safety **Low** — zero automation surface on the
  account. Bonus: the human is a free first-pass spam/relevance filter and
  disambiguates seeker-vs-employer at source.
- **Recommendation: PRIMARY for FB.** Reuses the existing harvest→staging→
  approval spine with no new account risk. Two implementation shapes:
  (a) the **live paste-box** (`admin_lead_capture`) — available now;
  (b) **paste-into-Sheet → Sheets adapter** — depends on the parked Sheets
  decision (ingestion §7.4). Start with (a).

### 1g. Thin "Capture to TopFarms" browser extension

- **Mechanism:** a one-tap button while the admin is looking at a post; pre-fills
  the paste call from the visible post. Human-initiated, zero bot surface.
- **Recommendation: LATER.** A real leverage upgrade over manual paste, but not
  now (matches ingestion §7.2). Noted, not built.

---

## 2. Facebook verdict — confirmed (operator lean was right)

*This section is the **verified justification** for the FB decision recorded in
`INGESTION-ARCHITECTURE.md` §7.2 (assisted capture; retire the dead Apify FB
actor). Decision lives there; the evidence lives here — linked both ways so a
future session sees **why**, not just **that**.*

**Assisted human capture, NOT headless browser automation.** The research
*strengthens* the lean rather than challenging it, on three independent grounds:

1. **No sanctioned path exists.** The Graph API route to group posts is gone
   (removed Apr 2024, no restoration). Every remaining automated option must
   drive a logged-in human session.
2. **That session is the group's admin account.** Automating it (Apify
   cookie-inject, Playwright, computer-use) risks rate-limit → checkpoint → ban.
   A ban doesn't just break the pipeline — it can cost the group. Highest risk,
   highest fragility, for the lowest-volume source. Empirically the Apify FB
   actor already returns zero rows here.
3. **Assisted capture dominates on every axis that matters for a low-volume
   group** — Low fragility, Low overhead (seconds), Low account risk — while the
   machine still does 100% of the structuring/dedup/filing. The founder-leverage
   win is preserved; only the *viewing* stays human.

**Retire the dead Apify FB actor. Level FB at assisted capture (paste-box now),
extension later.** Revisit automation only if capture volume ever proves the
seconds/post cost painful — and even then prefer extension-assisted over a
headless bot on the admin account.

---

## 3. Extraction-prompt approach (the LLM stage for messy sources)

Model **Claude Haiku** (`claude-haiku-4-5`), structured output; Sonnet
low-confidence tail deferred until measured (ingestion §7.5). One prompt per
record-type, both emitting per-field confidence + `missing_fields[]` and
**`null`, never a guess** (especially contact).

**Employer schema:** farm name · position · region · accommodation · roster ·
salary · contact · experience required · post URL · posted date.

**Seeker schema:** name · preferred region · desired role · years experience ·
skills · machinery experience · accommodation requirements · contact preference ·
availability · raw post · confidence score.

**Prompt must carry, as closed lists / hints:**
- the 24-competency taxonomy slugs + the 16 NZ regions (so output maps to
  TopFarms vocabulary, not free text);
- NZ-ag terminology so real posts parse — "2ic"/"2IC", "OAD", "milk for rent",
  "break-fencing", "calf rearing", "can find mastitis", machinery shorthand
  ("2 wheeler", "quad", "chainsaw");
- a **region-normalisation sub-step**: misspelled/abbreviated → canonical
  ("whakatana"→Whakatāne, "BOP"/"Rotorua or BOP"→Bay of Plenty), emitting the
  normalised region **and** keeping the raw string.

**Worked against the real posts:**
- *"…farm assistant or 2ic near whakatana, 3-4 bedroom house, 9 years experience,
  keen to do milk for rent, can find mastitis, breakfencing, 2 wheeler + quad +
  chainsaw"* → seeker · role `farm_assistant`/`2ic` · region Bay of Plenty
  (Whakatāne) · accommodation "3-4 bedroom house" · exp 9y · skills {mastitis,
  break-fencing} · machinery {2-wheeler, quad, chainsaw} · pay-pref "milk for
  rent" · **contact null** (PM-only) → **low confidence on contact → full manual
  review.**
- *"farm assistant Rotorua or BOP, accommodation for partner + 6 month old,
  3 years experience, PM for details"* → seeker · role `farm_assistant` · region
  Bay of Plenty · accommodation "family (partner + infant)" · exp 3y · **contact
  null (PM-only)**.

**Confidence routes review effort** (the leverage lever): high-confidence
batch-approves; low-confidence (which PM-only contact will make common for
seekers) gets full manual review. Non-conforming output → staging row at
`confidence=0` with a flag, never silently dropped. Because raw lands first
(ingestion §5.1), an improved prompt re-extracts history without re-capture.

---

## 4. Dedup strategy across sources

The hard case is exactly the FB reality: **PM-only contact + misspelled regions +
common names** — the weakest possible identity signals. Layered, human-arbitrated
(from ingestion §5.3, with the seeker-specific reinforcement this research
confirms is needed):

1. **Exact `source_ref`** (same post/listing seen again) → `exact_duplicate`,
   auto-skip. Strong for boards, weak for FB (paste has no stable URL → use a
   content hash of the pasted text as the natural key).
2. **Fingerprint** = normalised(name)+region+type (041). Fine for employers;
   weak for seekers (common names, region misspelling — mitigated by feeding the
   **normalised** region from §3 into the fingerprint, not the raw string).
3. **Phone key** (new, ingestion §5.1) = E.164-normalised contact phone → the
   strongest cross-source seeker signal *when a phone is present*. Often it isn't
   (PM-only) — so this catches some, not all.
4. **Fuzzy** pg_trgm ≥ 0.6 on normalised name within region+type →
   `suspect_duplicate`, candidate shown side-by-side.
5. **Human is the arbiter for suspects** — approve-as-new / merge / reject. **No
   auto-merge**; wrong auto-merges corrupt canonical data and are expensive to
   unwind.

**Honest limit:** for PM-only seekers with no phone and a common name, automated
dedup *cannot* be reliable — the signals aren't there. The design's answer is not
to fake certainty but to **surface the best candidate to the human at approval**
(the gate already exists) and let the reviewer decide. Cross-source dedup (same
person on FB + a board) is best-effort by phone/name; the human closes the gap.
An optional pgvector-embedding adjudication on the suspect set is a later lever if
trgm+phone prove insufficient — deferred until measured.

---

## 5. Bottom line

- **FB: assisted capture** (paste-box now, extension later). Retire the dead
  Apify FB actor. No sanctioned API, and every automation path risks the group's
  own admin account — for the lowest-volume source. Confirmed on the merits.
- **Static boards: keep/extend Firecrawl.** Lowest-risk automation; the reference
  adapter.
- **Seek/Trade Me: its own API-first research task** decides the mechanism — not
  decided here.
- **Meta Graph API: drop** (removed 2024). **Named Apify actors: one irrelevant,
  one unsuited to FB.**
- **Extraction: Haiku + closed-list prompt + region-normalise + confidence-routed
  review.** **Dedup: layered + phone key + human arbiter, honest about the
  PM-only seeker limit.**

Everything here feeds the existing spine — no new pipeline. When implementation
is picked up (fresh session), the ingestion doc's leverage order stands:
**adapter contract + raw landing zone first.**

**STOP — RESEARCH ONLY. Nothing installed, run, or scraped. HOLD for operator
go.**

---

### Sources (external facts verified this pass)
- Facebook Groups API removal (Apr 2024): [Sprinklr Help](https://www.sprinklr.com/help/articles/getting-started/meta-deprecates-facebook-groups-api/66229eb25f9dd9599d632712) · [Graph API v19 changelog](https://developers.facebook.com/docs/graph-api/changelog/version19.0/) · [TechCrunch](https://techcrunch.com/2024/02/05/meta-cuts-off-third-party-access-to-facebook-groups-leaving-developers-and-customers-in-disarray/) · [Smash Balloon](https://smashballoon.com/doc/facebook-api-changes-affecting-groups-april-2024/)
- Apify actors (public pages, not run): [dtrungtin/claude-ai-web-automation](https://apify.com/dtrungtin/claude-ai-web-automation) · [agentify/claude-code](https://apify.com/agentify/claude-code)
