# Design system audit — codebase vs `Brand_and_Design.md` v2.1

> **Phase 1 output.** Produced 2026-08-25 against `main` @ `e682225`.
> **Status: all nine §9 decisions RULED, §11 executed (row 0).** The ruling and the
> execution order live in `.planning/DESIGN-SYNC-PROMPT.md`; §9 below records what was
> decided. Counts re-verified at the start of row 0 and unchanged except where noted.
> Spec: `docs/_canonical/Brand_and_Design.md` (v2.1) · Tokens: `docs/_canonical/topfarms-tokens.css`
> (both moved out of `docs/design/` in row 0)
> Live source under audit: `src/index.css` (260 lines) + 269 `.tsx` files under `src/`.
>
> Every count below came from a grep or a computed ratio, both reproducible from the
> commands in §10. Nothing here is estimated.

---

## 0. The headline — the fork is in the token file, not in hex literals

The prompt's framing is that the product forked into three visual systems and the fix is a
hex hunt. Half of that is right. The three systems are real. But **`src/` contains only 32
hex-literal matches in total, and 22 of them are comments, HTML entities or the Google
logo.** There are exactly **6 hex literals that need a decision**, and 4 of those are the
sanctioned Stripe block.

The fork lives one level up: `src/index.css` defines **three complete token worlds** in one
`@theme` block, and components pick a world by class name.

| World | Tokens | Consumed by | Status under v2.1 |
|---|---|---|---|
| **v2 portal** | `bg` `surface` `surface-2` `border` `text` `text-muted` `brand` `brand-hover` `brand-900` `brand-50`, semantics | the whole app, admin, onboarding, job wizard | **survives** — becomes the only world, with 4 value changes |
| **v13** | `cream` `cream-2` `card` `ink` `ink-60` `ink-40` `green` `green-2` `green-3` `lime` `lime-2` `ochre` `ochre-ink` `line` `danger-ink` `font-archivo` `font-bricolage` | 16 live files + 11 dead ones | **retired in full** — this is the sand/Archivo/lime fork |
| **v14 marketing** | `fern-900…fern-50` `bark` `sage` `paper` `linen` `rule` `font-serif` | Home, ForEmployers, Pricing, legal, PublicShell | **folds into v2** — same hues, different names |

So the migration is a **token-and-class-name migration**, not a hex sweep. That changes the
sizing of every PR below, and it is why §8 reports far fewer files than "24 nodes on
/signup" implies — 24 rendered nodes come from **one** `className` on `AuthLayout.tsx:17`.

**Second headline: 11 of the 26 files carrying retired tokens are orphaned dead code.**
The entire pre-v12 landing page still sits in `src/components/landing/` and nothing imports
it. That is 95 retired-token uses that are a `git rm`, not a migration. Verified in §7.

---

## 1. Every hardcoded hex literal in `src/`

`grep -rEn "#[0-9a-fA-F]{3,8}\b"` over `*.{ts,tsx,css,js,jsx}`, excluding `src/index.css`:
**32 matches across 17 files.** Classified:

### 1a. Real, needs action (6)

| File:line | Value | Maps to | Note |
|---|---|---|---|
| `src/root.tsx:107` | `#0f3d22` | `#14532D` (`--color-brand-900`) | `<meta name="theme-color">`. Retired value — `#0F3D22` is on the delete-on-sight list. Cannot be a CSS var (it is a meta tag), so it stays a literal and needs an allowlist entry. |
| `src/components/ui/JobCard.tsx:25` | `text-[#2563eb]` + `bg-[rgba(59,130,246,0.10)]` | `Tag variant="blue"` (`bg-info-bg text-info-text-on-bg`) | Status pill re-implemented inline. `#2563eb` is not in any token set. |
| `src/pages/jobs/JobDetail.tsx:535` | `bg-[rgba(180,83,9,0.10)] text-[#b45309]` | `Tag variant="warn"` | Same inline re-implementation. |
| `src/pages/jobs/JobDetail.tsx:536` | `bg-[rgba(59,130,246,0.10)] text-[#2563eb]` | `Tag variant="blue"` | Same. |
| `src/pages/verification/EmployerVerification.tsx:424` | `text-[#2563eb]` | `text-info-text-on-bg` | Trust-level table. |
| `src/pages/verification/EmployerVerification.tsx:433` | `text-[#b45309]` | `text-warn-text-on-bg` | Trust-level table. |

`#2563eb` (Tailwind blue-600) and `#b45309` (amber-700) are **unclassified** — neither is in
the v2 token set nor on the retirement list. Both are near-misses for
`--color-info-text-on-bg` `#075985` and `--color-warn-text-on-bg` `#92400e`. Recommendation:
map to the tokens; the visual delta is small and it removes two rogue values.

### 1b. Sanctioned exception — Stripe (6 lines, 1 file)

`src/components/stripe/PaymentForm.tsx:88-102`. Stripe Elements cannot read CSS variables.

| Line | Current | Action |
|---|---|---|
| 88 | `colorPrimary: '#16A34A'` | → `'#15803D'` per spec |
| 102 | focus `borderColor: '#16A34A'` | **keep** — a focus border is non-text UI, 3:1 applies, and the spec puts focus rings on `#16A34A` |
| 89, 90, 91, 98 | `#FFFFFF` `#0B1F10` `#DC2626` `#E5E8E2` | already correct, no change |

### 1c. Not a colour — grep false positives (20)

- **HTML entities:** `&#8599;` (↗) ×3 in `CardRowSection.tsx`, `OpenRolesSection.tsx`. The
  regex `#[0-9a-fA-F]{3,8}` matches `#8599`. **The lint rule in P2-12 must exclude `&#\d+;`
  or it will fail CI on an arrow glyph.**
- **Comments:** 13 lines across `BarChart.tsx` `AreaChart.tsx` `Button.tsx` `AdminSidebar.tsx`
  `V12Sections.tsx` `Home.tsx` `utils.ts` `Step8Complete.tsx`. All are prose citing a ratio
  or a retired value. Harmless, but the lint rule needs to strip comments or these fail too.
- **Google logo SVG:** `Login.tsx:89-101`, `SignUp.tsx:178-190` — `#4285F4 #34A853 #FBBC05
  #EA4335`. Google's brand mark; the colours are mandated by Google's brand terms and cannot
  be tokenised. **Needs an explicit allowlist entry, not a token.**

---

## 2. Font-family declarations outside the token file

**Zero.** `grep -rn "font-family" src/ --include='*.tsx' --include='*.ts' --include='*.css'`
excluding `index.css` returns nothing. All typography goes through Tailwind font utilities.

The typography fork is instead in **which token those utilities point at**:

| Utility | `src/index.css` today | v2.1 target | Call sites |
|---|---|---|---|
| `font-body` | Inter | Inter | 455 in 79 files — correct already |
| `font-display` | **Inter** | **Newsreader** | **35 in 25 files** |
| `font-serif` | Newsreader | Newsreader (alias of display) | 4 in 4 files |
| `font-mono` | JetBrains Mono | JetBrains Mono | 8 in 5 files |
| `font-archivo` | Archivo | **delete** | **1** — `AuthLayout.tsx:17` |
| `font-bricolage` | Bricolage Grotesque | **delete** | 5 in 3 files, **all 3 orphaned** |

> ### ⚠️ The single highest-risk change in this migration
>
> `--font-display` currently resolves to **Inter**. Under v2.1 it must resolve to
> **Newsreader**. That is a one-line token edit that **silently converts all 35
> `font-display` call sites to serif in one commit** — dashboards, page titles, error
> boundaries, the nav wordmark, and a numeric match score.
>
> Four of those 35 are already **below the 20px floor the spec sets for the display face**:
>
> | File:line | Size | Element |
> |---|---|---|
> | `src/components/ui/JobDetailSidebar.tsx:183` | 16px | `<h3>` farm name |
> | `src/components/ui/ErrorState.tsx:63` | 16px (`text-base`) | error `<p>` |
> | `src/components/ui/ApplicantDashboardSidebar.tsx:33` | 16px | `<h2>` farm name |
> | `src/components/ui/MatchCircle.tsx:61` | inherited | **numeric score** — must be Inter/mono, never serif |
> | `src/components/layout/Nav.tsx:65` | 20px | wordmark — spec says Inter 700, not display |
>
> And 20 of them are `text-[36px]`/`text-[24px]`/`text-[20px]` **app page titles**, which
> P1-8 explicitly *wants* on the serif. So flipping the token does most of the P1-8 work for
> free — but it must ship **with** the five fixes above in the same commit, or those five
> screens regress the moment the token moves. See §8, P1-8.

---

## 3. Border-radius values outside `{8, 12, 16, 9999}`

Arbitrary `rounded-[Npx]`:

| Value | Uses | Verdict |
|---|---|---|
| `rounded-[8px]` | 69 | ✅ on-system |
| `rounded-[12px]` | 54 (+2 `rounded-t/b-[12px]`) | ✅ on-system |
| `rounded-[16px]` | 12 (+4 `rounded-t/l-[16px]`) | ✅ on-system |
| **`rounded-[10px]`** | **27 (+1 `rounded-t-[10px]`)** | ❌ **not in the spec, not on the retirement list — unclassified.** 10px is the single most common off-system radius in the codebase. It sits between `sm` and `md`. Needs a decision: collapse to 8 or to 12. |
| **`rounded-[6px]`** | **7** | ❌ retired → `8px` |
| **`rounded-[14px]`** | **3** | ❌ unclassified → `12px` or `16px` |
| **`rounded-[4px]`** | **2** | ❌ retired → `8px` |
| **`rounded-[3px]`** | **1** | ❌ retired → `8px` |

Named utilities:

| Utility | Uses | Verdict |
|---|---|---|
| `rounded-full` | 163 | ✅ = pill |
| `rounded-lg` | 36 | ⚠️ Tailwind default `0.5rem` = 8px → ✅ by value, ❌ by name (should be `rounded-8`) |
| `rounded-2xl` | 16 | ❌ 16px by value → ✅, name should be `rounded-16` |
| **`rounded-3xl`** | **14** | ❌ **24px — retired value.** All 14 are on `v13-dark` panels; 12 of those files are orphans. |
| `rounded-xl` | 9 | ❌ 12px → `rounded-12` |
| `rounded-md` | 13 | ❌ 6px → retired → `rounded-8` |
| **`rounded-sm`** | **7** | ❌ **2px — retired** → `rounded-8` |
| `rounded-8` / `rounded-12` | 3 | ✅ the sanctioned tokens, barely adopted |

**Correction to the prompt.** It says "`/jobs` has 35 elements at `3px`". In the source there
is **exactly one** `rounded-[3px]` (`Checkbox.tsx:38`). The 35 computed nodes on `/jobs` come
from that one checkbox plus `rounded-sm` (2px) and `rounded-md`/`rounded-[6px]` resolving to
small radii and being rounded to `3px` in the computed-style read. The fix is the same; the
file count is 10, not 35.

**Off-system radius total: 61 uses across ~40 files** (`rounded-[10px]` 28 · `3xl` 14 ·
`md` 13 · `sm` 7 · `[6px]` 7 · `xl` 9 · `[14px]` 3 · `[4px]` 2 · `[3px]` 1). `rounded-lg` and
`rounded-2xl` are correct by value and are a rename, not a redesign.

---

## 4. Shadows using black rgba

**Zero literal black shadows.** `grep "rgba(0, *0, *0\|rgb(0 0 0"` over `src/` returns nothing.
`--shadow-card` in `index.css` is already tinted `rgb(11 31 16 / …)`.

But **28 uses of Tailwind's default shadow scale across 23 files**, and every Tailwind
default shadow is `rgb(0 0 0 / …)`:

| Utility | Uses | Tailwind default | Spec target |
|---|---|---|---|
| `shadow-sm` | 10 | `0 1px 2px rgb(0 0 0/.05)` | `--shadow-raise` `0 1px 2px rgba(11,31,16,.04)` |
| `shadow-lg` | 7 | `0 10px 15px rgb(0 0 0/.1)` | `--shadow-float` `0 10px 34px rgba(11,31,16,.05)` |
| `shadow-xl` | 7 | `0 20px 25px rgb(0 0 0/.1)` | `--shadow-overlay` `0 20px 50px rgba(11,31,16,.10)` |
| `shadow-md` | 4 | `0 4px 6px rgb(0 0 0/.1)` | `--shadow-raise` or `--shadow-float` — judged per site |

**This is a real finding the prompt's grep would have missed**, because the black is inside
Tailwind, not in our source. The clean fix is to **redefine `--shadow-sm/-md/-lg/-xl` in the
`@theme` block** to the tinted values, which corrects all 28 sites without touching a
component. Recommended over 28 class edits.

---

## 5. Serif misuse

Currently **none can exist** — `--font-display` is Inter, so no serif renders anywhere in the
portals. `font-serif` (the real Newsreader alias) has 4 call sites, all marketing, all ≥20px:

| File:line | Size | Verdict |
|---|---|---|
| `V12Kit.tsx:40` | inherited display sizes | ✅ |
| `V12Roles.tsx:101` | `clamp(1.35rem, …)` ≈ 21.6px min | ✅ |
| `Pricing.tsx:168` | `clamp(2.1rem, …)` ≈ 33.6px min | ✅ |
| `LegalLayout.tsx:38` | `[&_h2]` at `clamp(1.35rem…)` ≈ 21.6px min | ✅ |

**The misuse is latent, not live.** It appears the instant `--font-display` flips to
Newsreader — see the five sites in §2. Listing them here as the serif-misuse register:

| File:line | Element | Fix before the token flips |
|---|---|---|
| `ui/MatchCircle.tsx:61` | numeric match score | `font-display` → `font-body` (tabular nums, never serif) |
| `ui/JobDetailSidebar.tsx:183` | 16px `<h3>` card title | → `font-body` Inter 600/17px |
| `ui/ApplicantDashboardSidebar.tsx:33` | 16px `<h2>` card title | → `font-body` Inter 600/17px |
| `ui/ErrorState.tsx:63` | 16px error `<p>` | → `font-body`; the spec allows serif on empty-state *headlines*, and this is a paragraph |
| `layout/Nav.tsx:65` | 20px wordmark | → `font-body` Inter 700 per the Logo section |

---

## 6. Badge sprawl

**Two real families already exist and are close to the spec.**

| Component | Family | Shape | Verdict |
|---|---|---|---|
| `ui/Tag.tsx` | status pill | `rounded-full px-2.5 py-1 text-[11px] font-semibold`, 6 variants, each a `*-bg` tint + its `*-text-on-bg` partner | ✅ **already the spec's status pill.** Spec names five (`success warn stop info ai`); Tag ships six — the extra is `grey`, which is the spec's **meta chip** wearing the pill's clothes. |
| `ui/ChipSelector.tsx` | interactive chip | `rounded-[8px] min-h-[44px] border-[1.5px]` | ✅ in-card chip, `8px` is correct per spec |
| `ui/ActiveFilterPills.tsx` | meta chip | see below | ⚠️ needs reading against the meta-chip spec |
| `ui/VerificationBadge.tsx` | status pill | own styling | ⚠️ maps to `pill--success` / `pill--info` |
| `ui/DocumentsVerifiedBadge.tsx` | status pill | own styling | ⚠️ maps to `pill--success` |
| `ui/StatusBanner.tsx` | neither — full-width banner | — | ✅ out of scope; a banner is not a badge |

**Fits neither family — called out as required:**

1. **`Tag variant="grey"`** (`bg-surface-2 text-text-muted`) is byte-identical to the spec's
   meta chip except for radius and padding. It should become `.metachip`, not a sixth pill
   variant. Every job attribute currently rendering as `variant="grey"` is a *fact*, and the
   spec is explicit that facts are neutral chips.
2. **Three inline pill re-implementations** that never went through `Tag` at all —
   `JobCard.tsx:25`, `JobDetail.tsx:535-536`, `EmployerVerification.tsx:424/433`. These are
   the same six hex literals from §1a. They are status pills built from raw Tailwind arbitrary
   values, which is exactly how the deleted 1.93:1 `orange` variant shipped in July.
3. **`rounded-full` appears in 63 files.** Most are avatars, dots and icon buttons rather than
   badges. Not a defect, but it means "count the badges by radius" does not work — the
   inventory above is by component, which is why it is short.

**Semantic-token naming mismatch, spec vs repo** — this blocks any literal adoption of the
token file:

| Spec name | Spec value | Repo name | Repo value | Repo ratio on its tint |
|---|---|---|---|---|
| `--color-warn-text` | `#B45309` | `--color-warn-text-on-bg` | `#92400e` | 6.37 (spec's is 4.51) |
| `--color-stop-text` | `#B91C1C` | `--color-danger-text-on-bg` | `#991b1b` | 6.80 (spec's is 5.30) |
| `--color-info-text` | `#0369A1` | `--color-info-text-on-bg` | `#075985` | 6.59 (spec's is 5.17) |
| `--color-ai-text` | `#6D28D9` | `--color-ai-text-on-bg` | `#5b21b6` | 8.19 (spec's is 5.98) |
| `--color-*-tint` | — | `--color-*-bg` | same values except `ai` (`#EDE9FE` vs `#f5f3ff`) | — |

All eight values pass AA. **All four spec values are lower-contrast than what ships.** See §9.

---

## 7. Component inventory

### 7a. Token-clean (v2 tokens only) — the majority

All of `src/components/ui/` except the five named below, all of `src/components/admin/`, all
of `src/pages/dashboard/`, `src/pages/onboarding/`, `src/pages/jobs/steps/`,
`src/pages/verification/` except `EmployerVerification.tsx`. These need **no colour work** —
only the shadow-token redefinition (§4), the radius rename (§3) and, for the 20 page titles,
the `font-display` flip (§2).

### 7b. Off-system — v13 tokens, **live** (16 files, 285 uses)

Ranked by uses. The number after each is how many screens it appears on.

| Uses | File | Screens |
|---|---|---|
| 91 | `src/pages/jobs/JobDetail.tsx` | `/jobs/:id` — 1, but it is the marketplace's money page |
| 45 | `src/pages/auth/SignUp.tsx` | `/signup` ×2 lenses |
| 35 | `src/pages/jobs/JobSearch.tsx` | `/jobs` |
| 21 | `src/pages/auth/ResetPassword.tsx` | `/auth/reset` |
| 21 | `src/pages/auth/Login.tsx` | `/login` |
| 14 | `src/pages/auth/SelectRole.tsx` | `/select-role` |
| 12 | `src/pages/auth/ForgotPassword.tsx` | `/forgot-password` |
| 10 | `src/pages/auth/ConfirmEmail.tsx` | `/auth/confirm/*` |
| 10 | `src/components/layout/AuthLayout.tsx` | **all 8 auth screens** — the single highest-leverage file in this audit |
| 7 | `src/pages/auth/VerifyEmail.tsx` | `/auth/verify` |
| 6 | `src/pages/NotFound.tsx` | every bad URL |
| 5 | `src/pages/preview/ShellPreview.tsx` | internal preview route |
| 5 | `src/components/ui/SearchHero.tsx` | `/jobs` |
| 2 | `src/pages/auth/Suspended.tsx` | `/suspended` |
| 1 | `src/components/ui/MyApplicationsSidebar.tsx` | `/dashboard/seeker/applications` |
| 1 | `src/components/shell/ShellNav.tsx` | every public route |

### 7c. Off-system — v13 tokens, **ORPHANED** (11 files, 95 uses)

Nothing imports these. Verified: `grep -rn "from '@/components/landing/[A-Z]"` returns five
hits, **all five for `LandingIcons`**, which is live and token-clean. Every apparent reference
to the others is a code comment.

`CardRowSection` · `CloseSection` · `CountersSection` · `HeroSection` · `MatchBandSection` ·
`OpenRolesSection` · `PricingClaimSection` · `ProblemSection` · `StepsSection` ·
`TestimonialsSection` · `WorkerSplitSection`

**Re-verified at row 0:** the retired-token grep matches **10** of the 11, not all 11 —
`TestimonialsSection` is an orphan but is already token-clean (`text-text-on-brand`,
`font-display`). It is still a deletion; it just carries none of the 95 uses. So the file
total is **26 = 16 live + 10 orphaned carriers**, plus one clean orphan.

These carry **all 5 `font-bricolage` uses, 12 of the 14 `rounded-3xl` uses, and most of the
`lime` and `cream` residue**. Deleting them is the cheapest single act in this migration and
it removes an entire retired typeface from the codebase.

### 7d. Partially migrated — v14 marketing tokens (fern/bark/sage/paper/rule)

`PublicShell` · `ShellNav` · `Home` + `landing/v12/*` · `ForEmployers` · `Pricing` ·
`legal/LegalLayout`. **164 uses.** These are *already the right colours* — `fern-900` is
`#14532D`, `fern-700` is `#15803D`, `bark` is `#0B1F10`, `sage` is `#5B6B5F`, `rule` is
`#E5E8E2`. Only two values disagree with v2.1:

| Marketing token | Value | v2.1 says | Delta |
|---|---|---|---|
| `--color-paper` | `#F7F8F6` | `#F3F5F0` (`surface-2`) | on the retirement list |
| `--color-fern-50` | `#F1F8F3` | `#E8F5EC` (`green-50`) | on the retirement list |

Everything else is a **pure rename**: `fern-900`→`brand-900`, `fern-700`→`brand`,
`fern-600`→`brand-accent`, `fern-100`→`brand-50`, `bark`→`text`, `sage`→`text-muted`,
`rule`→`border`, `linen`→`surface`.

**This is the good news in the audit.** The prompt treats marketing and portal as two systems
to reconcile. They already hold the same hexes under different names — the 2026-08-24 v14
change did that work. What is left is aliasing, not re-theming, and it is why "the landing
page is the reference implementation" holds: it is the surface already on the v2.1 values.

### 7e. Dead-token reference (1)

`src/pages/jobs/steps/JobStep5Description.tsx:72` reads `var(--color-clay)`. **`--color-clay`
is not defined anywhere in `src/index.css`** — verified by diffing every `var(--*)` used in
`src/` against every token defined. The character counter's near-limit colour has been
rendering as *nothing* (inherited) since the token was removed. Maps to `--color-warn-text-on-bg`.

**Correction to the spec.** `Brand_and_Design.md` P2 item 10 says `border-t-moss` and other
v1 soil/cream utilities survive in ~10 components including `ProtectedRoute.tsx` and
`AuthLayout.tsx`. **They do not.** `grep` for `moss|soil|meadow|hay|sand|clay|wheat` as a
Tailwind utility returns **zero hits in `src/`**, and none of those names appear in
`index.css`. That sweep was already done. The only dead-token reference left is
`--color-clay` above. P2-10 should be struck and replaced with it.

---

## 8. Blast radius per migration item

Sized for PRs. "Files" counts files edited; "sites" counts individual class/value changes.

### P0

| # | Item | Files | Sites | Notes |
|---|---|---|---|---|
| 1 | **Archivo → Inter + Newsreader on auth** | **9** | 10 | `AuthLayout.tsx` line 17 removes `font-archivo` (1 site) and the layout inherits `font-body`. The other 8 auth pages need `<h1>` → Newsreader. **The "24 nodes" in the spec are all downstream of one class on one line.** Smallest P0 by far; do it first. |
| 2 | **Delete the sand palette** | **16** | ~120 | `cream`→`bg`, `cream-2`/`card`→`surface-2`, `line`→`border`. Concentrated: `JobDetail` 91 + `JobSearch` 35 + `SignUp` 45 are 60% of it. Split into 3 PRs by file, not 1. |
| 3 | **Delete lime `#8CC63F`** | **1 live** (+8 orphaned) | 3 live | `SignUp.tsx` only, once the orphans are deleted. `text-lime` → `text-brand-lite` (`#86EFAC`) on the dark panel — measured **6.49:1 on `#14532D`**, vs 2.05:1 today. |
| 4 | **Unify the dark panel green** | **1 live** (+4 orphaned) | 2 live | `bg-green`/`bg-green-2` → `bg-brand-900`. `#123324`→`#14532D`. `AuthLayout.tsx` + `SignUp.tsx`. |

**No P0 item exceeds 40 files.** The largest is P0-2 at 16.

### P1

| # | Item | Files | Sites | Notes |
|---|---|---|---|---|
| 5 | Collapse near-miss greys | 16 | ~217 | `ink`→`text` (137), `ink-60`→`text-muted` (50), `ink-40`→`text-muted` (30). Same 16 files as P0-2 — **merge into those PRs**, do not ship separately. |
| 6 | Links off `#16A34A` → `#15803D` | **1** | 1 | Change `--color-brand` in `index.css`. Everything downstream is already `text-brand`/`bg-brand`. ⚠️ but see §9 — this also moves every `bg-brand` *fill*, which is a visible change, not the "no perceptible change" the spec claims. |
| 7 | Normalise radii | ~40 | 61 | Mostly renames. `rounded-[10px]` (28 uses) needs a decision first — see §9. |
| 8 | Serif into app page titles | **1 + 5** | 1 + 5 | Flip `--font-display` to Newsreader (1 line) **and** fix the 5 sub-20px sites in §5 in the same commit. Gets 20 page titles onto the serif for free. Highest reward-to-diff ratio in the whole migration, and the highest risk if shipped alone. |
| 9 | Amber selected state → brand tint | 1 | ~2 | `SignUp.tsx` role cards. |

### P2

| # | Item | Files | Sites | Notes |
|---|---|---|---|---|
| 10 | ~~Sweep `border-t-moss`~~ | **0** | 0 | **Already done.** Replace with: fix `--color-clay` (1 file, 1 site) and **delete the 11 orphaned landing components** (11 files, −95 retired-token uses, −5 `font-bricolage`, −12 `rounded-3xl`). |
| 11 | Retire duplicate surfaces | 1 | 2 | `--color-paper` `#F7F8F6`→`#F3F5F0`, `--color-fern-50` `#F1F8F3`→`#E8F5EC` in `index.css`. Zero component edits. |
| 12 | Hex lint rule | 1 new script + `ci.yml` | — | Must exclude: `&#\d+;` entities, `//` and `/* */` comments, `src/index.css`, the Stripe block, the Google logo SVGs in `Login.tsx`/`SignUp.tsx`, and `root.tsx`'s `theme-color` meta. Six allowlist entries, all justified in §1. `scripts/design-gate.mjs` already exists and ratchets at 17 — **extend it, do not add a second gate.** |
| **13** | **Shadow tokens** (new — §4) | 1 | 4 | Redefine `--shadow-sm/-md/-lg/-xl` in `@theme` to the tinted values. Corrects 28 black-rgba shadows across 23 files with zero component edits. |

**Total live retired-token uses: 285 across 16 files.** Plus 95 in 11 files that are deletions.

---

## 9. Decisions — RULED 2026-08-25

All nine were ruled before Phase 2 began. **The spec lost on five of nine — every one where
it was lighter than what ships.** The token file and the brand doc were amended in row 0;
the code was not changed to match the spec on any of them.

| # | Ruling |
|---|---|
| 1 | `--color-text-subtle` **stays `#5c6a60`**. Spec amended. |
| 2 | `rounded-[10px]` (28 uses) **collapses to `12px`**. |
| 3 | The four semantic `*-text-on-bg` values **stay as they ship**. Spec amended. |
| 4 | **Repo naming wins** — `-text-on-bg` / `-bg`, not `-text` / `-tint`. Spec amended. |
| 5 | `--color-ai-bg` **stays `#f5f3ff`**. Spec amended. |
| 6 | `--color-border-strong` **stays `#d0d5cc`**. Spec amended. |
| 7 | `--color-brand` **moves to `#15803D`**. Fills darken; intended. |
| 8 | `#2563eb` / `#b45309` **map to the info/warn tokens and are deleted**. |
| 9 | **Newsreader lands on app page titles**, shipped with the five sub-20px fixes in one commit. |

The original statements of each, with the measured ratios that drove them, follow.

1. **`--color-text-subtle`: the spec regresses a fixed accessibility bug.**
   The spec sets `#8A968D` and annotates it "3.1:1 — placeholder/disabled ONLY". The repo
   ships `#5c6a60`. `index.css` carries the history: it was `#8a968d`, darkened to `#647268`
   in Phase 4.1 "because 3.08:1 on white was carrying real prose", then darkened again on
   2026-08-24 to `#5c6a60` after the `/jobs/:id` axe sweep found it failing **four surfaces
   nobody had checked** (cream-2 4.03, danger-bg 4.14, cream 4.33, info-bg 4.41).
   **Measured now:** spec `#8A968D` = **2.96 on bg · 3.08 on white · 2.80 on surface-2**.
   Repo `#5c6a60` = **5.49 on bg**, and clears 4.5:1 on all eighteen pairs in
   `scripts/contrast.mjs`.
   Adopting the spec value reintroduces the exact defect twice fixed. **Recommendation: keep
   `#5c6a60` and amend the spec.** If you want the lighter value, it can only ship after
   every `text-text-subtle` site is audited for prose — and that audit was already done twice
   and failed twice.

2. **`rounded-[10px]` — 28 uses, the most common off-system radius, and it is on neither list.**
   Not in the four-radius scale, not on the retirement list. Collapse to `8` or to `12`?
   (It is used on cards and callouts more than inputs, which argues for `12`.)

3. **The four semantic text tokens are all lighter in the spec than in the repo.**
   warn 4.51 vs 6.37 · stop 5.30 vs 6.80 · info 5.17 vs 6.59 · ai 5.98 vs 8.19. All pass AA
   either way. Adopting the spec is a deliberate contrast *reduction* across every status
   pill. Is that intended, or should the repo values stand and the spec be amended?

4. **Token naming: `--color-*-text` vs `--color-*-text-on-bg`, `-tint` vs `-bg`.**
   The repo names are load-bearing — `Tag.tsx` carries a comment explaining that the
   `-text-on-bg` suffix is what stopped a 1.93:1 variant shipping again, and
   `scripts/contrast.mjs` gates the pairs by name. Renaming touches `Tag.tsx` + every
   consumer + the contrast gate. **Recommendation: keep the repo's `-on-bg` names as the
   canonical ones and amend the token file**, because the suffix encodes the rule.

5. **`--color-ai-tint`: `#EDE9FE` (spec) vs `#f5f3ff` (repo).** Different values, neither on
   the retirement list.

6. **`--color-border-strong`: `#D3DAD3` (spec) vs `#d0d5cc` (repo).** Near-miss; the spec
   value measures 1.42:1 on white, so as a *border* it fails the 3:1 non-text threshold —
   as does the repo's. Both are decorative hover borders, so 3:1 arguably does not apply, but
   say so explicitly rather than leaving it ambiguous.

7. **P1-6 is not the no-op the spec claims.** "Move links off `#16A34A` → `#15803D`. Fixes a
   3.30:1 AA failure with no visible change." Moving `--color-brand` moves **every** consumer,
   including `bg-brand` button fills, `border-brand` and icon fills — not just links. The
   button primary already fills with `--color-brand-hover` (`#15803D`) per a Phase 4.1 fix, so
   **primary buttons will not move**, but every `bg-brand` chip, dot and icon will darken
   visibly. Confirm that is wanted, or split `--color-brand` (text) from `--color-brand-accent`
   (fills) at the call sites first.

8. **`#2563eb` and `#b45309`** (§1a) — map to `info-text-on-bg` / `warn-text-on-bg`, or keep
   as new tokens? Recommendation: map, and delete them.

9. **Newsreader on app page titles is a product decision, not a token decision.**
   `Brand_and_Design.md` says app page titles take the serif, and flipping `--font-display`
   does it. But `docs/DESIGN.md` (the portal canon, and what the `impeccable` skill audits)
   currently describes Inter-only portals, and `CLAUDE.md` §10 makes `docs/DESIGN.md`
   authoritative for gated portals. **The two canons will contradict each other the moment
   this lands.** §11 proposes how to resolve it; it needs your ruling.

---

## 10. Reproducing this audit

```bash
# §1 hex literals
grep -rEn "#[0-9a-fA-F]{3,8}\b" src/ --include='*.ts' --include='*.tsx' \
  --include='*.css' --include='*.js' --include='*.jsx' | grep -v "^src/index.css"

# §2 font-family declarations outside the token file
grep -rn "font-family" src/ --include='*.tsx' --include='*.ts' --include='*.css' \
  | grep -v "^src/index.css"

# §3 radii
grep -rEoh "rounded(-[a-z]+)?-\[[0-9]+px\]" src/ --include='*.tsx' | sort | uniq -c | sort -rn
grep -rEoh "\brounded(-[trbl]{1,2})?-(none|sm|md|lg|xl|2xl|3xl|full|8|12|16)\b" src/ \
  --include='*.tsx' | sort | uniq -c | sort -rn

# §4 shadows
grep -rn "rgba(0, *0, *0\|rgb(0 0 0" src/ --include='*.tsx' --include='*.css'
grep -rEoh "\bshadow-(sm|md|lg|xl|2xl|inner)\b" src/ --include='*.tsx' | sort | uniq -c

# §7b/c retired v13 tokens, by file
grep -rlE "\b(bg|text|border|from|to|via|fill|stroke|ring|divide|outline|decoration|placeholder|caret|accent)-(cream|cream-2|card|ink|ink-60|ink-40|green|green-2|green-3|lime|lime-2|ochre|ochre-ink|line|danger-ink)\b" \
  src/ --include='*.tsx'

# §7c orphan proof
grep -rn "from '@/components/landing/[A-Z]" src/ --include='*.tsx' --include='*.ts'

# §7e undefined token references
grep -rhoE "var\(--(color|font|shadow|radius|text)-[a-z0-9-]+\)" src/ --include='*.tsx' \
  | sed 's/var(//;s/)//' | sort -u > /tmp/used.txt
grep -oE "^\s*--(color|font|shadow|radius|text)-[a-z0-9-]+" src/index.css \
  | tr -d ' ' | sort -u > /tmp/defined.txt
comm -23 /tmp/used.txt /tmp/defined.txt
```

Contrast ratios in §8/§9 were computed with the WCAG 2.1 relative-luminance formula; the
one-liner is in the session transcript and matches `scripts/contrast.mjs`.

---

## 11. Repo/folder plan — where these documents live

You asked for previous design docs to move to a superseded location and the new ones to
become canonical. Here is the proposal. **Nothing has been moved; this needs approval,
because two of these files are named in `CLAUDE.md` §10 and one is auto-discovered by the
`impeccable` skill.**

### Current state

| Path | What it is | Lines |
|---|---|---|
| `docs/_canonical/Brand_and_Design.md` | **v2.0**, 2026-06-20. Serif retired, one green, `--color-brand` = `#16A34A`. | 84 |
| `docs/DESIGN.md` | Portal implementation contract. **`CLAUDE.md` §10 names it canon for gated portals**; `impeccable` auto-discovers it from `docs/`. | 549 |
| `docs/design/MARKETING-DESIGN.md` | v14 marketing canon, 2026-08-24. **`CLAUDE.md` §10 names it canon for marketing.** | 137 |
| `docs/design/v12-DIRECTIVE.md` | v12 landing directive. Already banner-superseded by MARKETING-DESIGN. | 209 |
| `docs/design/v11-DIRECTIVE.md` | v11 directive. §1.3/1.4/1.5 are **still binding product principles** per `CLAUDE.md` §10. | 1054 |
| `docs/design/contrast.md` | Contrast ledger backing `scripts/contrast.mjs`. Live. | — |
| `docs/design/Brand_and_Design.md` | **v2.1 — written this session** | 165 |
| `docs/design/topfarms-tokens.css` | **canonical tokens — written this session** | 176 |

### Proposed

```
docs/_canonical/
  Brand_and_Design.md        <- REPLACED by v2.1 (the file written this session moves here)
  topfarms-tokens.css        <- NEW, moves here. The @theme block src/index.css must contain.
  DESIGN.md                  <- MOVES here from docs/. Amended: the serif ruling, one green ramp.
  MARKETING-DESIGN.md        <- MOVES here from docs/design/. Amended: fern-* are aliases now.
  (PRD.md, Data_Architecture.md, TopFarms_Master_Compendium.md, …  unchanged)

docs/_superseded/2026-08-25/
  Brand_and_Design-v2.0.md   <- the current docs/_canonical/ copy
  v12-DIRECTIVE.md
  design-system-v1.0-board.md (if a written form exists; the board is an image)

docs/design/
  contrast.md                <- stays; it is a live ledger, not a directive
  v11-DIRECTIVE.md           <- STAYS. It is not purely a design doc — §1.3/1.4/1.5 are
                                 binding product principles cited by CLAUDE.md §10.
                                 Add a banner pointing colour/type questions at _canonical.
  AUDIT.md                   <- this file
  design-reference/, heroes/, *.html, *.png  <- unchanged, they are artefacts not canon
```

### The two things that break if we just move files

1. **`impeccable` auto-discovers `docs/DESIGN.md` and `docs/PRODUCT.md` from `docs/`.**
   `CLAUDE.md` §10 says so explicitly and says "do not move them". Moving `DESIGN.md` into
   `_canonical/` will silently stop the design skill from finding the portal canon. Either
   leave `DESIGN.md` at `docs/DESIGN.md` and give it a header pointing at `_canonical/`, or
   move it and update `.impeccable/` config plus `CLAUDE.md` §10 in the same commit.
   **Recommendation: leave it in place, amend its contents.** A symlink would also work but
   is worse for review.

2. **`CLAUDE.md` §10 currently codifies "two worlds, one is closed"** — separate canon for
   portals and marketing, and "a visual finding on a marketing surface is discarded".
   v2.1 collapses those two worlds into one token set. **That rule must be rewritten**, or
   the next session will still discard marketing findings against a canon that no longer has
   a marketing half. This is a `CLAUDE.md` edit and per §3 of that file I will show the diff
   before writing it.

**§11 was executed in row 0, 2026-08-25.** `docs/DESIGN.md` **stays where it is** (option 1)
and gained a header pointing at the canonical brand doc — moving it would have blinded the
`impeccable` skill, which auto-discovers it from `docs/`. `docs/design/MARKETING-DESIGN.md`
also stays, demoted from "canon" to the marketing layout-and-voice guide, deferring to the
brand doc on every colour, type and shape value. `CLAUDE.md` §10 was rewritten in the same
commit.

---

## 12. Recommended PR order (differs from the prompt — here is why)

The prompt orders by user-visible impact. That is right for the *fork*, but three items are
one-line token edits that do a large share of the work and cost almost nothing, and one item
is a pure deletion that shrinks everything downstream. Doing those first makes every later PR
smaller.

| PR | Item | Files | Why here |
|---|---|---|---|
| **1** | Delete the 11 orphaned landing components (P2-10, revised) | 11 | Pure deletion. Removes 95 retired-token uses, `font-bricolage` entirely, 12 `rounded-3xl`. Every later grep gets quieter. Zero user-visible change. |
| **2** | Token file: shadows tinted (P2-13), duplicate surfaces retired (P2-11), `--color-clay` fixed | 2 | Four one-line edits in `index.css`. Corrects 28 black shadows across 23 files with no component edits. |
| **3** | P0-1 Archivo → Inter + Newsreader | 9 | The most visible fork, and the smallest P0 (10 sites). |
| **4** | P0-2 + P1-5 on the auth screens (`AuthLayout` + 8 pages) | 9 | Same files as PR 3 — sand and greys together, or those screens change twice. |
| **5** | P0-3 + P0-4 + P1-9 (`SignUp.tsx`) | 1 | Lime, dark-panel green and the amber selected state all live in one file. |
| **6** | P0-2 + P1-5 on `JobDetail.tsx` | 1 | 91 uses, one file, the marketplace's money page. Alone, so the screenshot diff is readable. |
| **7** | P0-2 + P1-5 on `JobSearch.tsx` + `SearchHero` + remaining 4 files | 6 | Finishes the v13 retirement. After this, zero `cream`/`ink`/`line` in `src/`. |
| **8** | v14 marketing tokens → v2 aliases | 8 | Pure rename, 164 sites. Touches the landing page — **last and least**, per the guardrail. |
| **9** | P1-8 serif: flip `--font-display` + fix the 5 sub-20px sites | 6 | Needs §9 item 9 ruled first. |
| **10** | P1-7 radii | ~40 | Needs §9 item 2 ruled first. |
| **11** | P1-6 `--color-brand` → `#15803D` | 1 | Needs §9 item 7 ruled first. |
| **12** | P2-12 lint rule, extending `scripts/design-gate.mjs` | 2 | Last, so it locks a state that is already clean. |

---

## Summary

| Question | Answer |
|---|---|
| Hex literals needing action | **6** (+6 sanctioned Stripe, +20 false positives) |
| Font-family declarations outside the token file | **0** |
| Off-system radius uses | **61** across ~40 files |
| Black-rgba shadows | **0 literal, 28 via Tailwind defaults** in 23 files |
| Live serif misuse | **0 today, 5 latent** the moment `--font-display` flips |
| Badge families | **2 already correct** + 1 mis-filed variant + 3 inline re-implementations |
| Files carrying retired v13 tokens | **26** — 16 live (285 uses), **10 orphaned** (95 uses), +1 clean orphan |
| Undefined token references | **1** (`--color-clay`) |
| Largest single P0 | **16 files** — under the 40-file stop threshold |
| Items needing your decision | **9** (§9) |
| Spec corrections found | **3** — the `3px`×35 claim, the `border-t-moss` claim, and `--color-text-subtle` regressing a twice-fixed a11y bug |

**Phase 1 complete. Nothing in `src/` has been modified.** Two new files were written —
`docs/design/Brand_and_Design.md` and `docs/design/topfarms-tokens.css` — because the prompt
required them present before the audit could cite them.

Awaiting approval on §9 (nine decisions) and §11 (the `DESIGN.md` question) before Phase 2.
