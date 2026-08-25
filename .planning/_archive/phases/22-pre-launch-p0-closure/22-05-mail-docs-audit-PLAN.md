---
phase: 22-pre-launch-p0-closure
plan: "05"
type: execute
wave: 3
depends_on: ["22-00"]
files_modified:
  - .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md
autonomous: false
requirements: [MAIL-01, MAIL-02]
must_haves:
  truths:
    - "MAIL-01 and MAIL-02 current state in REQUIREMENTS.md is empirically consistent with the §7 evidence captured in 15-02-EVIDENCE/ on 2026-05-03 evening"
    - "No E2E re-fire is performed — re-firing produces duplicate emails to real test inboxes; existing evidence is canonical"
    - "If any drift between REQUIREMENTS.md state and 15-02-EVIDENCE/ artefacts is found, a minimal docs correction is applied (REQUIREMENTS.md or carryforward to v2.0-MILESTONE-AUDIT.md per §7)"
    - "If no drift is found, a 3-line audit-clean confirmation is recorded in 22-05-AUDIT.md"
    - "v2.0-MILESTONE-AUDIT.md (if it lists MAIL-01/02 in any carryforward) is updated to reflect closed state"
  artifacts:
    - path: ".planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md"
      provides: "Audit findings + verdict (clean OR drift-corrected) + cross-reference table linking REQUIREMENTS.md claims to 15-02-EVIDENCE/ artefacts"
      contains: "MAIL-01"
  key_links:
    - from: ".planning/REQUIREMENTS.md:18 (MAIL-01) + :19 (MAIL-02)"
      to: ".planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/{pg_net_response.json, email_headers.txt, test_setup.json}"
      via: "explicit citation in §7-satisfied closure notes"
      pattern: "15-02-EVIDENCE"
---

<objective>
**Reframed per `22-RESEARCH.md §6` and `<critical_research_corrections>`:** the ROADMAP Phase 22 description (line 406) says "Option A — run deferred plan 15-02 E2E (notify-job-filled trigger fire → seeker inbox receipt) to capture true empirical evidence; then flip `[ ]` → `[x]` in REQUIREMENTS.md." This is OBSOLETE. Plan 15-02 was executed 2026-05-03 evening (NOT deferred); REQUIREMENTS.md:18-19 already shows MAIL-01/02 at `[x]` with full §7 evidence (pg_net 200, DKIM=pass, per-applicant 4/4 correct). Re-firing would produce duplicate emails to real test inboxes for zero new evidence.

**Plan 22-05 is therefore a DOCS AUDIT, not an E2E re-fire.** Read REQUIREMENTS.md claims about MAIL-01/02; read the canonical evidence (15-02-SUMMARY.md + 15-02-EVIDENCE/ artefacts); confirm consistency. If drift found, apply minimal correction; if clean, document audit clean.

Per CLAUDE §3 (diagnose before fix): NO code, NO migration, NO DB write, NO email re-fire. Read-only investigation + (at most) a single docs commit.

Purpose: close out the last Phase 22 scope item — confirm the MAIL-01/02 documentation state is sound before v2.0 milestone close. The "P1 docs lie" framing from the ROADMAP was based on a stale assumption; this plan empirically verifies that assumption was wrong (or, if right, applies the minimal correction).

Output: `22-05-AUDIT.md` recording findings + verdict; at most a 1-3-line edit to REQUIREMENTS.md or v2.0-MILESTONE-AUDIT.md if drift is found. Phase 22 complete after this plan + plan 22-04 both close.
</objective>

<execution_context>
@/Users/harrysmith/.claude/get-shit-done/workflows/execute-plan.md
@/Users/harrysmith/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md
@.planning/phases/22-pre-launch-p0-closure/22-VALIDATION.md
@CLAUDE.md

# Sources of truth for MAIL-01/02 state
@.planning/phases/15-email-pipeline-deploy/15-02-SUMMARY.md
@.planning/phases/13-email-notifications/13-VERIFICATION.md
@.planning/v2.0-MILESTONE-AUDIT.md

<interfaces>
**REQUIREMENTS.md current state (lines 18-19):**
```markdown
- [x] **MAIL-01** *(closed 2026-05-03 evening)*: Resend sending domain has SPF and DKIM DNS records configured and verified for production email delivery. **§7-satisfied:** `email_headers.txt` shows `DKIM-Signature` header with `d=topfarms.co.nz` and `Authentication-Results: dkim=pass; spf=pass; dmarc=pass` on the production email delivery captured during Phase 15-02 fire. ...

- [x] **MAIL-02** *(closed 2026-05-03 evening)*: When employer marks a job as filled, all applicants with unresolved status (...) receive an automated notification email. **§7-satisfied:** `pg_net_response.json` shows status_code 200 with `{"sent":2,"failed":0,"job_id":"b00254c7-..."}` for the test job; per-applicant verdict in 15-02-SUMMARY.md confirms 2/2 NOTIFY-bucket applicants received emails and 2/2 terminal-status applicants did not ...
```

**15-02-SUMMARY.md (canonical evidence file, already read above):**
- pg_net response: status_code 200, `{"sent":2,"failed":0,"job_id":"b00254c7-..."}` ✓
- Per-applicant verdict: 2 RECEIVED + 2 NOT RECEIVED = 4/4 CORRECT ✓
- DKIM=pass + SPF=pass + DMARC=pass headers captured ✓
- All 4 §7 evidence artefacts present in 15-02-EVIDENCE/

**15-02-EVIDENCE/ files:**
- `test_setup.json`
- `pg_net_response.json`
- `email_headers.txt`

**13-VERIFICATION.md:** per 15-02-SUMMARY §"Verification Notes for Plan 15-04", MAIL-01 #1+#2 + MAIL-02 #3+#4 verdicts already flipped from PARTIAL/DEFERRED to SATISFIED, and Overall Verdict flipped from PARTIAL to PASS.

**v2.0-MILESTONE-AUDIT.md:** per REQUIREMENTS.md change-log entries dated 2026-05-03 evening (line 214) + 2026-05-18 (line 218), MAIL-01/02 should no longer appear in any carryforward list. If they do, that's the drift to correct.

This plan reads all of the above; cross-checks consistency; applies minimal docs correction if drift exists, OR records audit-clean if everything is consistent.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Read REQUIREMENTS.md MAIL-01/02 entries + capture current state baseline</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md</files>
  <read_first>
    - .planning/REQUIREMENTS.md (lines 17-19 — Email Deliverability section; capture verbatim)
    - .planning/REQUIREMENTS.md Traceability table (lines ~164-197) — confirm MAIL-01/02 rows (current state: lines 169-170 "Partial-close (2026-05-01)")
    - .planning/REQUIREMENTS.md change-log entries at file tail (lines 206-219) — verify the 2026-05-03 evening entry exists and references 15-02-SUMMARY.md
  </read_first>
  <action>
    Create `.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` and capture the REQUIREMENTS.md current state for MAIL-01 + MAIL-02:

    ```markdown
    # Phase 22-05 — MAIL-01/02 Docs Audit

    **Date:** 2026-05-{DD}
    **Auditor:** {agent + operator}
    **Method:** Read-only consistency check across REQUIREMENTS.md ↔ 15-02-SUMMARY.md ↔ 15-02-EVIDENCE/ ↔ 13-VERIFICATION.md ↔ v2.0-MILESTONE-AUDIT.md
    **Scope:** NO E2E re-fire (per 22-RESEARCH.md §6 + §Anti-Patterns row 1).

    ---

    ## Step 1: REQUIREMENTS.md MAIL-01 — current state

    **Location:** `.planning/REQUIREMENTS.md` line 18

    **Checkbox state:** `[x]` / `[ ]` — {capture from file}
    **Closure date claimed:** {capture}
    **Evidence cited:** {capture — list of artefacts referenced}
    **§7-satisfied claim:** {YES / NO — does the entry have the §7-satisfied marker?}

    ---

    ## Step 2: REQUIREMENTS.md MAIL-02 — current state

    **Location:** `.planning/REQUIREMENTS.md` line 19

    **Checkbox state:** `[x]` / `[ ]` — {capture from file}
    **Closure date claimed:** {capture}
    **Evidence cited:** {capture — list of artefacts referenced}
    **§7-satisfied claim:** {YES / NO}

    ---

    ## Step 3: REQUIREMENTS.md Traceability table — MAIL-01/02 rows

    **MAIL-01 row (line 169):** {capture verbatim — Phase / Status}
    **MAIL-02 row (line 170):** {capture verbatim — Phase / Status}

    ---

    ## Step 4: REQUIREMENTS.md change-log — MAIL-01/02 entries

    **2026-05-01 Phase 15 closeout entry:** {capture key claim about MAIL-01/02 state}
    **2026-05-03 evening entry:** {capture key claim about MAIL-01/02 flip from [ ] to [x]}

    ---

    *(Step 5 + verdict in Task 4 below.)*
    ```

    Use the Read tool to read REQUIREMENTS.md sections explicitly (lines 17-22 for the email section; lines 168-172 for Traceability rows; lines 200-220 for change-log tail). Populate each `{capture}` placeholder with verbatim text or precise state observation.

    DO NOT write yet — just capture. The verdict comes in Task 4 after Steps 5+ are done.
  </action>
  <verify>
    <automated>test -f .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md && grep -cE "^## Step [1-4]" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect 4</automated>
  </verify>
  <acceptance_criteria>
    - `test -f .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` exits 0
    - `grep -cE "^## Step [1-4]" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns exactly 4
    - `grep -E "MAIL-01" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥3 matches (one per section that references MAIL-01)
    - `grep -E "MAIL-02" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥3 matches
    - No `{capture}` placeholders remain — all values are populated with verbatim text from REQUIREMENTS.md
  </acceptance_criteria>
  <done>
    22-05-AUDIT.md captures REQUIREMENTS.md current state for MAIL-01 + MAIL-02 (checkbox, closure date, evidence cited, §7-satisfied marker, Traceability row, change-log entries). Ready for cross-check Tasks 2+3.
  </done>
</task>

<task type="auto">
  <name>Task 2: Read 15-02-SUMMARY.md + 15-02-EVIDENCE/ artefacts; cross-check against REQUIREMENTS.md claims</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md</files>
  <read_first>
    - .planning/phases/15-email-pipeline-deploy/15-02-SUMMARY.md (full file — canonical evidence)
    - .planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/pg_net_response.json (artefact — confirm status_code 200, sent:2)
    - .planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/email_headers.txt (artefact — confirm DKIM=pass + d=topfarms.co.nz + Authentication-Results block)
    - .planning/phases/15-email-pipeline-deploy/15-02-EVIDENCE/test_setup.json (artefact — confirm 4 applicants with expected post-fire state matches the SUMMARY's per-applicant verdict)
  </read_first>
  <action>
    Append `## Step 5: 15-02 Evidence Cross-Check` section to `22-05-AUDIT.md`:

    ```markdown
    ## Step 5: 15-02 Evidence Cross-Check

    **15-02-SUMMARY.md key claims:**
    - Status: SATISFIED — all four §7 evidence artefacts captured cleanly
    - Date: 2026-05-03 evening
    - Trigger fire: {capture timestamp}
    - pg_net response: status_code {N}, content {paste}, error_msg {N or null}
    - Per-applicant verdict: {capture summary — X received, Y not received}
    - DKIM/SPF/DMARC: {capture verdict}

    **15-02-EVIDENCE/pg_net_response.json contents (key fields):**
    - status_code: {N}
    - content: {paste}
    - error_msg: {N or null}

    **15-02-EVIDENCE/email_headers.txt contents (key headers):**
    - SPF: {capture line}
    - DKIM: {capture line — should reference d=topfarms.co.nz}
    - DMARC: {capture line}
    - Delivery: {capture timing}
    - From/To: {capture}

    **15-02-EVIDENCE/test_setup.json contents:**
    - 4 test applicants with expected_post_fire_state: {capture summary}

    ### Cross-Reference Table

    | REQUIREMENTS.md claim (Task 1) | Source evidence (Step 5) | Match? |
    |---|---|---|
    | MAIL-01 cites `email_headers.txt` shows DKIM-Signature with `d=topfarms.co.nz` and Authentication-Results: dkim=pass | {what email_headers.txt actually shows} | YES / NO |
    | MAIL-02 cites `pg_net_response.json` status_code 200 with `{sent:2, failed:0, job_id:"b00254c7-..."}` | {what pg_net_response.json actually shows} | YES / NO |
    | MAIL-02 cites per-applicant 4/4 correct in 15-02-SUMMARY.md | {what 15-02-SUMMARY.md actually shows} | YES / NO |
    | MAIL-02 cites race-fix exercised: offered → hired during fire correctly excluded | {what 15-02-SUMMARY.md actually shows for application dd396022} | YES / NO |
    | MAIL-01/02 closure date is 2026-05-03 evening | 15-02-SUMMARY.md Date field | YES / NO |
    ```

    Use the Read tool to load each evidence file; verify the claims line-by-line. Be precise — paste actual values, not paraphrase.

    Special attention to the pg_net_response.json job_id prefix `b00254c7-` — if it matches exactly (REQUIREMENTS.md cite vs the JSON), that's a strong consistency signal. If the prefix differs, that's drift.
  </action>
  <verify>
    <automated>grep -cE "^## Step 5" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect 1; grep -E "Cross-Reference Table" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect ≥1 match</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "^## Step 5" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns 1
    - `grep -E "Cross-Reference Table" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥1 match
    - `grep -E "b00254c7" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥1 match (job_id consistency check)
    - `grep -E "topfarms.co.nz" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥1 match (DKIM domain consistency check)
    - Each row in the Cross-Reference Table has a YES or NO in the Match column (no blanks, no `{capture}` placeholders remaining)
  </acceptance_criteria>
  <done>
    22-05-AUDIT.md Step 5 records the cross-check between REQUIREMENTS.md claims (from Task 1) and the actual evidence artefacts. Cross-Reference Table shows YES/NO per claim. Ready for v2.0-MILESTONE-AUDIT.md check (Task 3) and verdict (Task 4).
  </done>
</task>

<task type="auto">
  <name>Task 3: Read v2.0-MILESTONE-AUDIT.md + 13-VERIFICATION.md; check for MAIL-01/02 carryforward drift</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md</files>
  <read_first>
    - .planning/v2.0-MILESTONE-AUDIT.md (full file or grep for MAIL-01 / MAIL-02 mentions)
    - .planning/phases/13-email-notifications/13-VERIFICATION.md (verify Overall Verdict flipped from PARTIAL to PASS per 15-02-SUMMARY §"Verification Notes for Plan 15-04")
  </read_first>
  <action>
    Append `## Step 6: v2.0-MILESTONE-AUDIT.md + 13-VERIFICATION.md Drift Check` section to `22-05-AUDIT.md`:

    ```markdown
    ## Step 6: v2.0-MILESTONE-AUDIT.md + 13-VERIFICATION.md Drift Check

    ### v2.0-MILESTONE-AUDIT.md

    **MAIL-01 mentions:** {capture every line that mentions MAIL-01 — verbatim, with line numbers}
    **MAIL-02 mentions:** {capture every line that mentions MAIL-02 — verbatim, with line numbers}

    **Carryforward status:**
    - Is MAIL-01 currently listed in any "Carryforward" / "Open Gaps" / "Pending" / "Deferred" section? {YES / NO}
    - Is MAIL-02 currently listed in any "Carryforward" / "Open Gaps" / "Pending" / "Deferred" section? {YES / NO}

    Per CLAUDE §7: if either MAIL-01 or MAIL-02 is in a carryforward list AND REQUIREMENTS.md shows it as `[x]` with §7-satisfied evidence, that is DRIFT requiring correction.

    ### 13-VERIFICATION.md

    **Overall Verdict:** {capture — should be PASS, not PARTIAL/DEFERRED}
    **MAIL-01 sub-verdicts (#1, #2):** {capture — should be SATISFIED}
    **MAIL-02 sub-verdicts (#3, #4):** {capture — should be SATISFIED}

    Per 15-02-SUMMARY.md §"Verification Notes for Plan 15-04" line 147-152: all 4 sub-criteria flipped to SATISFIED in the same atomic commit that captured the §7 evidence.
    ```

    Use grep + Read to capture every MAIL-01 / MAIL-02 mention in v2.0-MILESTONE-AUDIT.md verbatim. If the file is large, grep first for line numbers:
    ```bash
    grep -n "MAIL-0[12]" .planning/v2.0-MILESTONE-AUDIT.md
    ```
    Then Read the relevant line ranges with the offset+limit parameters.
  </action>
  <verify>
    <automated>grep -cE "^## Step 6" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect 1; grep -E "Carryforward status" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect ≥1 match</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "^## Step 6" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns 1
    - `grep -E "v2.0-MILESTONE-AUDIT" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥1 match
    - `grep -E "13-VERIFICATION" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥1 match
    - `grep -E "Overall Verdict" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns ≥1 match
    - No `{capture}` placeholders remain in Step 6 section
  </acceptance_criteria>
  <done>
    22-05-AUDIT.md Step 6 records all MAIL-01/02 mentions in v2.0-MILESTONE-AUDIT.md verbatim + the carryforward status check + the 13-VERIFICATION.md Overall Verdict + sub-verdicts. Ready for verdict (Task 4).
  </done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 4: Verdict + decision — audit clean OR drift correction required</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md</files>
  <read_first>
    - .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md (Steps 1-6 — synthesise across all)
    - CLAUDE.md §7 (partial-close discipline — only flip when ALL gaps closed with evidence)
    - .planning/phases/22-pre-launch-p0-closure/22-RESEARCH.md §Open Question 4 (recommendation: likely a single SUMMARY plan; quick audit; if anything is inconsistent fix in a 5-minute commit)
  </read_first>
  <decision>
    Based on the cross-references in Step 5 + Step 6, decide one of three outcomes:

    **Outcome A — Audit Clean:** ALL Cross-Reference Table rows in Step 5 show YES; v2.0-MILESTONE-AUDIT.md does NOT list MAIL-01/02 in any carryforward; 13-VERIFICATION.md shows PASS. No docs corrections required.

    **Outcome B — Minor Drift:** 1-2 cosmetic inconsistencies (e.g., a stale carryforward bullet in v2.0-MILESTONE-AUDIT.md that should be removed; a Traceability table row that still says "Partial-close (2026-05-01)" instead of "Complete 2026-05-03 evening"). Single-line edits to fix.

    **Outcome C — Material Drift:** REQUIREMENTS.md shows `[x]` but one or more §7 evidence artefacts is missing, contradicted by the source files, or mis-cited. Requires de-flip per CLAUDE §7 partial-close + carryforward note.

    Outcome A is the EXPECTED outcome per research §6 ("MAIL-01/02 already closed empirically; audit only").
  </decision>
  <context>
    Per the conversation context's `<critical_research_corrections>` (line 1): "MAIL-01/02 are ALREADY CLOSED with §7 evidence (REQUIREMENTS.md:18-19 + 15-02-SUMMARY.md). The ROADMAP says 'Option A — run deferred plan 15-02 E2E' but plan 15-02 was actually executed 2026-05-03. Plan 22-05 MUST reframe as a docs audit, NOT a re-fire."

    The dominant prior is Outcome A. Outcomes B or C are escape hatches if the audit surfaces something unexpected.
  </context>
  <options>
    <option id="option-a">
      <name>Outcome A — Audit Clean</name>
      <pros>Matches expected state per research §6; no docs changes needed; fastest close</pros>
      <cons>Must verify ALL Step 5 Cross-Reference rows show YES + Step 6 confirms no carryforward; cannot assert clean without that empirical check</cons>
    </option>
    <option id="option-b">
      <name>Outcome B — Minor Drift (cosmetic)</name>
      <pros>Surfaces stale carryforward bullets / partial-close holdovers; fixes them with 1-2 line Edits; ~5-minute work</pros>
      <cons>Requires identifying which file + line; potential for over-correction if the carryforward is intentional (e.g., a historical note rather than an open gap)</cons>
    </option>
    <option id="option-c">
      <name>Outcome C — Material Drift (de-flip)</name>
      <pros>Honours CLAUDE §7 if MAIL-01 or MAIL-02 is genuinely §7-unsatisfied</pros>
      <cons>Would contradict 15-02-SUMMARY.md's explicit §7-evidence-checklist of 4-satisfied; would require deep re-investigation; expected to be 0% probability per research</cons>
    </option>
  </options>
  <resume-signal>
    Operator (or executor agent on its own analysis) selects: `option-a` / `option-b` / `option-c`.

    On `option-a`: proceed to Task 5 with a 3-line audit-clean confirmation; no other files modified.
    On `option-b`: proceed to Task 5 with the specific cosmetic edit(s) identified — listed verbatim with file path + line number + before/after.
    On `option-c`: STOP. Material drift requires re-investigation. Surface to operator with the specific contradiction. Do NOT make code/docs changes without explicit operator authorization.
  </resume-signal>
  <action>
    Read Steps 1-6 of `.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md`. Synthesise: count the YES vs NO matches in the Step 5 Cross-Reference Table; check Step 6 carryforward status; check Step 6 13-VERIFICATION.md Overall Verdict.

    Determine which Outcome (A / B / C) applies given the empirical Step 1-6 state. Per the `<decision>` rubric:
    - All YES + no carryforward + 13-VERIFICATION PASS → Outcome A
    - Some YES with cosmetic auxiliary drift (stale Traceability row OR stale milestone-audit carryforward bullet) → Outcome B
    - Material contradiction (e.g., pg_net_response.json shows non-200 OR job_id differs from REQUIREMENTS.md cite) → Outcome C

    Surface the chosen outcome to the operator using the `<options>` block. The executor agent MAY decide unilaterally on Outcome A if the cross-reference is unambiguously clean (Outcome A is the expected prior per research §6); MUST consult operator for Outcome B (which cosmetic edit to apply) and Outcome C (de-flip is high-impact).

    Capture the chosen Outcome (A / B / C) and the operator's resume-signal in `22-05-AUDIT.md` immediately above the Step 7 block that Task 5 will populate. Pseudo-section heading: `### Task 4 Decision — Outcome {A/B/C}`.
  </action>
  <verify>
    <automated>grep -E "Task 4 Decision — Outcome (A|B|C)" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect ≥1 match (decision captured)</automated>
  </verify>
  <done>
    Outcome chosen (A / B / C) and recorded in 22-05-AUDIT.md with brief justification synthesising Steps 1-6. On A: proceed to Task 5 with audit-clean template. On B: proceed to Task 5 with specific cosmetic edits identified. On C: STOP, surface to operator before any further file modification.
  </done>
</task>

<task type="auto">
  <name>Task 5: Write verdict + apply minimal docs correction (if any)</name>
  <files>.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md, possibly .planning/REQUIREMENTS.md or .planning/v2.0-MILESTONE-AUDIT.md (only if Outcome B/C)</files>
  <read_first>
    - .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md (Task 4 verdict)
    - Task 4 decision signal (option-a / option-b / option-c)
    - CLAUDE.md §7 (partial-close discipline — applies to Outcome B/C only)
  </read_first>
  <action>
    Append `## Step 7: Verdict + Action` section to `22-05-AUDIT.md` based on Task 4 outcome:

    **If Outcome A (Audit Clean):**

    ```markdown
    ## Step 7: Verdict + Action

    **Verdict:** AUDIT CLEAN ✓

    Cross-Reference Table (Step 5) shows YES across all rows. v2.0-MILESTONE-AUDIT.md (Step 6) does not list MAIL-01 or MAIL-02 in any carryforward / open-gap section. 13-VERIFICATION.md Overall Verdict is PASS with all 4 sub-criteria SATISFIED.

    **Action:** None. REQUIREMENTS.md MAIL-01 + MAIL-02 are §7-satisfied and consistent with canonical evidence (15-02-SUMMARY.md + 15-02-EVIDENCE/).

    **Confirmation:**
    - REQUIREMENTS.md:18-19 `[x]` state empirically backed ✓
    - No `[x]` lies remain ✓
    - v2.0-MILESTONE-AUDIT.md consistent (no stale MAIL-01/02 carryforward) ✓

    Plan 22-05 closes with NO additional file modifications beyond 22-05-AUDIT.md itself.
    ```

    No edits to other files. Commit just 22-05-AUDIT.md.

    **If Outcome B (Minor Drift):**

    List the specific corrections to apply. Examples (do NOT apply unless they match actual drift found):

    *Example correction 1 (Traceability row stale):*
    ```markdown
    ### Drift correction 1: REQUIREMENTS.md Traceability row for MAIL-01

    BEFORE (line 169): `| MAIL-01 | Phase 15 | Partial-close (2026-05-01) — code deployed; awaiting RESEND_API_KEY + plan 15-02 E2E before full satisfaction |`
    AFTER:             `| MAIL-01 | Phase 15 | Complete (2026-05-03 evening — see 15-02-SUMMARY.md, all 4 §7 evidence artefacts captured) |`
    ```

    *Example correction 2 (v2.0-MILESTONE-AUDIT.md stale carryforward):*
    ```markdown
    ### Drift correction 2: v2.0-MILESTONE-AUDIT.md remove stale MAIL-01/02 carryforward bullet

    Line {N}: remove the bullet "- MAIL-01 + MAIL-02 carryforward — RESEND_API_KEY + plan 15-02 E2E required" (now stale; both satisfied 2026-05-03 evening).
    ```

    Apply each correction via the Edit tool. Surround each Edit with comments documenting which Cross-Reference Table row drove the correction.

    Append a Step 7 verdict block to 22-05-AUDIT.md:
    ```markdown
    ## Step 7: Verdict + Action

    **Verdict:** MINOR DRIFT — {N} cosmetic corrections applied.

    **Corrections applied:**
    1. {file path}:{line} — {summary of change}
    2. ...

    **Outcome:** REQUIREMENTS.md MAIL-01 + MAIL-02 `[x]` state preserved (canonical evidence remains valid); stale auxiliary entries brought into consistency.
    ```

    **If Outcome C (Material Drift):**

    Do NOT apply any code/docs corrections. Surface to operator with specific contradiction details:

    ```markdown
    ## Step 7: Verdict + Action

    **Verdict:** MATERIAL DRIFT — STOP, operator action required.

    **Specific contradiction:**
    {paste verbatim what was found that contradicts the §7 evidence}

    **Recommended path:** Per CLAUDE §7 partial-close discipline, MAIL-{01 or 02} may need de-flipping. Do NOT apply without operator confirmation; this would mean 15-02-SUMMARY.md's explicit §7 evidence checklist was wrong, which requires investigation beyond a 5-minute docs audit.

    **Action:** None taken. Surface to operator; recommend `/gsd:plan-phase 22 --gaps` to author a follow-up phase if material drift is real.
    ```
  </action>
  <verify>
    <automated>grep -cE "^## Step 7" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect 1; grep -E "Verdict:" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md — expect ≥1 match (AUDIT CLEAN / MINOR DRIFT / MATERIAL DRIFT)</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "^## Step 7" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns 1
    - `grep -E "Verdict: (AUDIT CLEAN|MINOR DRIFT|MATERIAL DRIFT)" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` returns 1 match
    - On Outcome A: no other files modified beyond 22-05-AUDIT.md (verify via `git status` — only the audit file should show changes)
    - On Outcome B: each correction's file is listed verbatim in the Step 7 block with line number AND before/after text
    - On Outcome C: NO file modifications applied; the audit document records the contradiction for operator review
    - NO email re-fire was performed (per research §6 / §Anti-Patterns row 1) — verify by grep that no `MarkFilledModal` open, no Studio SQL `UPDATE applications`/`UPDATE jobs` ran, no `pg_net.http_post` called from this session
  </acceptance_criteria>
  <done>
    Step 7 records verdict (CLEAN / MINOR DRIFT / MATERIAL DRIFT). If MINOR DRIFT: corrections applied via Edit tool. If MATERIAL DRIFT: surfaced to operator without modification. No E2E re-fire; no DB writes; no code changes.
  </done>
</task>

</tasks>

<verification>
After all 5 tasks complete:

```bash
# Audit document exists with 7 sections
test -f .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md
grep -cE "^## Step [1-7]" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md   # expect 7

# Verdict captured
grep -E "Verdict: (AUDIT CLEAN|MINOR DRIFT|MATERIAL DRIFT)" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md

# Cross-reference completed
grep -E "Cross-Reference Table" .planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md

# NO E2E re-fire executed
git log --oneline -n 5 origin/main..HEAD 2>/dev/null | grep -iE "MarkFilledModal|notify-job-filled|pg_net|update.*jobs|update.*applications"
# Expected: empty (no commits touching trigger / modal / DB writes)

# Modified files are scoped to docs only
git status --short | grep -vE "^\?\?" | grep -v "22-05-AUDIT.md"
# Expected: empty (Outcome A) OR small docs-only edits (Outcome B); NEVER schema/code/migration files
```

**Atomic commit per CLAUDE §4:** This plan produces ONE commit.

Commit message format:
- **Outcome A:** `docs(22-05): MAIL-01/02 docs audit clean — REQUIREMENTS.md consistent with 15-02 §7 evidence`
- **Outcome B:** `docs(22-05): MAIL-01/02 docs audit + {N} cosmetic drift corrections`
- **Outcome C:** `docs(22-05): MAIL-01/02 docs audit surfaced material drift — pending operator review`

Includes:
- `.planning/phases/22-pre-launch-p0-closure/22-05-AUDIT.md` (always)
- Outcome-B-only: minor edits to REQUIREMENTS.md and/or v2.0-MILESTONE-AUDIT.md

**Anti-pattern guard:** verify no Studio SQL was executed against jobs/applications/employer_profiles tables during this plan. The plan should be 100% read-only on the DB side (MCP read-only mode preferred per CLAUDE §2).
</verification>

<success_criteria>
- 22-05-AUDIT.md exists with 7 sections (Steps 1-7)
- Cross-Reference Table in Step 5 fully populated (no `{capture}` placeholders, every row has YES/NO match)
- Step 6 captures v2.0-MILESTONE-AUDIT.md + 13-VERIFICATION.md state verbatim
- Step 7 records explicit verdict (AUDIT CLEAN / MINOR DRIFT / MATERIAL DRIFT)
- If CLEAN: only 22-05-AUDIT.md committed; REQUIREMENTS.md unchanged
- If MINOR DRIFT: ≤3 single-line edits to REQUIREMENTS.md / v2.0-MILESTONE-AUDIT.md
- If MATERIAL DRIFT: NO file modifications; surfaced to operator
- NO E2E re-fire performed (per research §6 / §Anti-Patterns)
- NO DB writes performed
- Single atomic commit
</success_criteria>

<output>
After completion, create `.planning/phases/22-pre-launch-p0-closure/22-05-mail-docs-audit-SUMMARY.md` documenting:
- Audit verdict (CLEAN / MINOR DRIFT / MATERIAL DRIFT)
- Files cross-referenced (REQUIREMENTS.md / 15-02-SUMMARY.md / 15-02-EVIDENCE/ / 13-VERIFICATION.md / v2.0-MILESTONE-AUDIT.md)
- Corrections applied (if any) — file paths + before/after
- Atomic commit SHA
- Confirmation: NO E2E re-fire occurred; this was a read-only docs audit per research §6
- Phase 22 close-out posture: after this plan + 22-04 both complete, Phase 22 ready for `/gsd:verify-work`
</output>
