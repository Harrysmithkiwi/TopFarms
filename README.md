# TopFarms

**NZ's agricultural job marketplace.** Farm employers post jobs; farm workers build free
profiles; Claude-powered match scoring connects them on the things that actually matter
in ag — shed type, accommodation, roster, visa status, couples. Workers never pay.
Live at [topfarms.co.nz](https://topfarms.co.nz).

## Stack

React 19 · TypeScript · Vite 6 · Tailwind v4 · Supabase (Postgres/Auth/Storage/Edge
Functions) · Claude API · Stripe · Resend · Vercel.

## Orientation (read in this order)

1. **`docs/_canonical/TopFarms_Master_Compendium.md`** — the map. Explains the authority
   hierarchy: live sources beat canonical docs beat `_archive/`.
2. **`docs/_canonical/`** — PRD, Brand & Design (v2: Inter, single green `#16A34A`),
   Data Architecture, Platform Audit.
3. **`.planning/`** — the live operating ledgers: `NORTH-STAR.md` (verified
   placements/month; liquidity gates), `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`,
   GTM corpus in `.planning/gtm/`.
4. **`docs/commercial/`** — pricing model, market sizing, expansion model.
5. **`supabase/migrations/`** — schema ground truth (001→latest; see `NAMING.md`).
6. **`CLAUDE.md`** — house rules for agentic work in this repo. Non-negotiable.

## Development

```bash
npm install
npm run dev          # Vite dev server
npx tsc -b           # THE typecheck gate (never tsc --noEmit)
npx vitest run       # tests
npm run build        # production build (CI enforces <500kB gzip bundle budget)
```

CI: `.github/workflows/ci.yml` (typecheck → lint → tests → audit → build → E2E).
Deploys: Vercel auto-deploys `main`; Edge Functions via `supabase-deploy.yml`.

## Current state

Product v2.1 (ag-broad taxonomy), launched 2026-07-02, pre-liquidity. Stage-2
remediation in progress — see `REMEDIATION-LOG.md` and `FOUNDER-ACTIONS.md` at the root.
