# TopFarms GTM — Tooling Decision (Asana + Linear, native MCP; Composio dropped)

*2026-07-02 · Decided. Research sources: `.planning/` prior research pass (Asana MCP V2, Linear MCP, Composio Tool Router, all verified against live docs mid-2026).*

## The decision in one line

**Asana for GTM/ops, Linear for engineering, both via their own native MCP servers into Claude Code. Supabase stays natively connected. Composio is NOT adopted.**

## Why not Composio (the one place the operator hypothesis was overruled)

Composio's Tool Router solves *context bloat from large/unknown tool catalogues* via dynamic tool-loading. This operator has a **small, fixed, five-app set** (Asana, Linear, Gmail, Stripe, Supabase). The benefit is marginal here, and two facts kill it:

1. **Claude Code already lazy-loads native MCP tool schemas** (deferred behind ToolSearch), so the bloat Composio fixes is already handled natively for a small set.
2. **Blast radius.** Composio brokers and stores OAuth tokens for *every* app at once. Routing **Stripe (revenue) + Gmail (inbox)** through a third-party token broker concentrates risk for a solo founder. Native keeps revenue + inbox auth first-party.

Plus: extra latency hop, per-call metering with overage, and SDK session-URL machinery. Native is free and static.

**When to revisit:** only if the tool count balloons past ~20 apps (ad platforms, multiple CRMs, enrichment) — which the scraping stance says it won't.

## The native stack

| App | Role | MCP endpoint | Auth | Setup friction |
|---|---|---|---|---|
| **Supabase** | System of record + harvest/draft engine | already connected (`.mcp.json`) | project token | done |
| **Linear** | Engineering board only | `https://mcp.linear.app/mcp` | OAuth (browser) or `Bearer` | low |
| **Asana** | GTM/ops board (funnel, content, partnerships) | `https://mcp.asana.com/v2/mcp` | OAuth 2.0, **pre-registered app** (no PAT, no auto-registration) | medium (one-time) |
| **Stripe** | Revenue signals (activation/retention proof) | official Stripe MCP — **confirm exact command before adding** | key/OAuth | low |
| **Gmail** | Email follow-ups | *lowest priority* — native Google Workspace MCP, evaluate later | OAuth | later |

Notes that matter:
- **Asana V1 `/sse` died 11 May 2026** — V2 streamable-HTTP is the only server; it dropped dynamic client registration, so you must pre-register an MCP app for `client_id`/`secret` (callback `http://localhost:8080/callback`). Free on all tiers (~150 req/min).
- **Gmail is the only place a narrow Composio-for-Gmail-only fallback would be defensible** if the native Workspace MCP proves painful. Never route Stripe/Supabase through it.
- **Do not invent the Stripe/Gmail `claude mcp add` commands** — confirm current syntax at add-time (see `first-week-checklist.md`).

## Exact `claude mcp add` commands (verified)

```bash
# Linear — trivial, browser OAuth on first call
claude mcp add --transport http linear-server https://mcp.linear.app/mcp

# Asana — needs a pre-registered app first (see checklist step for the console steps)
claude mcp add --transport http \
  --client-id <ASANA_CLIENT_ID> \
  --client-secret \
  --callback-port 8080 \
  asana https://mcp.asana.com/v2/mcp
# then: claude mcp login asana   (opens browser consent)
```

`<ASANA_CLIENT_ID>` comes from Asana developer console → create MCP app. The secret is entered when prompted and stored in the OS keychain, not `.mcp.json`. **Placeholders only — do not commit real IDs/keys.**
