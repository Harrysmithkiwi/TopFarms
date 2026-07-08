# Continuity & key-person note

> **STATUS: A-READY — pending FA-06 (nominate second trusted admin + share escrow).**
> Created 2026-07-08 (Stage-2 M0). The company is currently one person. This note makes
> "founder unavailable for a week/month" survivable. It is deliberately short.

## What exists only in Harry's head/hands today

- **Credentials:** Supabase (`inlagtgpynemhipnqvty`), Stripe, Vercel, Cloudflare (DNS —
  proxy must stay OFF on Vercel CNAMEs), Resend, GitHub (`Harrysmithkiwi/TopFarms`),
  Anthropic/Firecrawl/Apify keys (Supabase secrets), the admin login, Google Workspace,
  and the **Facebook account that admins NZ Dairy Jobs** (single most concentrated asset).
- **Manual loops:** lead approval (`admin_lead_approve`), outreach send, doc verification,
  placement-fee acknowledgement disputes, Studio SQL applies (pooler-auth workaround).

## The three continuity actions (FA-06)

1. **Credential escrow:** all of the above into a password manager with emergency access
   for one named person (family/lawyer/advisor). Include the 2FA recovery codes.
2. **Second admin:** create a second `role='admin'` user (out-of-band per `018`), held
   dormant. Document its existence here with a date.
3. **One-page "if I'm out" runbook** (below) shared with the named person.

## If the founder is unavailable — minimum viable operations

| System | Do | Don't |
|---|---|---|
| Platform | Nothing required — Supabase/Vercel are managed; site runs itself | Don't deploy, don't run migrations |
| Payments | Stripe invoices auto-chase (Net-14) | Don't refund without checking `placement_fees` state |
| Leads/outreach | Pause — the human gate simply stops; nothing auto-sends | Don't approve leads or DM from the FB account |
| Doc verification | Queue waits; applicants see "pending" | Don't approve identity docs |
| Incidents | See `docs/legal/BREACH-RESPONSE.md`; Supabase support + OPC notification path | Don't rotate credentials reactively (CLAUDE.md §6) |

## Backup / DR posture

Managed-platform DR (Supabase PITR-class backups, Vercel redeploy-from-git). No restore
drill has ever been run — **first drill logged as part of FA-06 acceptance**: restore a
staging copy from backup, confirm schema + row counts, note RPO/RTO observed.
