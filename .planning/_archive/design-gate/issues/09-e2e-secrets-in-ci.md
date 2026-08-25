# Put the a11y gate's credentials in CI

Type: task
Status: resolved

## Question

Graduated from [08](08-is-wcag-part-of-the-gate.md), which ruled that closing the coverage hole
is in scope. Mostly mechanical, but it needs two operator decisions before the mechanical part
can run — which is why it is a ticket and not a footnote.

**The state.** `.github/workflows/ci.yml` and `e2e-preview.yml` both already wire six `E2E_*`
secrets into the Playwright step. `gh secret list` returns only `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD`. So every role-gated spec — a11y, admin-gate, error-states,
saved-search, seeker-browse-jobs — calls `test.skip` in CI, and the suite has been reporting
green over work it never exercised. The admin a11y sweep added in `08` inherits this: it passes
locally and will skip in CI until this is closed.

**Decision 1 — which accounts.** Three UAT accounts are flagged for purging on the launch
readiness list. Enshrining those in CI and then deleting them gives a suite that skips again
without anyone noticing. Are the CI accounts the existing UAT ones, or purpose-made permanent
test accounts that survive the purge?

**Decision 2 — the employer pair does not exist.** `.env` holds `E2E_ADMIN_*` and
`E2E_SEEKER_*` only. There is no employer credential anywhere, which is why the employer
applicant-dashboard a11y test has never run in any environment, local included. An employer
test account has to be created before four of the six secrets become six.

**Then the mechanical part** (agent can drive, once the two decisions land):

```
gh secret set E2E_ADMIN_EMAIL     --body '<...>'
gh secret set E2E_ADMIN_PASSWORD  --body '<...>'
gh secret set E2E_SEEKER_EMAIL    --body '<...>'
gh secret set E2E_SEEKER_PASSWORD --body '<...>'
gh secret set E2E_EMPLOYER_EMAIL    --body '<...>'   # account must exist first
gh secret set E2E_EMPLOYER_PASSWORD --body '<...>'
```

`CLAUDE.md` §6 applies: confirm `gh repo set-default --view` first. Without a default set,
`gh secret set` without `--repo` lands nowhere silently — that exact failure has already cost
this project three rotation cycles.

**Done when** a CI run shows the role-gated a11y tests executing rather than skipping. A green
run that still skips them has not closed this ticket — that is the false green the whole ticket
exists to remove.

## Investigation 2026-08-07 — not executed, and the reason got sharper

Worked this ticket, gathered the facts, and **stopped before setting any secret.** What
changed is not caution about the mechanics — it is what the credentials turned out to be.

### The facts

| | |
|---|---|
| `gh repo set-default --view` | `Harrysmithkiwi/TopFarms` — **set**, so §6's silent-no-op trap is not present |
| Secrets on the repo | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`. **No `E2E_*`** |
| Credentials in `.env` | `E2E_ADMIN_*` and `E2E_SEEKER_*` only |
| `E2E_ADMIN_EMAIL` | `admin@topfarms.co.nz` — **a live production admin account** |
| `E2E_SEEKER_EMAIL` | `harry.symmans.smith@gmail.com` — **the founder's personal address** |
| `E2E_EMPLOYER_*` | does not exist anywhere |

### Why I did not set them

**Neither credential should go into GitHub Actions as it stands.**

- The seeker credential is **the operator's own personal email** — the same address that
  receives the lead-harvest notifications. It is not a disposable UAT account. Its password in
  repo secrets is reachable by any workflow, any collaborator with write access, and any
  compromised third-party action in the graph.
- The admin credential grants **production admin** — every `admin_*` RPC, every seeker and
  employer record. A CI secret is a much softer boundary than an operator's password manager,
  and `_admin_gate()` cannot help: the credential *is* an admin.

Setting four secrets would have closed the coverage hole and opened a worse one. The original
framing of this ticket — "mostly mechanical, needs two decisions" — was wrong, because it
assumed the credentials were throwaway. They are not.

### Recommendation

1. **Create three purpose-made CI accounts** — seeker, employer, admin — that exist only for
   this, with recognisable addresses (`ci-seeker@…`) so they are never mistaken for real users
   and survive the UAT purge. The employer one needs **at least one active listing**, or the
   employer a11y spec skips on `employer has no active listings` even with credentials present.
2. **Decide the admin one deliberately.** Options, in order of preference: point CI at a
   non-production Supabase project; or a dedicated CI admin whose role can be revoked in one
   statement and is rotated on a schedule; or accept that admin-gated specs stay local-only and
   never claim CI covers them.
3. **Then set the secrets** (default repo is set, so plain `gh secret set` is safe), and in the
   *same commit* add the guard below.

### The guard, deliberately not built yet

The reason this ticket exists is that green CI has been reporting success over a suite that
skipped its role-gated half. Setting secrets fixes that today; it does not stop it recurring
the day an account is purged or a password rotates.

The fix is to make a missing credential **fail** in CI rather than skip. It is not built here
because building it now would turn CI red immediately — there are no secrets to satisfy it —
and a guard that has to be disabled to be merged is scaffolding, not a gate. **Whoever sets the
secrets adds the guard in the same commit**, so the two land together and CI is honest from the
first run.

**Done when** a CI run shows the role-gated specs *executing*. A green run that still skips them
has not closed this ticket — that is the exact false green it exists to remove.

## Progress 2026-08-07 — accounts created, blocked on two clicks

Operator approved creating purpose-made CI accounts. Steps 1 and 2 attempted.

**Done — two accounts exist in production**, created through the real signup flow at
`https://www.topfarms.co.nz/signup?role=<role>` (the `?role=` param preselects, which is why
this automated cleanly):

| Role | Address |
|---|---|
| seeker | `harry.symmans.smith+ci-seeker@gmail.com` |
| employer | `harry.symmans.smith+ci-employer@gmail.com` |

Plus-addressed onto the operator's mailbox so confirmations are receivable, with freshly
generated 24-character passwords **unrelated to any personal login** — which was the whole
point. Credentials are in the session scratchpad at `ci-creds.json`, mode 600, never in the
repo.

**Blocked — neither account is email-confirmed, and I cannot confirm them from here.**

Supabase requires confirmation (`SignUp.tsx:133` routes to `/auth/verify`). Both emails
arrived from `noreply@mail.app.supabase.io`. **The Gmail connector corrupts the token when it
renders the body**: the href comes through as `?token<garbage>c9fca8…` — the `=` is destroyed
and takes a character with it. Same damage in `htmlBody` and via `get_thread FULL_CONTENT`.

Verified this is corruption, not expiry, by reading the redirect `Location` instead of
following it:

```
location: https://topfarms.co.nz#error=access_denied&error_code=otp_expired
          &error_description=Email+link+is+invalid+or+has+expired
```

on tokens two minutes old. Recovering the missing character means brute-forcing an auth token
against a live endpoint — not doing that.

### What closes this — about ten seconds of operator time

**Open the two "Confirm Your Signup" emails in the inbox and click "Confirm your mail" in
each.** They are unread, from `noreply@mail.app.supabase.io`, timestamped 2026-08-07 01:29 UTC.
Nothing sensitive needs to be shared, and the links in the inbox carry the intact tokens.

Then, in one commit:
1. `gh secret set E2E_SEEKER_EMAIL / E2E_SEEKER_PASSWORD / E2E_EMPLOYER_EMAIL / E2E_EMPLOYER_PASSWORD`
   — default repo is `Harrysmithkiwi/TopFarms`, already set, so §6's silent-no-op trap is absent.
2. Add the skip-guard, so a missing credential **fails** CI instead of skipping.

**Still not solved: admin.** A `ci-admin` account is still production admin. That decision
stands as written above — preferably a non-production Supabase project.

**Step 3 not started.** The employer account has no listing, so the employer a11y spec will skip
on `employer has no active listings` even once credentials work. It needs the onboarding wizard
plus a job posted — worth doing as its own pass, not bolted onto this.

## 2026-08-07, second attempt — secrets NOT set, and a possible production bug

Operator clicked both confirmation links. **Both accounts are still unconfirmed.** Secrets were
not set: credentials that cannot authenticate would only make CI fail more slowly.

**The accounts are fine.** Supabase distinguishes the cases, and I checked the contrast rather
than assuming:

```
+ci-seeker@   -> "Email not confirmed"        (user exists, password correct)
+ci-employer@ -> "Email not confirmed"
nobody+nope@  -> "Invalid login credentials"  (control: no such user)
```

So `email_confirmed_at` is null on both and nothing else is wrong.

**My `www` hypothesis was wrong and I killed it.** Probing `/auth/v1/verify` with three
different `redirect_to` values:

| Sent | Landed |
|---|---|
| `https://topfarms.co.nz` | `https://topfarms.co.nz` |
| `https://www.topfarms.co.nz` | `https://topfarms.co.nz` |
| `https://evil.example.com` | `https://topfarms.co.nz` |

Open-redirect protection is working. But **`redirect_to` is ignored entirely** — everything
falls back to the Site URL, which means the allowlist still lacks `www`, exactly as
`project_supabase_redirect_www` recorded. That is a real launch item, though it does not
explain the failure: the redirect happens *after* verification.

### The part that matters more than this ticket

If clicking a valid, freshly-issued confirmation link does not set `email_confirmed_at`, then
**email confirmation may be broken for every real signup**, not just these two. Prod is served
at `www` while the Site URL is the apex, and the domain went live 2026-07-02 — after the last
time anyone confirmed a new account by hand. Nobody would necessarily have noticed.

**Worth answering before launch:** has any real user successfully confirmed a signup since
2026-07-02? If not, this is a P0 that has nothing to do with the design gate.

### To unblock this ticket without another email round trip

Confirm both users directly: **Supabase dashboard → Authentication → Users → the two `+ci-`
addresses → confirm email.** No tokens, no allowlist, no rate limit. Resend is currently
rate-limited (`email rate limit exceeded`), so retrying by email is not available for now
anyway.

Once they can sign in, the four secrets and the skip-guard land in one commit as planned.

## Answer — resolved 2026-08-07

**Secrets set, guard shipped, ticket closed. And the P0 I raised was wrong — retracted below.**

### The actual bug was in my tooling, not the product

The operator asked why I was handing them a dashboard task when I have a Supabase MCP write
path. Fair, and the answer was that I had not reached for it. Reading `auth.users` directly
settled everything in one query:

- Both users existed, `email_confirmed_at` null, **`confirmation_token` still populated** — so
  no valid verify had ever reached the endpoint.
- The real tokens are **56 characters**. The Gmail connector gave me 54.

That is a **quoted-printable double-decode** in the mail rendering: `=54` became `T`, `=89`
became a replacement character. Each token lost its first two hex digits, which is why every
link I built returned `otp_expired` on a token minutes old.

Replaying the genuine `/auth/v1/verify` flow with the tokens read from the database confirmed
**both accounts first try**, returning valid sessions with `email_verified: true` and the right
role in `user_metadata`. No direct write to `auth.users` was needed.

### Retraction

I raised "email confirmation may be broken for every real signup" as a possible P0 and put it
in `NOW.md` above the launch gate. **It is false. Signup confirmation works.** The evidence
that looked alarming — two accounts unconfirmed after clicking — was entirely explained by the
corrupted link. Withdrawn from `NOW.md`, with the episode recorded rather than deleted.

Still true and unfixed, but far smaller than it looked: `/auth/v1/verify` ignores `redirect_to`
and falls back to the apex Site URL while prod serves `www`. Open redirects are correctly
refused (`evil.example.com` does not pass). That is `project_supabase_redirect_www`, a launch
item, not a blocker.

### Delivered

**Four secrets set** on `Harrysmithkiwi/TopFarms` — `E2E_SEEKER_EMAIL/_PASSWORD`,
`E2E_EMPLOYER_EMAIL/_PASSWORD`. Both accounts verified to sign in and resolve the correct role
before anything was set.

**The guard, in the same commit as promised.** `E2E_REQUIRED_ROLES` declares what a run
promises to cover; a listed role with no credential **throws in `auth.setup.ts`** rather than
skipping. Both workflows set `seeker,employer`. Unset locally, so local skipping is unchanged.

Proven in all three states rather than assumed:

| | Result |
|---|---|
| required roles present | setup passes, exit 0 |
| required role, credentials removed | **exit 1**, naming the missing role |
| variable unset (local) | skips as before, exit 0 |

**`admin` is deliberately absent from the CI list.** Its credential is a live production admin,
and that decision stands open — preferably a non-production Supabase project. The guard makes
that gap explicit instead of silent, which was the point.

### Left for a separate pass

The employer account has no listing, so the employer a11y spec will still skip on
`employer has no active listings`. Closing that needs the onboarding wizard plus a posted job —
its own piece of work, and now the only thing standing between CI and full role coverage.

Gates: `tsc -b` 0, vitest 640, lint 0 errors / 54, design-gate 17.
