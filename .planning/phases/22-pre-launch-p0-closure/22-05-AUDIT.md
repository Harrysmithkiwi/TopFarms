# Phase 22-05 — MAIL-01/02 Docs Audit

**Date:** 2026-05-26
**Auditor:** Claude (orchestrator) + operator (Harry)
**Method:** Read-only consistency check across REQUIREMENTS.md ↔ 15-02-SUMMARY.md ↔ 15-02-EVIDENCE/ ↔ 13-VERIFICATION.md ↔ v2.0-MILESTONE-AUDIT.md
**Scope:** NO E2E re-fire (per 22-RESEARCH.md §6 + §Anti-Patterns row 1 — re-firing would produce duplicate emails to real test inboxes for zero new evidence; the 2026-05-03 evening Phase 15-02 fire is canonical).

---

## Step 1: REQUIREMENTS.md MAIL-01 — current state

**Location:** `.planning/REQUIREMENTS.md` line 18

**Checkbox state:** `[x]`
**Closure date claimed:** 2026-05-03 evening
**Evidence cited:**
- `email_headers.txt` DKIM-Signature header with `d=topfarms.co.nz`
- `Authentication-Results: dkim=pass; spf=pass; dmarc=pass`
- Closure history: reset 2026-04-29; partial-close 2026-05-01 via 13-VERIFICATION.md backfill; placement_fees + cron + Resend infra confirmed 2026-05-03 morning; full §7 evidence captured 2026-05-03 evening via Phase 15-02
**§7-satisfied claim:** YES — explicit "§7-satisfied:" marker present

---

## Step 2: REQUIREMENTS.md MAIL-02 — current state

**Location:** `.planning/REQUIREMENTS.md` line 19

**Checkbox state:** `[x]`
**Closure date claimed:** 2026-05-03 evening
**Evidence cited:**
- `pg_net_response.json` shows status_code 200 with `{"sent":2,"failed":0,"job_id":"b00254c7-..."}`
- Per-applicant verdict in 15-02-SUMMARY.md: 2/2 NOTIFY-bucket applicants received emails AND 2/2 terminal-status applicants did not (race-fix exercised: `offered` → `hired` during fire correctly excluded)
- Four latent bugs in the chain were diagnosed and fixed during the test (pg_net signature drift, vault never populated, legacy JWT gateway rejection, modal non-atomic UPDATE)
**§7-satisfied claim:** YES — explicit "§7-satisfied:" marker present

---

## Step 3: REQUIREMENTS.md Traceability table — MAIL-01/02 rows

**MAIL-01 row (line 169):**
```
| MAIL-01 | Phase 15 | Partial-close (2026-05-01) — code deployed; awaiting RESEND_API_KEY + plan 15-02 E2E before full satisfaction |
```

**MAIL-02 row (line 170):**
```
| MAIL-02 | Phase 15 | Partial-close (2026-05-01) — notify-job-filled deployed, trigger live; awaiting RESEND_API_KEY + plan 15-02 E2E before full satisfaction |
```

**⚠ DRIFT DETECTED:** Traceability table rows still say "Partial-close (2026-05-01)" but the canonical state (line 18-19 above) is `[x]` closed 2026-05-03 evening. RESEND_API_KEY was set; plan 15-02 E2E was executed; full §7 evidence captured. The Traceability rows did not get updated when MAIL-01/02 flipped on 2026-05-03 evening.

---

## Step 4: REQUIREMENTS.md change-log — MAIL-01/02 entries

**2026-05-01 Phase 15 closeout entry (line 210-211):** *(partial-close note — MAIL-01/02 stayed `[ ]`, awaiting RESEND_API_KEY + plan 15-02 E2E)*

**2026-05-03 evening entry (referenced in line 18-19 closure history + line 214 of REQUIREMENTS.md change-log):** MAIL-01/02 flipped from `[ ]` to `[x]` via Phase 15-02 empirical fire; all 4 §7 evidence artefacts captured (pg_net 200, DKIM=pass, per-applicant 4/4, four latent chain bugs fixed). The change-log notes this flip — but the Traceability table (Step 3) was not updated in the same edit.

---

## Step 5: 15-02 Evidence Cross-Check

**15-02-SUMMARY.md key claims:**
- Status: **SATISFIED — all four §7 evidence artefacts captured cleanly**
- Date: 2026-05-03 evening
- Trigger fire: ~2026-05-03T12:01:30 UTC
- pg_net response: status_code **200**, content `{"sent":2,"failed":0,"job_id":"b00254c7-b9e0-4865-80fb-756d570d9a66"}`, error_msg `null`
- Per-applicant verdict: **2 RECEIVED + 2 NOT RECEIVED = 4/4 CORRECT**
  - 2 NOTIFY-bucket (+notify-applied, +notify-shortlisted): inbox delivery confirmed by operator (Harry)
  - 2 terminal-status (+notify-offered, +notify-declined): correctly excluded by trigger (NOTIFY_STATUSES filter); plus race-fix exercised — application `dd396022` was `offered` → updated to `hired` during fire, correctly excluded
- DKIM/SPF/DMARC: **all PASS** per Gmail Authentication-Results verdict block

**15-02-EVIDENCE/pg_net_response.json contents (verbatim):**
- captured_at: `2026-05-03T12:02:30+00:00`
- captured_via: `mcp__supabase__execute_sql (read-only) against net._http_response`
- Response id 4: status_code `200`, content `{"sent": 2, "failed": 0, "job_id": "b00254c7-b9e0-4865-80fb-756d570d9a66"}`, error_msg `null`, verdict `PASS — primary MAIL-02 trigger-side evidence`

**15-02-EVIDENCE/email_headers.txt contents (key headers):**
- SPF: `PASS with IP 23.251.234.54`
- DKIM: `PASS with domain topfarms.co.nz`
- DMARC: `PASS`
- Delivered-To: `harry.symmans.smith+notify-shortlisted@gmail.com`
- From: `TopFarms <hello@topfarms.co.nz>`
- Subject: `Update on your application — UAT Farm Assistant — Applied at Test Farm (UAT)`
- DKIM-Signature: present and verified by Gmail per the Authentication-Results block (documented in file with equivalence rationale: `Authentication-Results: dkim=pass` IS Gmail's cryptographic verdict — strictly stronger evidence than the raw header alone)

**15-02-EVIDENCE/test_setup.json contents:**
- 4 test applicants with expected_post_fire_state matching the SUMMARY's per-applicant verdict (2/2 NOTIFY-bucket → email, 2/2 terminal-status → no email)

### Cross-Reference Table

| REQUIREMENTS.md claim (Task 1) | Source evidence (Step 5) | Match? |
|---|---|---|
| MAIL-01 cites `email_headers.txt` shows DKIM-Signature with `d=topfarms.co.nz` and Authentication-Results: dkim=pass | email_headers.txt: `DKIM: PASS with domain topfarms.co.nz` + DKIM-Signature equivalence note + `Authentication-Results` block (SPF/DKIM/DMARC all PASS) | **YES** |
| MAIL-02 cites `pg_net_response.json` status_code 200 with `{"sent":2, "failed":0, "job_id":"b00254c7-..."}` | pg_net_response.json id 4: status_code 200, content `{"sent": 2, "failed": 0, "job_id": "b00254c7-b9e0-4865-80fb-756d570d9a66"}`, error_msg null | **YES** |
| MAIL-02 cites per-applicant 4/4 correct in 15-02-SUMMARY.md | 15-02-SUMMARY.md: 2/2 NOTIFY-bucket received + 2/2 terminal-status not received = 4/4 CORRECT | **YES** |
| MAIL-02 cites race-fix exercised: `offered` → `hired` during fire correctly excluded | 15-02-SUMMARY.md per-applicant verdict + pg_net_response.json interpretation: "sent:2 matches the expected partition (3 NOTIFY pre-fire minus 1 'offered' transitioned to 'hired' during fire = 2 receivers)"; application `dd396022` reference confirms | **YES** |
| MAIL-01/02 closure date is 2026-05-03 evening | 15-02-SUMMARY.md Date field: `2026-05-03 evening` | **YES** |

**5/5 YES** — REQUIREMENTS.md MAIL-01/02 claims are empirically backed by the 15-02-EVIDENCE/ artefacts. No material drift in the bullet-level closure notes.

---

## Step 6: v2.0-MILESTONE-AUDIT.md + 13-VERIFICATION.md Drift Check

### v2.0-MILESTONE-AUDIT.md

**MAIL-01 mentions (verbatim with line numbers):**
- Line 59: `"MAIL-01/02 fully satisfied 2026-05-03 evening via Phase 15-02 fire — 4 latent chain bugs surfaced and fixed during empirical test"`
- Line 190: `"All 11 milestone REQ-IDs (AUTH-06/07/08, MAIL-01/02, BFIX-01/02/03, SRCH-13/14/15) have empirical evidence captured per CLAUDE §7 partial-close discipline"`
- Line 193: `"MAIL-01/02 closed 2026-05-03 evening via Phase 15-02 empirical fire — DKIM signed delivery confirmed, per-applicant verdict 4/4 correct, 4 latent chain bugs surfaced and fixed"`
- Line 219: `| MAIL-01 | SPF/DKIM DNS | 15 (via 13 backfill) | passed (4/4 SCs after 15-02 fire) | listed (15-02) | [x] | **satisfied** |`
- Line 302: `"✓ MAIL-01/02 fully closed via Phase 15-02 (2026-05-03 evening)"`
- Line 316: `"✓ MAIL-01/02 fully satisfied 2026-05-03 evening"`
- Line 357: `"MAIL-01/02 fully satisfied via Phase 15-02 empirical fire 2026-05-03 evening (DKIM-signed delivery + per-applicant verdict 4/4 correct)"`
- Lines 409-424: Carryforward section titled "RESEND_API_KEY production secret + MAIL-01/02 E2E verification" — explicitly marked `**STATUS 2026-05-13: ✓ CLOSED via Phase 15-02 fire 2026-05-03 evening.** RESEND_API_KEY set, plan 15-02 executed end-to-end, DKIM-signed delivery confirmed, MAIL-01/02 flipped [x] in REQUIREMENTS.md. Retained here for traceability.` — this is intentional historical retention, NOT drift.

**MAIL-02 mentions (verbatim with line numbers):**
- Line 21: `"flows: all MVP flows verified empirically (OAuth handshake + role-routing, MAIL-02 trigger→Resend, BFIX-02 5-layer privacy gate, BFIX-03 doc categorization, SRCH-13/14/15 UAT 8/8, admin gateway hybrid route)"`
- Line 220: `| MAIL-02 | Filled-job notification email | 15 | passed (4/4 SCs after 15-02 fire) | listed (15-02) | [x] | **satisfied** |`
- Line 359: `| Auto-ghosting prevention (MAIL-02 + notification email) | Trigger → Edge Function → Resend chain fired and verified per-applicant | ✅ **complete** |`

**Carryforward status:**
- Is MAIL-01 currently listed in any "Carryforward" / "Open Gaps" / "Pending" / "Deferred" section? **NO active open carryforward.** The historical carryforward at lines 409-424 is explicitly marked **CLOSED** with the 2026-05-13 timestamp + "Retained here for traceability" — appropriate use of the retention pattern, not drift.
- Is MAIL-02 currently listed in any "Carryforward" / "Open Gaps" / "Pending" / "Deferred" section? **NO active open carryforward.** Same historical-retention treatment.

Per CLAUDE §7: there is no drift to correct in v2.0-MILESTONE-AUDIT.md — both MAIL-01 and MAIL-02 are consistently presented as `[x]` / **satisfied** across all mentions, with the historical carryforward kept for traceability per the established retention pattern.

### 13-VERIFICATION.md

**Overall Verdict:** PASS (per per-sub-phase verdicts below — all 4 SATISFIED)

**MAIL-01 sub-verdicts:**
- Sub-phase 13-02 MAIL-01 SC #1 (SPF/DKIM Verified): **SATISFIED** *(closed 2026-05-03 via plan 15-02 execution)*
- Sub-phase 13-02 MAIL-01 SC #2 (Test Email in Inbox): **SATISFIED** *(closed 2026-05-03 via plan 15-02 execution)*

**MAIL-02 sub-verdicts:**
- Sub-phase 13-01 MAIL-02 SC #3 (Filled-Job Notification Positive Case): **SATISFIED** *(closed 2026-05-03 via plan 15-02 execution)*
- Sub-phase 13-01 MAIL-02 SC #4 (Negative case + race-fix): **SATISFIED** *(closed 2026-05-03 via plan 15-02 execution — see 15-02-SUMMARY.md §"Verification Notes for Plan 15-04" lines 147-152)*

All 4 sub-criteria flipped to SATISFIED in the same atomic commit that captured the §7 evidence. 13-VERIFICATION.md is fully consistent with REQUIREMENTS.md and 15-02-SUMMARY.md.

---

### Task 4 Decision — Outcome B (Minor Drift — 2 cosmetic Traceability row corrections)

**Justification synthesising Steps 1-6:**

- **Step 5 Cross-Reference Table:** 5/5 YES. The bullet-level closure notes for MAIL-01 + MAIL-02 in REQUIREMENTS.md are empirically backed by the 15-02-EVIDENCE/ artefacts. No material drift at the §7-satisfied claim level.
- **Step 6 v2.0-MILESTONE-AUDIT.md:** 8 mentions of MAIL-01/02, all consistently labeling them as `[x]` / **satisfied** / **complete**. The historical carryforward at lines 409-424 is appropriately marked CLOSED + retained for traceability — no drift.
- **Step 6 13-VERIFICATION.md:** Overall Verdict PASS; 4/4 sub-criteria SATISFIED with explicit closure dates pointing to 2026-05-03 evening Phase 15-02 execution. Consistent.
- **Step 3 Traceability table (line 169-170):** STALE. Both rows still say "Partial-close (2026-05-01) — code deployed; awaiting RESEND_API_KEY + plan 15-02 E2E before full satisfaction." This contradicts the bullet-level state, the change-log, and the v2.0 audit. The Traceability table did not get updated when MAIL-01/02 flipped on 2026-05-03 evening.

**Outcome B applies.** Two single-line edits required to bring the Traceability table into consistency with the rest of the documentation. No de-flip (Outcome C) needed — the §7-satisfied evidence is solid; the drift is purely a missed update on the auxiliary Traceability table.

---

## Step 7: Verdict + Action

**Verdict:** MINOR DRIFT — 2 cosmetic Traceability row corrections applied.

**Corrections applied:**

1. `.planning/REQUIREMENTS.md` line 169 — MAIL-01 Traceability row updated from "Partial-close (2026-05-01)" stale wording to "Complete (2026-05-03 evening — see 15-02-SUMMARY.md, all 4 §7 evidence artefacts captured)"
2. `.planning/REQUIREMENTS.md` line 170 — MAIL-02 Traceability row updated from "Partial-close (2026-05-01)" stale wording to "Complete (2026-05-03 evening — see 15-02-SUMMARY.md, pg_net 200, per-applicant 4/4, 4 latent bugs fixed)"

**Outcome:** REQUIREMENTS.md MAIL-01 + MAIL-02 `[x]` state preserved (canonical evidence at lines 18-19 remains valid + unchanged); stale Traceability table rows brought into consistency with the canonical bullet-level closure notes + change-log + v2.0-MILESTONE-AUDIT.md state.

**Anti-pattern guard satisfied (per plan §verification + 22-RESEARCH.md §Anti-Patterns row 1):**
- NO E2E re-fire performed — zero `MarkFilledModal` opened, zero Studio SQL `UPDATE applications`/`UPDATE jobs` ran, zero `pg_net.http_post` invocations from this session
- NO code changes
- NO migration changes
- NO DB writes
- Read-only investigation throughout (MCP read-only mode preferred per CLAUDE §2 — but this audit did not even need MCP since all evidence is in repo files)

Plan 22-05 closes with `22-05-AUDIT.md` (this file) + 2 single-line Traceability edits in `.planning/REQUIREMENTS.md`.
