# Restart prompt — landing page / marketing uplift, written 2026-08-20

**Paste this whole file as the opening prompt of a fresh session.** It supersedes the
2026-08-19 pre-launch prompt, whose steps 2 and 3 are now done and whose step 1 is carried
forward below.

Read first, in this order: this file, `docs/design/v12-DIRECTIVE.md`, `CLAUDE.md` §3 §4 §9 §10.

---

## The one-line state

**A v12 landing page is built, committed and NOT PUSHED (`8d3a3dd`). The operator has seen it
and rejected the artwork.** The layout, type, routes and copy are right. The illustration is
wrong, and the fix is already sitting in the repo.

---

## What went wrong, so it is not repeated

The operator supplied two things: a reference PNG (a **painted** pastoral scene) and concept
HTML. **The HTML specified real photographs** — six Unsplash URLs across the card bleeds, the
banner, both split cards and the closing band.

The previous session overrode that and authored **flat vector SVG** instead, reasoning that
photographs would clash with a painted comp. The result matches neither input. The operator's
words: *"looks nothing like what i asked for"*, and they were right — the reference has brush
texture, shading, real animals and weathered timber; the build has flat colour bands, blob
clouds and stick figures.

**The lesson is not "SVG was a bad medium".** It is that the brief named an imagery treatment,
the treatment was substituted without the operator agreeing to the substitution, and a long
justification in a code comment is not agreement. When a brief pins imagery, either use it or
get the change agreed BEFORE building on top of it.

---

## ⚠ IMAGE QUALITY IS STILL THE OPEN PROBLEM (operator, 2026-08-20)

**The artwork is not good enough yet, and the operator has said so twice.** Do not treat the
landing page as finished.

Two rounds have happened. Round one substituted flat vector SVG for the brief's photographs
and was rejected outright. Round two cropped the concept painting itself into nine text-free
regions, which the operator accepted in principle, then flagged two quality defects — a fog
band through the hero middle and muddy people when zoomed. Both were diagnosed and fixed
(`2a4eb4c`): the hero band was three stacked causes (radial-gradient hills with 50-60%
transparent falloffs, crop masks fading from 55%, a blurred cloud on the horizon line), and
the mud was a 2.2x bilinear upscale, now re-cut from the original PNG at 2x Lanczos+unsharp
with display maths capped at ~1.05x.

**The remaining ceiling is the source resolution and it cannot be engineered away.** Every
crop comes from a 1024px-wide concept PNG. What ships now is as good as those pixels get —
well-groomed interpolation, not real detail. **Ask the operator to re-export the concept at
2048px+ from wherever it was generated**; re-cutting then takes minutes and the art gains
actual detail. Failing that, commission or source genuinely higher-resolution painted assets.
Do not spend another round sharpening 1024px pixels.

Deliverable: `docs/design/topfarms-landing-uplift.html` (tracked, self-contained).
Artifact: https://claude.ai/code/artifact/e830efb8-0ff3-49aa-a8e1-a702a0488508

## The fix — the assets are already in the repo

`docs/design/design-reference/Farm photos/` holds real New Zealand farm photography that the
operator curated on 2026-08-03. It is better than the Unsplash placeholders their own HTML
pointed at, it is theirs, and it is what **PRODUCT.md Design Principle 2 originally asked
for**: *"Warmth and Kiwi-ness come from real farm photos."*

| File | Pixels | What it is | Suggested slot |
|---|---|---|---|
| `NZ Dairy Farmer .jpg` | 800×500 | Taranaki behind a jersey herd, farmer with a fence reel. The strongest image here. | hero, or the "Looking for people?" card |
| `NZ Sheep farming 3.avif` | 1900×1267 | widest asset available | hero (only one big enough for full-bleed) |
| `NZ Sheep farming image .jpg` | 960×720 | merino mob, dog and shepherd, shelter belt | banner "Good people make good farms" |
| `NZ Sheep farming 2.avif` | 1140×1710 | portrait | split card |
| `Dairy farm image 1.jpg` | 612×408 | | card bleed |
| `dairy farm image 2.jpg` | 612×408 | | card bleed |

**Resolution is the constraint.** Only `NZ Sheep farming 3.avif` (1900px) is wide enough for a
full-bleed hero at 1440+. Everything else is ≤960px and will only survive in a card, a band or
a half-width split. Ask the operator for higher-resolution originals before assuming a photo
can carry the hero.

### Do this

1. Self-host: copy into `public/img/`, resize with `sips`, generate `.webp`. **Never** an
   external host — the Unsplash URLs in the concept HTML are a third-party dependency and are
   not licensed to TopFarms.
2. Swap the photo slots in `src/components/landing/v12/V12Sections.tsx`: `PastoralVignette`
   in the two audience cards and both split cards, `PastoralBand` in the banner and the close.
3. **Decide the hero with the operator, do not choose alone.** Three real options: (a) the
   1900px sheep photo full-bleed with a scrim; (b) keep an illustrated hero but rebuild it at
   far higher fidelity — gradients, texture, shading — rather than flat bands; (c) commission
   the painted scene the reference actually shows. The operator has asked for full-concept
   fidelity twice, so (c) is what they literally want and (a) is what ships this week.
4. Every photo needs a real `alt` unless it is purely decorative beside its own text.
5. `PastoralScene.tsx` and its 15 findings-free icons can stay for now — `LandingIcons.tsx` is
   good work and independent of this. Delete `PastoralScene.tsx` only once nothing imports it.

---

## What IS right and must not be rebuilt

Verified in a browser at 1440 and 390 on 2026-08-19/20, all green:

- Section order, copy and layout match the comp.
- One `h1`, correct heading nesting, every `<svg>` `aria-hidden`, sector list is a real list.
- **Every CTA resolves to a real route**, and "Hire staff" was clicked through to
  `/signup?role=employer` landing with **Employer `pressed`**.
- Cormorant Garamond confirmed loaded; v12 tokens resolving; no horizontal overflow at 390px;
  zero console errors.
- Tap targets fixed to ≥44px after verification caught seven at 23px.
- Contrast measured on real hexes; `fern-500` is banned as text on dark (3.54:1) and
  `fern-lite` exists for that job.
- `tests/landing-page.test.tsx` — 13 cases pinning the v12 contract.
- Gates: `tsc -b` 0 · `npm run lint` 0 errors / 52 warnings · vitest 1013 / 123 files ·
  `npm run build` 0.

`docs/design/v12-DIRECTIVE.md` supersedes v11 **partially and deliberately** — §0 is a
rule-by-rule table, because CLAUDE.md §10 binds the gated portals to several v11 numbers.
`PRODUCT.md`'s anti-references were amended with the reversal recorded. `CLAUDE.md` §10 now
points at v12. None of that needs redoing.

---

## STILL THE BLOCKER — do not lose this behind the design work

**Nobody can complete signup on TopFarms.** Verification emails deliver a corrupted link that
fails 100% of the time.

- Supabase generates token `46b4eaf…`; the email delivers `Fb4eaf…`; the link returns
  `{"code":400,"error_code":"validation_failed"}`.
- Mechanism: the message is quoted-printable **decoded twice**. `token=` is sent as
  `token=3D46b4…`; the second decode reads `=46` as the byte `0x46` = `F`. Reproduces the
  received string character for character, including the length.
- **Deterministic, not intermittent**: a hex token always starts with two hex digits, so
  `=` + 2 hex is always a valid escape. `type=signup` survives because `=si` is not hex.
- Hits signup confirmation, password reset, magic link and email change alike.
- The template is FINE — it uses `{{ .ConfirmationURL }}`. The fault is in the mail path
  (Supabase → Resend → inbox), not in Supabase Auth.

**Recommended fix, independent of any provider:** route through TopFarms with the token in the
PATH, not a query string — `https://www.topfarms.co.nz/auth/confirm/{{ .TokenHash }}` — and a
small route calls `verifyOtp`. No `=` before the token means nothing to double-decode.

**Operator diagnostic, 60 seconds:** open the email in Gmail → ⋮ → Show original, and report
the `Content-Transfer-Encoding` header and whether the raw body shows `token=3D46b4…`. That
pins the fault on Resend rather than Supabase.

Also: the auth emails are unbranded Supabase defaults — *"Follow this link to confirm your
user"* — which reads like phishing to a first employer.

---

## Everything else outstanding

| | |
|---|---|
| **Resend bounce triage** | 11 of 36 sends bounced (~30%). Carried from the last prompt, still not done. Operator-owned, ~2 min in the Resend dashboard. No outreach has ever been sent, so these cannot be harvested addresses — it gates ramp speed, not whether the batch can be prepared. |
| **`ForEmployers` + `Pricing` still v13** | Click "See pricing" from the new home page and you land in the previous design. Needs porting to v12. |
| **Gmail outreach tracking** | Connector is authenticated as `harry.symmans.smith@gmail.com`; operator will send from `admin.topfarms@gmail.com`. Reconnect and the routine needs **no code** — `admin_outreach_mark_sent` and `admin_outreach_mark_responded` already exist. |
| **~11 orphaned v13 landing components** | `WorkerSplitSection`, `CardRowSection`, `StepsSection` etc. Nothing imports them since `Home.tsx` changed; 15 detector findings. Checked before deleting — a few names still appear in `ActiveFilterPills`, `JobStep8Success` and two tests, so unpick before removing. |
| **Lead staleness** | Badge shipped. 24 expired + 50 stale of 125 pending; one lead has a 2024 close date two years before its capture, which is a bad parse nothing sanity-checks. |

---

## Standing constraints

- **`8d3a3dd` is unpushed. Pushing deploys Vercel prod AND the Edge Functions — ask first.**
- Gate on the project's own commands. `npm run lint` (`eslint . --max-warnings 54`), never
  `npx eslint src tests` — the explicit-path form reported 0 errors on a tree CI failed on
  2026-08-19.
- `impeccable` is the design skill for any frontend work (CLAUDE.md §10). It is not optional.
- Prod holds **0 employers, 0 jobs, 1 seeker**. The operator's requirement is that the first
  real employer is the first row in the table; a walkthrough account was created and purged on
  2026-08-19 with their explicit approval.
- Migrations through the claude.ai Supabase connector, SQL saved to `supabase/migrations/`, a
  `LEDGER.md` row, verified via `pg_catalog` — never the banner.
