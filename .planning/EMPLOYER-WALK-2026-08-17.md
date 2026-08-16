# Employer flow — live prod walk, 2026-08-17

Driven end to end on `www.topfarms.co.nz` against deploy `dpl_GBFnotFh6ZJ7WyabENwHXS9wrQc8`
(created 07:55:40, three minutes after `be29abd`, aliased to the apex + www).

Test employer: `admin.topfarms+e2e-emp-0817b@gmail.com` → `Kowhai Downs Station`, Sheep & Beef,
Hawke's Bay. A first account (`+e2e-emp-0817@gmail.com`) was abandoned after the VerifyEmail
finding, to re-test on genuinely clean storage. **Both accounts and their prod rows still exist
— deletion is yours to call.**

Every claim below carries a command, a `file:line`, or a DB read. Nothing is inferred from a
passing test.

---

## F-11 scorecard — 3 of 5 rungs work

| rung | asked | result |
|---|---|---|
| email → `verified`, no admin | ✅ | **PASS** |
| phone OTP verifies | ❌ | **BLOCKED — phone auth disabled project-wide** |
| failed write no longer toasts success | ✅ | **PASS** (verified on NZBN) |
| farm photo self-verifies | ✅ | **PASS** |
| NZBN → `pending` + admin queue | ⚠️ | **DB shape correct, but the UI cannot write it** |
| NZBN resubmit does not 42501 | ❌ | **FAIL — and it fails on the FIRST submit too** |

### PASS — email reaches `verified` with no admin action

The rung that was unclimbable. Real row, not UI optimism:

```
method=email  status=verified  verified_by=null
verified_at = 2026-08-16 22:13:05.327152+00
```

`verified_at` matches `auth.users.email_confirmed_at` to the microsecond —
`employer_sync_self_verifications()` mirrored it. No admin, no 42501.

### PASS — farm photo self-verifies

`employer_record_farm_photo(p_url)` → **204**, row lands `status=verified`, `verified_by=null`.
The `SECURITY DEFINER` path bypasses the column grants, which is exactly why it works.

### PASS — a failed write no longer toasts success

The NZBN denial surfaced as inline red text (`permission denied for table
employer_verifications`), the card stayed `Not started`, and **no success toast fired**. The
guard-before-toast fix is doing its job. Not re-testable on phone (below).

---

## BLOCKER 1 — NZBN and Documents cannot be written at all (F-11 reopened)

The operator predicted a resubmit 42501. It is worse: **it fails on first submit**, and it takes
`document` down with it.

Isolated against live prod with the employer's own session:

| form | result |
|---|---|
| plain `INSERT` (`employer_id, method, nzbn_number`) | **201 Created** |
| `upsert` `on_conflict=employer_id,method`, same payload | **403 / 42501** |
| `upsert` for `method='document'` | **403 / 42501** |
| `employer_record_farm_photo` RPC | **204** |

The payload is innocent — the **upsert form** is the defect. PostgREST emits
`ON CONFLICT … DO UPDATE SET` including the conflict-key columns, and Postgres checks UPDATE
privilege at **plan time**, whether or not a conflict occurs. Live ACLs (`pg_attribute.attacl`):

| column | `authenticated` |
|---|---|
| `employer_id` | `a` — INSERT only |
| `method` | `a` — INSERT only |
| `nzbn_number`, `document_url` | `aw` |
| `status`, `verified_at` | *none* |

Table-level is `rdDxtm` — no INSERT/UPDATE — so those column grants are the whole story.

**The F-11 commit's premise is wrong.** It calls `DocumentUpload.tsx:64` "the writer that was
already correct" and copies its payload shape into `NzbnVerification`. Document has the same
`.upsert()` and has never worked either — the *payload* was right, the *form* was not.

Affected: `NzbnVerification.tsx:56`, `DocumentUpload.tsx:60`. Both identity methods.
Consequence: `hasIdentity` in `useVerifications.ts` can never become true from the UI, so
`fully_verified` is unreachable even ignoring phone.

**Fix shape** — smallest change that matches what F-11 already established: move both writers
onto a `SECURITY DEFINER` RPC deriving the employer from `auth.uid()`, exactly like
`employer_record_farm_photo`. One function covers both, with `status` omitted so the DEFAULT
`'pending'` stands and the admin queue still decides. Do **not** grant UPDATE on
`employer_id`/`method` — that widens the ACL to buy back a shape you do not need.

## BLOCKER 2 — no employer can ever pass "Basic Verified"

`GET /auth/v1/settings` on prod:

```json
"phone": false,  "phone_autoconfirm": false,  "sms_provider": "twilio"
```

Phone auth is **disabled project-wide**, so `supabase.auth.updateUser({ phone })` fails for
everyone and the phone rung cannot be climbed. `useVerifications.ts:28-32` requires `hasPhone`
for **both** `verified` and `fully_verified`:

```ts
if (hasEmail && hasPhone && hasIdentity && hasPhoto) return 'fully_verified'
if (hasEmail && hasPhone) return 'verified'
if (hasEmail) return 'basic'
```

So every employer is permanently capped at **Basic Verified**, while the page's own "How trust
levels work" panel advertises two tiers nobody can reach. This is config, not code — but it
means F-11 must not be flipped closed (CLAUDE.md §7).

I did not send an SMS: any number I invent reaches a real person. This rung needs your phone.

## BLOCKER 3 — F-12b: a confirmed employer is stranded on "Check your inbox"

**Reproduced twice, the second time on wiped `localStorage`/`sessionStorage`.**

After following the confirmation link: `email_confirmed_at` set, session issued, localStorage
holds a valid token for the new employer — and the page still renders **"Check your inbox" +
"Resend verification email"**. A dead end at the highest-traffic step of signup, with outreach
to real strangers starting today.

`VerifyEmail.tsx:27` subscribes to `onAuthStateChange`, but `supabase-js` consumes the URL hash
at module init and fires `SIGNED_IN` before the component mounts. The hash is already stripped
to bare `#`, so `hasHashToken` (`:17`) is false too. The handler never runs — which means
**F-12's `?? 'seeker'` on `:38` is never even reached**. Fix F-12b in the same pass as F-12:
the redirect must not depend on catching a live event. Read the existing session on mount
(`getSession()`) as well as subscribing.

## Dead "Continue with Facebook" button on `/signup` and `/login`

Rendered full-width in Facebook brand blue, second position, above the email form.

```
GET /auth/v1/authorize?provider=facebook → 400
{"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
GET /auth/v1/authorize?provider=google   → 302 → accounts.google.com  (control)
```

`SignUp.tsx:201`, `Login.tsx:111`. Either enable the provider or remove the button — today,
before strangers hit it.

---

## Lower severity, filed not fixed

- **Dairy vocabulary leaks onto every sector.** On a Sheep & Beef profile: "Calving system"
  (`Step3Culture.tsx:140` — the component never receives `farm_type`, so it renders
  unconditionally), "DairyNZ Pathway" as a career-development chip, and a Breed placeholder
  reading "e.g. Friesian, Jersey, Crossbred". Same family as the shed-type wart, but all three
  are *optional*, so none blocks submission.
- **Raw enums reach the UI.** `cottage` on the step-7 review, `sheep_beef` as a chip on the
  completion profile card. Label maps exist and are bypassed — the same class as the
  `nz_citizen` → "Nz Citizen" fix on 2026-08-16.
- **Unlabelled inputs on step 2.** Farm name, herd size and breed expose their placeholder as
  the accessible name — a screen reader announces "e.g. Green Valley Farm", not "Farm name".
  The Region combobox is correct, so this is per-input, not systemic.
- **Signup consent checkbox announces as "I agree to the and"** — the Terms and Privacy link
  text is outside the accessible name.
- **`[useAuth] loadRole timeout after 3s, keeping previous role`** fires 2–3× per gated page
  load. `user_roles` itself answers in 777ms when queried directly with the same session, so
  the timeout is not the query being slow.
- **`Step5Verification.tsx:95` hardcodes `isVerified`** on the Email row. It happens to be true
  (you cannot reach step 5 unconfirmed), but it reads neither `auth.users` nor
  `employer_verifications` — it is not evidence of anything.

## Confirmed healthy

- All 8 onboarding steps completed; every field round-tripped correctly to
  `employer_profiles` (verified column-by-column).
- **`shed_type: []`** on a non-dairy submit — the 2026-08-14 sector-gating fix holds in prod,
  and no shed-type field was shown.
- Pricing v3 renders correctly at step 6: free listings, banded $200/$400/$800.
- Conditional reveals (accommodation type/extras, vehicle types) behave correctly.
- The verification page's **read** path is fine — Email `Verified`, NZBN `Pending Review`,
  Farm Photos `Verified` all render from real rows. Only the write path is broken.
- The `pending` NZBN sorts to the top of `admin_list_verification_queue` with farm name and
  region attached (verified by running the function's own query body).

## Test data now in prod

Two employer accounts, one complete `employer_profiles` row, and three
`employer_verifications` rows including a fabricated NZBN `9429041234567` and two
`https://example.test/…` URLs. The NZBN row exists **only because I inserted it with a plain
INSERT probe** — the UI could not create it. Purge when you want; I have not deleted anything.

## Stale note corrected

`vercel login` was not needed. `vercel whoami` → `harrysymmanssmith-1646` and `vercel ls`
both work; the CLI's auth is intact. The Supabase claude.ai connector was not retested.
