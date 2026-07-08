# TopFarms Privacy Breach Response Runbook

> **STATUS: A-READY DRAFT — pending legal review (FOUNDER-ACTIONS FA-02/FA-11). Not yet legal advice or a published policy.**

One page. Follow top to bottom. Owner: Harry Smith (founder), hello@topfarms.co.nz.

---

## 1. Detect

Signals: user report to hello@topfarms.co.nz, unexpected rows/queries in Supabase logs, Supabase security advisories (`get_advisors`), anomalous entries in **`admin_audit_log`** (the primary evidence source for who accessed what, when), Stripe/Resend/Vercel incident notices, or a sub-processor breach notification.

Immediately: note the time, what was observed, and preserve evidence. Do not delete logs.

## 2. Contain

- Revoke or rotate the compromised credential (Supabase service keys, admin passwords, API keys).
- Suspend the affected account(s) (`isActive=false` gates dashboards).
- If storage is implicated: confirm bucket privacy, invalidate outstanding signed URLs by rotating keys if needed (signed URLs self-expire in 15 minutes).
- If an Edge Function or RLS policy is the hole: disable the function or tighten the policy first, root-cause second.
- Supabase support path: dashboard for project `inlagtgpynemhipnqvty` → Support, or supabase.com/support (security incidents get priority handling).

## 3. Assess — the serious-harm test (Privacy Act 2020, s112)

Within 72 hours of detection, decide: **is the breach likely to cause serious harm to anyone?** Weigh:

- Sensitivity: identity documents and visa status are the high-harm categories on this platform; contact details and profile data are lower.
- Who got it (unknown attacker vs one wrong employer), whether it was encrypted or access-limited, and whether it was recovered before viewing.
- Consequences: identity theft, immigration-status exposure, discrimination, physical safety.

Record the reasoning either way. If unsure, treat it as notifiable.

## 4. Notify

**If serious harm is likely (notifiable breach):**

- **OPC:** notify as soon as practicable via the NotifyUs tool at privacy.org.nz (Office of the Privacy Commissioner, 0800 803 909). Delay is itself an offence-risk; do not wait for a perfect picture.
- **Affected individuals:** notify directly by email as soon as practicable — what happened, what data, what we did, what they should do (e.g. watch for phishing, replace an exposed identity document), and our contact (hello@topfarms.co.nz). If direct contact is not practicable, public notice on topfarms.co.nz.
- **Sub-processor originated?** Get their incident reference and timeline; we still own our users' notification.

**If not notifiable:** still record it (step 5) and fix the cause.

## 5. Record

Keep a breach register entry in `docs/legal/` (append to `BREACH-REGISTER.md`, create on first incident): date detected, description, data and people affected, serious-harm assessment and reasoning, containment actions with timestamps, notifications sent (OPC reference number, user email copy), root cause, and the fix that prevents recurrence. Evidence sources: `admin_audit_log`, Supabase logs, this register.

## Contacts

| Who | How |
|---|---|
| Internal owner | Harry Smith — hello@topfarms.co.nz |
| OPC | privacy.org.nz (NotifyUs) — 0800 803 909 |
| Supabase | Dashboard support, project `inlagtgpynemhipnqvty` |
| Stripe / Resend / Vercel / Anthropic | Provider dashboards + status pages |
