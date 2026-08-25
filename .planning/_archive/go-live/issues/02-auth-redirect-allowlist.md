# Fix the auth redirect allowlist (operator dashboard toggle)

Type: task
Status: open

## Question

Measured 2026-08-07: `/auth/v1/verify` ignores every `redirect_to` — including legitimate
ones — and falls back to the Site URL, which is the **apex** while prod serves **www**.
Open redirects are correctly refused (`evil.example.com` probe). Consequence: password-reset
and OAuth `redirectTo` flows burn their tokens on the host mismatch
(`project_supabase_redirect_www`). Signup confirmation itself was verified working 2026-08-07.

**Operator action — Supabase dashboard → Authentication → URL Configuration:**

- Site URL: `https://www.topfarms.co.nz`
- Redirect allowlist, all four:
  - `https://www.topfarms.co.nz`
  - `https://www.topfarms.co.nz/**`
  - `https://topfarms.co.nz`
  - `https://topfarms.co.nz/**`

No API is exposed for this; it is genuinely a dashboard toggle (the launch gate's "Supabase
toggle" item).

**Engineering follow-up once flipped:** re-run the reset-password flow end to end with the
`+ci-seeker` account (request → inbox link → new password → sign-in), and the OAuth
`redirectTo` path. Resolved when both land on `www` with working sessions.
