# TopFarms Privacy Impact Assessment (DPIA)

> **STATUS: A-READY DRAFT — pending legal review (FOUNDER-ACTIONS FA-02/FA-11). Not yet legal advice or a published policy.**

**Scope:** the two highest-risk personal-information flows on the TopFarms platform.
**Assessed against:** NZ Privacy Act 2020 (13 Information Privacy Principles), notifiable privacy breach regime.
**Assessor:** Harry Smith (founder). **Date:** {{DPIA_DATE}}.

---

## Flow A — categorical visa status sent to a US-hosted LLM

**Description.** When TopFarms generates a candidate summary or match explanation, the seeker's profile data — including their categorical visa/residency status (`seeker_profiles.visa_status`: nz_citizen / permanent_resident / working_holiday / student / needs_sponsorship) — is included in a prompt to the Claude API (`generate-candidate-summary` Edge Function). The prompt is processed by Anthropic in the United States.

**Why the data is needed.** Work eligibility is a core matching signal; a summary that omits it would mislead employers about whether a match is realistic.

**Data minimisation in place.** Visa status is a category only — no visa numbers, case numbers, expiry dates, or immigration documents are stored or sent. Identity documents and contact details are never included in any AI prompt.

### Risk table — Flow A

| # | Risk | Likelihood | Impact | Mitigation (actual controls) | Residual |
|---|---|---|---|---|---|
| A1 | Cross-border disclosure to US provider without adequate protection (IPP 12) | Certain (by design) | Medium | Disclosed plainly in Privacy Policy s3/s6; data limited to a category label; Anthropic API terms include no-training-on-inputs defaults for commercial API use ([PENDING] DPA confirmation — FA-02) | Low-Medium |
| A2 | Visa category is sensitive in effect (can proxy for national origin / immigration vulnerability) and is exposed in a breach at Anthropic | Low | High | Category-only granularity; no identifiers beyond profile content in prompt; provider security posture; breach response runbook covers third-party breach | Low |
| A3 | Model output mischaracterises visa status and causes unfair screening | Medium | Medium | Output is a summary aid, not a decision; employers see the underlying categorical value; copy frames matching, not ranking | Low-Medium |
| A4 | Scope creep — future prompts include more PII than intended | Medium | Medium | Prompt construction is centralised in one Edge Function; this DPIA to be re-run when prompt fields change ([PENDING] change-control note) | Low |

## Flow B — identity-document verification

**Description.** Seekers upload identity documents (plus CVs, certificates, references) to a private Supabase Storage bucket to support verification. Documents are reviewed by TopFarms admins only.

### Controls in place (verified in codebase)

1. **Never shown to employers — three independent layers:** RLS policy (migration 020) excludes identity documents from employer-accessible rows; the `get-applicant-document-url` Edge Function enforces a server-side whitelist of employer-visible document types; the UI filters identity documents from employer views.
2. **Admin access only via 15-minute signed URLs** — no permanent public links exist.
3. **Never sent to any AI model** — identity documents are excluded from all AI processing.
4. **Private bucket** — no public read access.
5. **Admin actions recorded** in `admin_audit_log`.

### Risk table — Flow B

| # | Risk | Likelihood | Impact | Mitigation (actual controls) | Residual |
|---|---|---|---|---|---|
| B1 | Identity document exposed to an employer | Low | High | Three-layer exclusion (RLS + Edge Function whitelist + UI filter); a single-layer failure does not expose the document | Low |
| B2 | Signed URL leaked or shared | Low | High | 15-minute expiry; admin-only issuance; audit trail of issuance | Low |
| B3 | Admin account compromise | Low | High | Admin role gated server-side by SECURITY DEFINER RPCs; audit log gives detection evidence; breach runbook applies | Low-Medium |
| B4 | Over-retention of identity documents after they are no longer needed | Medium | Medium | [PENDING] — scheduled deletion (90-day post-account-deletion window) scoped but not implemented; manual deletion on request today | Medium |

## Residual-risk statement

With the controls above, the residual risk of both flows is assessed as **low to medium and acceptable for launch**, on three conditions:

1. The Privacy Policy's AI disclosure (Flow A) stays accurate to what the prompt actually contains — any prompt-field change re-triggers this assessment.
2. Sub-processor data protection terms are confirmed (FA-02), in particular Anthropic's.
3. The retention gap (B4) is tracked and closed; until then, deletion requests are honoured manually via hello@topfarms.co.nz.

The highest residual item is B4 (retention). No risk was assessed as requiring the flow to be redesigned or stopped.

## Sign-off (FA-11)

| Role | Name | Signature | Date |
|---|---|---|---|
| Founder / privacy officer | Harry Smith | ____________ | ______ |
| External legal reviewer | ____________ | ____________ | ______ |

Review cadence: re-assess on any change to AI prompt contents, document access paths, or sub-processor list — and at least annually.
