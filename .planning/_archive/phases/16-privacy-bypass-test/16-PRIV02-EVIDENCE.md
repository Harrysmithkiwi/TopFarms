---
phase: 16-privacy-bypass-test
test: PRIV-02
type: closure-evidence
date: 2026-05-04
verdict: PASS — primary expected response observed; 5-layer privacy gate held under direct API attack
closes:
  - "REQUIREMENTS.md BFIX-02 (was [ ] pending PRIV-02 empirical test, now [x])"
  - "REQUIREMENTS.md Deferred Validations PRIV-02 (was deferred 2026-04-29, now closed)"
  - "v2.0-MILESTONE-AUDIT.md gaps.requirements BFIX-02 (was partial, now satisfied)"
  - "v2.0-MILESTONE-AUDIT.md public-launch blocker #4 (PRIV-02 empirical test)"
unblocks:
  - "v2.0 public launch — PRIV-02 was the last public-launch privacy blocker"
references:
  - "src/contexts/AuthContext.tsx, supabase/functions/get-applicant-document-url/index.ts"
  - "supabase/migrations/019_seeker_documents.sql, 020_seeker_documents_employer_policy.sql"
  - "Phase 14-03 commit e8f0882 (BFIX-02 5-layer gate code)"
---

# PRIV-02 — Empirical Privacy Bypass Test (Closure Evidence)

**Status:** PASS — 5-layer privacy gate held under direct API attack from legitimate-employer JWT.
**Date:** 2026-05-04 morning
**Test URL:** `https://top-farms.vercel.app` (production) → `https://inlagtgpynemhipnqvty.supabase.co/functions/v1/get-applicant-document-url`

---

## Threat model

An authenticated employer with a legitimate relationship to an applicant (the applicant applied to the employer's job) attempts to bypass the UI and directly fetch the applicant's identity document via the Edge Function API. Identity documents (passport, drivers license, etc.) must NOT be accessible to employers per BFIX-02 / BFIX-03 design — even when the employer-applicant relationship is otherwise valid.

The 5-layer privacy gate (BFIX-02 / BFIX-03 design) is expected to block this attempt:

1. **RLS layer** — `seeker_documents` employer SELECT policy (`migration 020_seeker_documents_employer_policy.sql`) filters to `document_type IN ('cv', 'certificate', 'reference')`. Identity excluded.
2. **Edge Function whitelist** — `EMPLOYER_VISIBLE_DOCUMENT_TYPES` constant explicitly lists allowed types; identity NOT in the list.
3. **Listing-query filter** — `ApplicantDocuments.tsx` filters identity out of the document list before rendering.
4. **Function-level identity exclusion** — Edge Function explicitly checks `document.document_type === 'identity'` and returns 403 before minting any signed URL.
5. **Defence-in-depth** — service-role-keyed admin client used in the function bypasses RLS but the explicit identity check at layer 4 still blocks.

PRIV-02 directly attacks the API, bypassing layers 1–3 (which are UI/listing-level), to test whether layers 4–5 (function-internal) hold.

---

## Test rig (verified pre-fire)

| Element | Value | Verified |
|---|---|---|
| Authenticated caller (employer) | `harry.symmans.smith@gmail.com` (`auth.users.id = 5634f2fb-...`) | role=employer per user_roles |
| Owns | `employer_profiles.id = 60b9728d-...` ("Test Farm (UAT)") | |
| Owning job | `jobs.id = b00254c7-...` ("UAT Farm Assistant — Applied", status=filled) | |
| Application on that job | `applications.id = 2a91e3db-a02a-4f44-96e7-2be9897bcadf` | seeker_id e94e8930 (harry.moonshot) |
| Target document | `seeker_documents.id = 31ed32e7-5581-4f26-930a-8051f40049a3` | document_type=`identity`, filename=`harry-passport.pdf` |
| Edge Function status | `get-applicant-document-url` v5 ACTIVE, `verify_jwt: true`, last updated 2026-04-30 22:43:45 UTC (Phase 15-01 deploy; unchanged since BFIX-02 commit `e8f0882`) | confirmed via `mcp__supabase__list_edge_functions` |

---

## Test fire

**Snippet executed in employer-authenticated browser console:**

```js
const tokenJson = localStorage.getItem('sb-inlagtgpynemhipnqvty-auth-token')
const sess = JSON.parse(tokenJson)
await fetch('https://inlagtgpynemhipnqvty.supabase.co/functions/v1/get-applicant-document-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess.access_token}` },
  body: JSON.stringify({
    application_id: '2a91e3db-a02a-4f44-96e7-2be9897bcadf',
    document_id: '31ed32e7-5581-4f26-930a-8051f40049a3'
  })
}).then(async r => `${r.status} ${JSON.stringify(await r.json())}`)
```

**Console response (verbatim):**

```
'403 {"error":"Identity documents are not accessible to employers"}'
```

---

## Verdict — PASS (primary expected response)

| Criterion | Expected | Observed | Verdict |
|---|---|---|---|
| HTTP status | 403 (or any 4xx without signed_url) | **403** | ✅ |
| Response body | `{"error":"Identity documents are not accessible to employers"}` | exact match | ✅ |
| Hard-fail signal | NO `signed_url` or `url` field | not present | ✅ |
| Gate layer that blocked | layer 4 (Edge Function explicit identity check) per error message | matches design | ✅ |

**Interpretation:** The Edge Function received the request, the gateway validated the employer's JWT (verify_jwt=true), the function looked up the document, found `document_type='identity'`, returned 403 with the canonical error message. No signed URL was minted. The employer cannot access the applicant's passport via direct API attack despite having a valid auth session and a legitimate employer-applicant relationship.

---

## §7 evidence checklist

| Evidence | Status |
|---|---|
| Test executed against deployed function (not stub/local) | ✅ production URL `inlagtgpynemhipnqvty.supabase.co` |
| Caller authenticated as legitimate employer (not anon, not seeker) | ✅ employer JWT, role=employer per user_roles |
| Target document is identity-type (gate's primary protection class) | ✅ document_type=`identity` per seeker_documents row |
| Application-employer relationship is legitimate (not cross-employer) | ✅ Test Farm (UAT) owns Job 1, harry.moonshot applied to Job 1 |
| No signed URL minted in response | ✅ response body has no `signed_url`/`url` field |
| Function deploy state matches BFIX-02 commit (no recent re-deploy) | ✅ updated_at unchanged since 2026-04-30 |

All six criteria satisfied. No inferred state. Real production fire, real authenticated JWT, real identity document, gate held empirically.

---

## What this closes

- **REQUIREMENTS.md BFIX-02:** flipped `[ ]` → `[x]`. The Phase 14-03 BFIX-02 implementation has been carrying a deferred-empirical-test note since 2026-04-29; this evidence retires that note.
- **REQUIREMENTS.md PRIV-02 (Deferred Validations):** flipped from "deferred — must execute against deployed function before public launch" to "closed".
- **v2.0-MILESTONE-AUDIT.md:** BFIX-02 status partial → satisfied; public-launch blocker #4 (PRIV-02) closed.

**Public-launch implication:** PRIV-02 was the last public-launch privacy blocker per `v2.0-MILESTONE-AUDIT.md` "Public-Launch Blockers". With this closure, the privacy posture for v2.0 is empirically verified.

---

## References

- BFIX-02 5-layer gate design: `.planning/phases/14-bug-fixes/14-03-PLAN.md`, commit `e8f0882`
- BFIX-02 verification report: `.planning/phases/14-bug-fixes/14-VERIFICATION.md` sub-phase 14-03 (was PARTIAL — PRIV-02 deferred)
- Edge Function source: `supabase/functions/get-applicant-document-url/index.ts`
- RLS policy: `supabase/migrations/020_seeker_documents_employer_policy.sql`
- Test snippet originally drafted: `.planning/REQUIREMENTS.md` §"Deferred Validations" PRIV-02 (2026-04-29)
- Pre-fire deploy verification: `mcp__supabase__list_edge_functions` output captured 2026-05-04 morning
