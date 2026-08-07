# TopFarms v11 Design Directive

**Status:** authoritative for the v13 port of this design system into the production app
(`src/`), and for the comps (`topfarms-v11.html`, `topfarms-v12.html`) that were its
design phase.
**Supersedes:** nothing. `topfarms-v10.html` stays on disk as the audited baseline.
**Written:** 2026-08-03, from the v10 design and copy audit plus a merge of four skills
(`taste-skill`, `no-ai-slop`, `redesign-skill`, `imagegen-frontend-web`).
**Amended:** 2026-08-03 for v12: audience toggle and account CTAs. Sections 1.9, 3, 4, 6
and 8 changed. Reference for the utility bar structure is ZEIL (zeil.com); the structure
was taken, none of its liquidity patterns were.
**Amended:** 2026-08-03 for v13: the port. Sections 1.10 to 1.15, 4, 6 and 8 changed.
The comp series ended with v12; from here the deliverable is the production app.

This file exists so a future pass does not silently undo a decision that was made on
purpose. If you are about to change something here, the burden is on you to say why the
original reasoning no longer holds.

**Typographic constraint for this project:** zero em dashes and zero en dashes, in the
page and in this document. Hyphens only. This is `taste-skill` 9.G, adopted in full.

---

## 1. Decision record

The reasoning below is not visible in the code. It is the reason the code looks the way
it does.

### 1.1 The match panel is explanatory, not decorative

`taste-skill` bans div-built product previews twice (4.8 and 9.F) and calls it the number
one LLM design tell. The hero match panel is exactly that shape, so the ban was examined
rather than obeyed.

It was kept. The ban exists because fake dashboards are usually decorative: they simulate
a product that does not exist in order to imply sophistication. This panel is
explanatory. The scoring output is the product, so showing the output is showing the
thing itself, not a costume for it.

What the ban did correctly catch was that v10 dressed an explanation up as a live system.
These were stripped in v11:

| Removed | Why |
|---|---|
| Pulsing dot and the word "scoring" | Implied a running process |
| "updated live" | Implied real time data |
| "documents verified 2 of 3" | A verification claim about people who do not exist |
| Panel header "Match engine" | Named a system rather than an example |

The header is now **"Example: how applicants arrive"**. The panel explains and does not
pretend. The sixteen candidate names remain invented, which is acceptable only while the
panel is labelled as an example. If the label ever comes off, the names must become real
anonymised data or go.

### 1.2 The page is zero-photography

v10 line 11 stated the intent and v11 keeps it. Every container that would hold an image
holds product output or data instead.

This is the most distinctive decision on the page and it is deliberate, not a gap.
`redesign-skill` line 43 and `taste-skill` 4.8 both push placeholder photography with
`picsum.photos` as the named default. On an agricultural recruitment page, seeded stock
photography is worse than honest absence: it would show farms that are not our farms and
people who are not our people, to an audience that can tell.

The correct source is farm photography TopFarms owns. That is a shoot, not a CSS task.
Until it exists, the slots are marked and listed in section 5. This follows
`taste-skill`'s own fallback at line 272 rather than its default at line 267.

### 1.3 The scoring mechanic is underplayed here and prominent in the portal

The marketing page names the mechanic once, in the "Built around the farm" section, and
does not re-advertise it in card links, CTAs or section labels. The employer portal
carries it prominently. That split is intentional.

The audience is a time-poor owner-operator who hires on gut and reputation and has been
let down before. Leading with an algorithm invites the objection the page exists to
avoid: that a machine is picking their staff. The page therefore sells the outcome (the
right person surfaces, with reasons, and you decide) and lets the mechanic sit behind it.
Once someone is in the portal they have already accepted the premise, so the mechanic can
be front and centre there.

Practical consequence: **card links say "I'm hiring" and "I'm looking for work", never
"See how scoring works".**

### 1.4 Workers never see a personal number

Employers see numeric match scores. The worker-facing profile panel shows a word,
**"Strong"**, against a named job. It never shows the worker a score for themselves.

Two reasons. A number attached to a person invites them to read it as a rating of their
worth, and the worker side includes migrant workers who are structurally vulnerable and
fee sensitive. A word carries the same information without the ranking sting. This is the
same principle as 1.5.

### 1.5 The page never disparages applicants

v10 carried this in one line, "the enemy is the process, not the people", which was cut
in v11 as meta-commentary about messaging rather than something a farmer would think.

The protection did not go with it. It now lives in a concrete sentence in the "Built
around the farm" section:

> **"Every applicant stays on the list, ordered by fit. You decide who to ring."**

This sentence is load-bearing. It is the only place the page says the tool does not
filter people out. **It must survive any future copy cut.** It sits in the same paragraph
that previously carried a seven item recitation, so it is at risk from exactly the kind
of edit that removed the recitation.

### 1.6 The alternating green panels are a system, not an accident

`taste-skill` 4.11 (Page Theme Lock) and `redesign-skill` line 42 both read the five dark
panels as a fault. They were not flattened. The alternation is rhythmic and deliberate,
and both rules are aimed at a *single* dark section dropped into a light page, which is
not what this is.

The measured defect was narrower: all five greens were byte identical, same `--green`,
same `repeating-linear-gradient(96deg, ..., 1px 54px)`. Two are now differentiated on a
stated rule:

| Panel | Surface | Texture | Meaning |
|---|---|---|---|
| Hero, Built around the farm, Your profile | `--green` | 54px rules | Product surfaces |
| What it costs | `--green-3` | none, flat | Commercial. Plainest surface on the page, matching "no calls, no quotes" |
| Closing CTA | `--green-2` | 28px rules, finer | End of page |

Adding a sixth green panel means assigning it to one of these three families, not
inventing a fourth.

### 1.7 Bars carry no filled track

`taste-skill` 9.F bans filled background tracks as comparison visuals, and the audit
independently found the same fault from the other direction: v10 values clustered between
78 and 96, so on a 640px track every bar read as full and the graphic communicated
nothing.

v11 uses a thin unfilled rule, **rebased to start at 50**, so `width = (score - 50) * 2`.
A 78 and a 95 now differ visibly. There is no background track, so there is no implied
"out of 100" reference, which is correct because the number sits beside it.

### 1.8 The 01 / 02 / 03 numerals stay

`taste-skill` 9.F bans "Step 1 / Stage 1 / Phase 01" *labels*. It does not reach bare
numerals used as typographic rhythm. The measured defect was contrast, not the device:
ochre `#D9A441` on `--card` was **2.14:1**, the worst on the page. The `--ochre-ink`
token fixes it. The numerals stay.

### 1.9 The audience toggle

v12 adds a persistent Job seeker / Employer toggle in a utility bar above the nav.
Structure referenced from ZEIL's utility bar; nothing else was taken from it.

Why it exists, in order of weight:

- It sets audience context persistently, so the nav links can differ per side instead
  of one generic set serving both audiences.
- It gives the worker path equal standing in the chrome. v11's compromise was a text
  link squeezed beside a filled button; a toggle segment is the same size as the
  employer's.
- It is what makes a single "Join TopFarms" CTA unambiguous. Without the toggle, "Join
  TopFarms" is a question mark, because the visitor has not said which side they are on.
- It costs almost no vertical space.

Default state is **employer**: employers are the paying side and the hero headline is
two-sided rather than seeker-led. The choice persists in `sessionStorage` and is
reflected on load.

The hero intent buttons stay exactly as they are, both visible, unchanged. The toggle
serves decided and returning visitors; the hero buttons serve someone who ignored it.
That is not redundancy.

### 1.10 The port (v13)

The comps were the design phase. The deliverable is the production app: a Vite + React 19
SPA with React Router 7, Supabase auth, 33 routes and a live deployment at
topfarms.co.nz. v13 ports this design system into that app's public surfaces.

**Ground rules, set by the operator on 2026-08-03:**

- Work happens on a branch (`v13-port`) with Vercel preview deploys. Merge to `main`
  only when every gate in section 8 passes on every ported route. Nothing lands on prod
  untested.
- Sequence: shared surfaces first (tokens, utility bar, Nav, footer, focus, motion),
  then the landing page, then the public routes in traffic order. Each stage must be
  mergeable on its own; a half-ported site is worse than either system applied
  consistently, so a stage that inverts one page while its neighbours keep the old
  system does not merge until its whole surface is coherent.
- Gates are reported per stage, not once at the end.

**This is a port, not a rescue.** The production system (Brand Spec v2: Inter, white
surfaces, `#16a34a`) is coherent and carries discipline the comps never had to earn.
Where the old system does something better, it is kept and the win is recorded here.
Kept outright:

- `scripts/contrast.mjs` and the computed-ratio habit. The comp system's gates get run
  through the same mechanism, not a parallel one.
- The Phase 5.2 type scale reasoning (`text-micro` 11px floor, two added tokens only).
  The comp scale maps onto it; the 11px floor stands. Note the `cn()` registration trap:
  `text-micro` and `text-label` read as colours to tailwind-merge and will strip
  `text-white` unless registered.
- The global `:focus-visible` ring in `@layer base` and the rule that Tailwind v4's
  `outline-none` + `focus-visible:outline-*` combination never paints.
- Reduced-motion discipline: the CSS clamp plus `MotionConfig reducedMotion="user"`.
- The lazy-chunk recovery wrapper, error-boundary split (real errors are not shown as
  404s), and the route-ordering conventions documented in `main.tsx`.

**Expected tooling noise, do not "fix":** the impeccable design hook flags Inter in
`src/index.css` as an overused font. The finding is correct and is the port's thesis:
Inter leaves public surfaces stage by stage, and product surfaces keep it until their
own port phase. Until then the finding stands. Do not suppress it, and do not resolve it
by removing Inter from surfaces that still render with it.

**What the comps never had to consider, and the port must not lose:** role-aware nav
(signed-in users see role links, not public links), auth states on every gated surface,
empty states, error boundaries, loading states (skeletons and the route fallback), the
suspended-user gate, and the recovery-redirect. The comp shows the logged-out, populated,
error-free page; production is mostly the other states. Every ported component ships all
of its states, not the comp's one.

### 1.11 Per-audience headline (v13)

The audience toggle now drives the hero headline as well as the nav links:

| Audience | Headline |
|---|---|
| Employer (default) | "The right match, both ways." |
| Job seeker | "Find the farm job that fits." |

The two sides want opposite things. An employer wants to know good applicants will
arrive, which the match panel demonstrates. A worker wants to know a good role exists.
One headline cannot serve both without going generic. The seeker line echoes the fit
language already running through the panel and subcopy, so the two read as one system
rather than two taglines.

Both strings live in the DOM; the employer string is the CSS default so the page is
correct without JavaScript, the same pattern as the nav sets. **The toggle is now
load-bearing for the hero, not only the nav.** If it breaks, the largest piece of copy
on the page breaks with it.

Production interplay: when a session exists, the session role wins over the toggle
everywhere (see 1.14). A signed-in seeker sees the seeker headline regardless of a stale
toggle value.

### 1.12 Pricing moves to /pricing, the position stays (v13)

The five pricing cards come off the landing page. The pricing POSITION does not.

No competitor in the sector publishes fees. ZEIL and NZ Farming Jobs both keep pricing
on a separate route, which confirms the convention but does not change the
differentiator. Moving the table stops five cards competing with the match panel for
attention. Removing the claim would surrender the only position no competitor holds.

The landing page keeps, in the slot the cards vacate:

> "First listing free. Workers never pay. Prices published, no calls, no quotes."

linking to `/pricing`. The slot keeps a dark green panel treatment so the page rhythm
from 1.6 survives; if the surface assignment changes, it changes under 1.6's stated
rule, not ad hoc.

Production note: the live `/pricing` route already exists with the same numbers ($100,
$150, $200, placement $200 to $800). The port reskins it; the numbers and the
first-listing-free mechanics are already true and do not change.

### 1.13 Search returns, secondary (v13)

Supersedes the liquidity half of Test 3 (section 6). The rejection was about liquidity,
not principle: with seeded (preview) or real listings the objection no longer holds.

Constraint that survives: **search is a SECONDARY entry point, never a hero
replacement.** The match panel stays the hero. A search-first hero is the most copied
pattern in the category and adopting it would trade the only novel element on the page
for a commodity one. Search sits at the head of the Open roles section, where it has
inventory to act on, and submits to `/jobs?q=`. If a future pass proposes promoting
search into the hero, this entry is the answer.

### 1.14 Route names and audience state (v13)

**Route names.** The repo's conventions win. The v13 brief's route names were intent,
not paths. Mapping, so none of these are re-proposed:

| Brief said | Repo has | Keep |
|---|---|---|
| /signin | `/login` | `/login` |
| /signup or /join | `/signup` + `?role=employer\|seeker` | `/signup` |
| /post or /employer | `/for-employers` (marketing) + `/jobs/new` (gated flow) | both |
| /profile | role dashboards + onboarding edit (UAT-04 removed /profile deliberately) | dashboards |
| /how-it-works | a section on the landing page, not a route | the section |

**Audience state.** The toggle's value lives in `sessionStorage` (key `tf-aud`), read
once at app start into a layout-level React context that drives the utility bar, the nav
sets, the hero headline, and the `?role=` param on signup links. Precedence: **session
role beats toggle** whenever a session exists; the toggle is a pre-auth device.

Rejected alternatives, so they are not re-litigated:

- URL segment (`/employer/...`): doubles every public URL, splits SEO signal across two
  trees, and misstates what the toggle is (a lens, not a location).
- Query param on every link: leaks into shared links, so a seeker opens an employer-lens
  page and the page argues with its own visitor.
- Cookie: nothing server-side reads it (SPA); a cookie's cross-session persistence also
  overstates the choice. Session-scoped is right: the toggle is a browsing lens, and a
  returning visitor who signs in gets the stronger signal (their role) anyway.

`sessionStorage` matches the v12 comp behaviour, survives reload, resets per tab
session, and needs no consent surface.

### 1.15 Inventory honesty: seed policy and the counter gate (v13)

**Production is never seeded.** Fabricated listings in front of real visitors is the
same class of incident the 2026-07-08 truth pass removed (fabricated testimonials,
`REMEDIATION-LOG.md`). Seed data exists locally and in preview deploys only. If the
board must look alive in prod before real inventory exists, it is labelled as a demo in
plain language. The real answer to inventory is the admin leads pipeline, which harvests
actual listings.

Seed shape: seed rows mirror the production `jobs` schema (migration
`001_initial_schema.sql`), inserted into the local/preview database, so the seed is
deleted rather than migrated when real data arrives. No parallel JSON fixture format
that components learn to depend on.

**The counter gate** shipped ahead of the port, directly on `main` (commit `fd1221a`,
2026-08-03): `CountersSection` renders nothing (no band, no LIVE badge) unless every
stat clears `MIN_CREDIBLE` (10). The homepage was animating "Jobs Posted: 0" under a
pulsing LIVE badge, which is the exact failure Test 3 records as deleted from the comps
in v1. The floor is a judgment call, not a measurement; raise it if double digits still
read as thin. The section self-restores as volume arrives. Do not remove the gate as a
simplification.

### 1.17 Stage 3a decisions: the destination port (v13)

Five calls made 2026-08-03 under the operator's judgment clause. Recorded so none
is re-litigated.

**a. AuthLayout ports in place, and 3a widens to seven auth routes.** `AuthLayout`
is a chrome-less split-screen (no nav, no footer) shared by `/login`, `/signup`,
`/forgot-password`, `/auth/reset`, `/auth/verify`, `/auth/select-role` and
`/suspended`. Wrapping auth pages in `PublicShell` would bolt a utility bar and
nav onto a deliberately focused surface, and porting only two of the seven would
leave a visitor who clicks "Forgot password" stepping between design eras inside
one flow. So `AuthLayout` is restyled in place and all seven routes move
together. **`PublicShell` is therefore the pattern for CONTENT routes, not
literally every route; auth is the one sanctioned exception** and it exists
because the auth flow is its own visual family. Its truth-pass value points
("16 regions / 5 sectors / Free to join", which replaced fabricated 500+/2,000+
stats in TF-003) survive verbatim.

**b. Legal pages are exempt from the dash gate.** `/privacy` carries 18
user-visible em dashes and the standing rule is that legal wording is never
edited. Replacing a dash with a comma IS editing legal wording. The exemption is
explicit rather than silent, and is limited to `src/pages/legal/`. Every other
ported file holds zero. If legal text is ever revised by a lawyer, the revision
should use hyphens, but that is their edit to make, not ours.

**c. `/pricing` is ONE route with an audience-switched view.** Not two routes.
Two routes would split the SEO signal for the term the business most wants to
own, and would contradict 1.14's rejection of audience-as-URL-segment. The
employer view carries the fee table; the seeker view states "free, always"
plainly with what it buys. Both are in the DOM; the toggle switches them via the
same `.emp-only` / `.seek-only` mechanism as the hero (1.11), so the page is
correct with the employer view as the CSS default.

**d. `/for-employers` survives, with a narrower job.** Killing it would break
inbound links, the sitemap entry and the nav's employer-lens destination, and
1.14 forbids changing IA for SEO reasons. But its old content now duplicates the
landing page's employer lens. It is repurposed from "second landing page" to
"what happens after you post": the pitch is cut, and it carries the posting
sequence, what a listing includes, and the pricing link. Overlap removed without
losing the route.

**e. e2e accessible names are frozen.** `signup-flow.spec.ts` and
`prod-smoke.spec.ts` drive `getByRole` with the names "Seeker Find farm work",
"I agree to the Terms" and "Create account". These strings do not change during
the reskin. No spec asserts old-system colours or classes, so the restyle is
otherwise safe.

**f. `NotFound` ports too, though it was out of scope.** It is the destination of
every broken link and the one page a lost visitor is guaranteed to see. Leaving
it on the old system would mean the error surface is the least coherent page on
the site.

**Retirement status after 3a:** `LandingFooter` is deleted (all three consumers
ported). `Nav.tsx` SURVIVES, scoped to `JobSearchLayout` only, because `/jobs` is
3c work. It retires there. A component is deleted when its last consumer ports,
never before.

### 1.16 Rendering strategy: React Router framework mode (v13)

Decided 2026-08-03. The public routes move to React Router 7 **framework mode** with
server rendering for `/jobs/:id`, run as its own stage between the landing port and the
`/jobs` port.

> **CORRECTION, 2026-08-04 (operator). The stated deciding case was wrong. Read this
> before the paragraph it corrects.**
>
> The original rationale below is struck through in effect: **TopFarms does not post
> into Facebook groups.** Facebook groups are where listings are *sourced* — inbound,
> via the lead-harvest pipeline — and nothing about our rendering touches that
> direction. Nobody is sharing `topfarms.co.nz/jobs/<id>` into a group, so "the card
> renders generic" was a defect nobody was ever going to see.
>
> **What actually justifies this stage, and it is the only thing that does: Google
> Jobs.** `JobPosting` JSON-LD on a server-rendered, indexable page is what puts a
> listing in the jobs widget for a search like "dairy farm job waikato". That is a real
> acquisition channel for a job board and it does not depend on social sharing at all.
> Faster and more reliable indexing is a second, smaller benefit: Googlebot does render
> JavaScript, but on a queue and with no guarantee for a new low-authority domain.
>
> **Consequence, stated plainly because it cuts against the decision:** the paragraph
> below rejects client-side JSON-LD on the grounds that "Facebook never executes JS."
> Google does. With Facebook out of the picture that rejection loses most of its force,
> and the cheap alternative was more viable than this section admitted. The stage was
> nevertheless completed and kept — it is built, preview-green, and revertible in one
> commit, so the marginal cost from here is zero and server rendering is still the
> better of the two for the Google Jobs path. **Anyone re-opening this decision should
> argue it on Google Jobs, not on social sharing, and should know the cost was already
> sunk when the premise was corrected.**
>
> Downstream: the `og:image` gap recorded in 1.18e is CLOSED AS NOT NEEDED. Text-only
> link previews are sufficient for the incidental case (a worker sending a mate a link
> on WhatsApp or Messenger), and no other case exists.

**The deciding case is social sharing, not SEO.** Facebook groups are the primary
organic channel for NZ farm hiring, and no social crawler executes JavaScript. Today the
site serves every route as an empty SPA shell (`vercel.json` rewrites everything to
`index.html`), so a job link shared into a Facebook group renders a generic card. The
cheap alternative (client-side JSON-LD plus a sitemap) fixes none of that: Google
eventually executes JS, Facebook never does. Any future proposal to "simplify" back to
the client-only approach on cost grounds is answered by this paragraph: it buys back a
few days of work by giving up the primary organic channel.

Secondary but real: server-rendered `/jobs/:id` carries JobPosting JSON-LD and per-job
og tags in the initial HTML, which is what Google Jobs and every non-Google crawler
actually read.

*(The two paragraphs above are kept verbatim, not edited, so the correction above has
something to correct. "Secondary but real" is now the whole case.)*

**Why framework mode and not alternatives:** the repo is already on `react-router@7.5`
in library mode; framework mode is the same library's designed upgrade path, with a
first-party Vercel preset. Build-time prerender cannot cover `/jobs/:id` (listings
change after build). A hand-rolled edge SSR function for one route is the same benefit
implemented against the framework, with a permanent bespoke render path as the price.

**Precondition, verified 2026-08-03:** RLS already permits anon select on active jobs
(policy "jobs: anon users view active", roles public, cmd SELECT, qual
`status = 'active'`). Loaders read with the anon key; no migration, no policy change.
Note the status value is `active`, not `published`.

**Sequence:** stage 2 lands the landing page port first, then framework mode as its own
stage, then the `/jobs` and `/jobs/:id` port on top of it. The order exists because
framework mode changes where the `/jobs` work lands; porting `/jobs` first would build
it twice.

**Rollback plan (written before the stage starts, on purpose):**

- The stage runs on its own branch cut from `v13-port`. Route modules are added as thin
  wrappers that import the EXISTING page components; no page component moves or changes
  during the migration. The entry-point swap (library `createBrowserRouter` to framework
  entries) is the LAST commit of the stage, not the first.
- Abandoning at any point before the entry swap: delete the branch. Cost to `v13-port`
  is zero because nothing was touched outside the new wrapper files.
- Abandoning after the entry swap: revert that one commit. Library mode resumes with
  identical behaviour because the pages never moved.
- Merge condition: the full Playwright suite green against a preview deploy of the
  framework-mode branch, plus every section 8 gate. If e2e cannot be brought green
  within the stage's budget, the branch parks unmerged and stage 3 proceeds on the SPA
  with the sitemap as the interim discoverability answer. Parking is a recorded outcome,
  not a failure to decide.

**Shipped independently (2026-08-03, `main` commit `a5b3d7b`):** build-time sitemap.
Postbuild script extends the static launch baseline with one url per active job via
anon REST. Fail-soft: any error keeps the static baseline and exits 0, because a
degraded sitemap must never fail a deploy. Needed under every rendering option; its
freshness is deploy-frequency until framework mode gives it a proper route.

### 1.18 Stage 3b decisions: the shape of the migration (v13)

Decided 2026-08-03, during stage 3b step 1. Three structural choices that 1.16 left
open. Each narrows the migration; none changes what ships.

**a. One client-only catch-all, not forty-five route modules.** `src/routes.ts`
declares a module for `/jobs`, `/jobs/:id`, `/jobs/new` and `/jobs/:id/edit`, and sends
every other path to `src/routes/spa.tsx`, which feeds the legacy route table to
`useRoutes` unchanged. The alternative — a wrapper file per route — writes 45 files to
server-render 45 surfaces that no crawler can see, and buys a hydration audit of every
dashboard, wizard and admin table. The catch-all declares `clientLoader` +
`HydrateFallback` with no server `loader`, which is framework mode's supported way to
say "do not server-render this route", so those routes behave byte-for-byte as they do
under the SPA shell today. That satisfies 1.16's "gated routes must not SSR" with a
mechanism rather than a promise.

Promoting a route later is a two-file change: add a module, delete its entry from
`legacyRoutes`. The catch-all is a floor, not a ceiling.

`/jobs/new` and `/jobs/:id/edit` need their own module despite being gated, because
`routes.ts` must claim those paths before `/jobs/:id` does — otherwise "new" matches
`:id` and hits the public job loader. They cannot be served by the catch-all:
`useRoutes` matches relative to the matched route's pathname, which equals the full URL
only under a splat. Their element is the legacy table's entry unchanged.

**The library table's "declare `/jobs/new` before `/jobs/:id`" rule does not carry
over** — framework mode ranks by specificity, not by declaration order.

**Correction, 2026-08-03, after the swap.** This section originally recorded route
ranking as "verified with `matchRoutes`", including `/` → `*`. That verification was
worthless and the claim was wrong. `matchRoutes` on a FLAT array does match `*` against
`/`; the real route tree nests the catch-all under the root layout, where **a splat
child does not match the parent's index position**. The landing page rendered a blank
document — no error, no warning, no console output, and the a11y e2e sweep passed on it
because axe finds nothing to complain about on an empty page. It was caught by driving
the built server and asking what was actually on the page. `routes.ts` now declares an
explicit `index()` onto the same module. Verified against the running server:
`/` → index, `/jobs` → jobs, `/jobs/new` → jobs/new, `/jobs/<uuid>` → jobs/:id,
`/dashboard/employer` → `*`, `/nope` → `*`.

The general lesson, which is §9 of CLAUDE.md restated: a check that does not exercise
the real artefact is not a check. `matchRoutes` on a hand-built array tested my model of
the router, not the router.

**b. `appDirectory` is `src`, not `app`.** One source root. `@/` still resolves,
`tsconfig.app.json`'s `include: ["src"]` is unchanged, no page moved, and `root.tsx` /
`routes.ts` sit beside `main.tsx` instead of in a parallel tree that would have to be
kept in sync with it.

**a-ii. `useRouteError` cannot be called below the catch-all.** `NotFound` used it to
decide between the 404 copy and the error copy, relying on it returning `undefined`
outside an error boundary. In framework mode it THROWS — "can only be used on routes
that contain a unique id" — because the catch-all's descendant table has no route ids,
and that table is where every 404 on the site is rendered. The error is now a prop that
`AppErrorBoundary` passes down. **Any hook that needs a route id is unavailable below
the catch-all**; that is the standing cost of decision (a), and the fix for a future
one is the same: pass it in, or promote the route out of the table.

**c. `/jobs` server-renders without a loader — for now.** `JobSearch` builds its query
from roughly twenty URL parameters across 190 lines. Reproducing that server-side is the
expensive half of this stage, and it buys a board page that crawlers already reach
through the sitemap and that nobody shares into a Facebook group. `/jobs` therefore
server-renders its shell — nav, footer, `h1`, `title`, canonical, og tags — and the
listings arrive client-side as they do today. `/jobs/:id`, the route the stage exists
for, gets the full loader.

This is a deviation from 1.16's "loaders for `/jobs` and `/jobs/:id`", recorded here
rather than done quietly. The loader drops into `src/routes/jobs.tsx` later without
touching anything else. **What is NOT deferred: og tags and JobPosting JSON-LD on
`/jobs/:id`.** Those are the deciding case and they are in the raw HTML or the stage
has failed.

**d. `/jobs/:id` server-renders the LISTING, not a skeleton.** The loader first fetched
only the columns the meta tags needed, which left the raw body reading "Loading
listing" under a JSON-LD block describing a job. That pairing — structured data
asserting content the HTML does not contain — is a documented reason Google rejects a
JobPosting, and it makes the page worthless to every crawler that does not run
JavaScript. The loader now fetches the job, its skills, and the employer verifications
the trust badge is computed from; `JobDetail` takes them as an optional `seed` prop and
skips its loading gate when seeded.

The gate could not simply become "render when the job is present": `authLoading` is
ALWAYS true on the server, because the session resolves in an effect that never runs
there. Hence `!seed?.job && (loading || authLoading)` — unseeded client navigation
behaves exactly as before.

Deliberately NOT seeded: application count and similar jobs (below the fold), match
score and applied state (personal to a signed-in seeker, and correctly absent from an
anonymous server render). The route module keys `JobDetail` on the job id so a
job → job navigation cannot show a previous listing's seed.

**e. Verification used a stub, because seeding prod is forbidden.** Prod has zero
active jobs and section 4 forbids seeding it, so the deciding case was proven against
a throwaway PostgREST stand-in on localhost: real production build, real server bundle,
real `curl`, fabricated row. Confirmed in the raw HTML — `<title>`, `og:title`,
`og:description`, `og:url`, `og:site_name`, `canonical`, the full `JobPosting` JSON-LD,
and the listing text itself, with `Loading listing` absent. Zero console errors and
zero page errors across `/`, `/jobs` and `/jobs/:id` after hydration.

**`og:image`: NOT NEEDED. Closed 2026-08-04, not deferred.** There is no `og:image`
anywhere in the repo and there does not need to be. It was raised as a gap only because
of the social-sharing premise that 1.16's correction retracts — TopFarms does not post
into Facebook groups. A text-only preview is fine for the one case that survives (a
worker sending a mate a link), and Google Jobs reads the JSON-LD, not the card. Do not
commission a 1200×630 asset for this.

**Note on route `meta` exports:** a route's `meta` REPLACES the root's descriptors
rather than merging with them, so site-level tags (`og:site_name`, `twitter:card`) are
restated in each server-rendered route. `canonical` deliberately is not: `index.html`
used to emit `canonical="https://www.topfarms.co.nz/"` on EVERY route, telling crawlers
that each job page was the homepage. Canonical is now per-route, and routes without one
are self-canonical.

**Loader authority is anonymous, deliberately.** The `/jobs/:id` loader uses its own
Supabase client with `persistSession: false` — not `@/lib/supabase`, whose session
persistence and URL detection are browser behaviour with no meaning on a server that
must stay anonymous. Anonymous is also the correct authority: RLS policy
"jobs: anon users view active" returns active listings and nothing else, so a draft or
archived job cannot reach crawlable HTML by construction rather than by a status check
someone might delete.

**f. The harness had to move with the entry.** `vitest.config.ts` no longer merges
`vite.config.ts` — that file now carries `reactRouter()`, which takes over the entry and
expects a route graph, neither of which exists under vitest. Tests only ever needed the
JSX transform and the `@` alias, so `@vitejs/plugin-react` survives as a devDependency
for that reason alone. Playwright's local server was `vite preview`, which serves a
static SPA shell and cannot serve a framework build; it now runs the SAME production
server bundle Vercel runs, via `react-router-serve`. `vercel.json` drops the
`/(.*) → /index.html` rewrite, which would now 404 every route, and `outputDirectory`,
because the Vercel builder assembles `.vercel/output` from `build/` plus the preset's
manifest. The sitemap postbuild writes to `build/client/`, which the builder copies
afterwards.

**Pre-existing, found not caused (2026-08-03):** `npm run lint` fails on `main` — one
error (`react-refresh/only-export-components` on `src/contexts/AudienceContext.tsx`,
which exports both `AudienceProvider` and `useAudience`) and 54 warnings against a
`--max-warnings 46` pin. Measured by running eslint in a clean `main` worktree: 55
problems, 1 error, 54 warnings. CI runs this gate, so **`main`'s lint step is red
independently of stage 3b**, and the warning ratchet has been overshot by 8. Stage 3b
lands at exactly the same numbers. Not fixed here — the error's fix moves `useAudience`
out of the context file, and stage 3b changes rendering only — but it needs its own
commit, because a gate nobody can pass is a gate nobody reads.

### 1.19 Pricing model v3 (2026-08-04)

Decided as a CFO pass with the competitive landscape fetched and verified the same day.
Supersedes the canonical model ("first listing free, then $100 / $150 / $200 per
listing"). Section 1.18 is reserved for the stage 3b entry on its own branch.

**Verified landscape, 2026-08-04.** ZEIL $199 per 30-day job post, TalentSeeker from
$280/month. NZ Farming Jobs $170 Standard and $200 Ultimate, both 60 days, plus a
$800 five-pack; Ultimate's real product is sharing to their NZ Farming and NZ Farming
Jobs Facebook pages. Trade Me Jobs $99 to $809 plus GST across five tiers, 7 to 30
days. SEEK NZ publishes no pricing at all. findmeajob.co.nz runs free listings, $29
one-off featured, $99/month unlimited, with all seeker AI tools free. Farm Source runs
a live board whose posting cost is not publicly stated. The incumbent, Facebook groups
and word of mouth, is $0.

**The model.**

- **Listings are free and unlimited.** Not first-free. No card is ever required to list.
- **Featured listing $99**, dormant at launch, switched on when the median listing
  receives 5 or more applications or the job pages reach 1,000 weekly sessions.
  Featured means top of search, a highlighted card, and inclusion in the matched-seeker
  alert email. It is distribution, not decoration.
- **Placement fees unchanged: $200 under $55k, $400 for $55k to $80k, $800 for $80k
  and above**, title keywords bump up and never down, derived server-side from the
  advertised band. Acknowledged at shortlist through the Option C contact gate,
  invoiced Net 14 on confirmed hire.
- **Every placement fee buys a replacement guarantee, scoped by `contract_type`:**
  permanent 90 days, fixed term 30 days, casual none. One replacement per role, ever.
- **Seekers pay nothing. Absolutely nothing.**

**Why free listings.** Cash costs are roughly $150/month, so "sustainable" is not the
constraint; liquidity is. At cold start a paid listing loses to NZ Farming Jobs at $170
with 40,000 Facebook followers on value, and to Facebook groups at $0 on price. The
forgone listing revenue is bounded (about $1,600/month even at 40 listings/month with a
40% pay rate) and the traffic it suppresses is not. Revenue concentrates downstream
where the differentiation actually is.

**Why the guarantee exists at all.** Collection is the whole game. A self-serve
marketplace cannot see a hire; the employer posts, rings, hires and never marks it
filled. The Option C contact gate already converts "declare your hire" into "pay to get
the phone number", but names are visible and rural New Zealand is small. The guarantee
makes the fee a purchase rather than a toll, which is what moves collection from an
honour-system rate to something worth modelling. Collection rate is the single largest
lever in the model: at 12 hires/month it is the difference between roughly $1,080 and
$3,240 a month.

**Why the guarantee is split by contract type, not flat.** A flat 90 days was the first
draft and it is wrong for seasonal work. Live listings put calf rearing and calving
relief at 7 to 11 weeks, so a 90-day guarantee outlives the job: the worker leaving when
the season ends would trigger a waived fee on the next season's rehire. Sized at the
month-18 base case that leak is $600 to $1,200 a month against $2,970 of placement
revenue, a fifth to two fifths of the line. Ninety days is nevertheless right for
permanent roles, because 90-day trial periods have been available to all New Zealand
employers since 23 December 2023, so the number is already in the employment agreement
the farmer signed. Casual and relief work gets no guarantee, because the window would
outlive most of the jobs.

**Rejected: percentage placement fees.** At a percentage anyone in this ICP would pay,
0.5 to 1 percent, revenue lands at $275 to $1,200 on New Zealand agricultural salaries,
which is the same magnitude as the flat bands already shipped. For that nil gain it
adds a self-declared salary input nobody can audit, an incentive to under-declare
exactly where migrant pay is already sensitive, a larger invoice that makes hiding the
hire more rational, and a formula where the published-pricing position wants a number.
At recruiter percentages, 15 to 20 percent of first-year salary, it is unsellable to a
farmer who currently hires for $0. All downside between two losing endpoints.

**Rejected: a flat 30-day guarantee everywhere.** It closes the seasonal leak but
discards the trial-period alignment on precisely the band where the fee is $800 and the
persuasion is worth the most. The split costs one extra line of published copy and no
additional code, because `contract_type` is already required on every listing.

**Rejected: $10 seeker visibility boost and $10 CV review.** "Workers never pay" is
live on six shipped surfaces. Revenue potential is a few hundred dollars, one-off. The
optics of charging the structurally vulnerable side of the market $10 to be seen, in a
sector where AEWV exploitation is national news, are disqualifying on their own. And
there is no clean line: search prominence IS employer-facing ordering, so any paid
boost either reorders a list an employer reads, which kills "applicants ordered by fit",
or it changes nothing and is a product that does nothing. The CV helper ships free
instead, as an acquisition asset that improves profile completeness and therefore match
quality. A paid seeker tier is deferred behind a real trigger, such as exportable
verified work history for third parties, and is recorded here as considered rather than
planned.

**Rejected: the four-tier listing restructure.** Discussed in chat, never written down,
subsumed by this entry and rejected on the same paid-listing counterfactuals.

**Left deliberately unpriced.** Casual placements stay at the $200 entry band at launch
rather than inventing a fourth number on zero data, and are reviewed against the
trigger below. A $200 fee to unlock a phone number for three days of relief milking is
probably a price nobody pays, and publishing a fee nobody pays corrodes the
published-pricing position as surely as hiding one does. Casual cannot simply be free:
if it were, every employer would list casual to bypass the contact gate.

**Revision triggers.**

| Metric | Threshold | Action |
|---|---|---|
| Hire-declaration rate | Under 30% over a rolling 8 weeks, after the first 10 closes | Fix enforcement mechanics before touching price |
| Featured take-rate, once live | Under 5% of new listings after 12 weeks on sale | Repackage or reprice Featured; check distribution before price |
| Free-listing subsidy | Over 100 listings/month AND under $15 placement revenue per listing | Reintroduce a paid standard tier; the liquidity argument has expired |
| Guarantee claim rate, permanent | Over 20% of permanent placements claim inside 90 days | The matching is not holding. Fix matching, not the guarantee |
| Casual collection rate | Under 10% collected after 20 casual listings | Drop casual placement to $50, or to $0 behind a different gate |

**Publication order, which is not the order these were written.** The decision record
lands first. The product change lands second: `create-payment-intent` must stop charging
for a second listing before any surface says listings are free. The copy lands third,
with or after the product change, never before. Seven surfaces carry "first listing
free" today and all of them go stale together.

---

## 2. Tokens

Values computed against the real surfaces, not estimated. Contrast is the WCAG 2.1
relative luminance ratio.

```css
--cream:#F2EDE1; --cream-2:#EBE5D6; --card:#FBF9F3;
--ink:#141812; --ink-60:#585E51; --ink-40:#61675A;
--green:#123324; --green-2:#0C2419; --green-3:#164029;
--lime:#8CC63F; --lime-2:#A6D95C;
--ochre:#D9A441;      /* on green surfaces only */
--ochre-ink:#8A5E12;  /* on cream and card surfaces only */
--line:#DCD5C4;
```

### The two tokens that changed, and why

`--ink-40` was `#8B9082` and carried text in seven places, all failing. `--ochre` was
used for text on light surfaces as well as dark. Splitting the ochre into two
context-specific tokens is the fix; one token abused across two backgrounds was the bug.

| Token | Surface | Before | After |
|---|---|---:|---:|
| `--ink-40` | `--cream` | 2.80:1 | **5.00:1** |
| `--ink-40` | `--card` | 3.11:1 | **5.55:1** |
| `--ink-40` | `--cream-2` | 2.61:1 | **4.65:1** |
| `--ochre-ink` | `--card` | 2.14:1 | **5.40:1** |
| `--ochre` | `--green` | 6.12:1 | unchanged, still correct |
| `--ochre` | `--green-3` | 5.19:1 | unchanged, still correct |

**Rule: `--ochre` never appears on a light surface. `--ochre-ink` never appears on a dark
one.** Every v10 contrast failure traced to one broken step in the scale, so these two
edits close all of them.

### Focus

```css
:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
/* dark panels override to white */
```

**Never pair this with `outline:none`.** In Tailwind v4 the combination of `outline-none`
and `focus-visible:outline-*` never paints, and the app this comp feeds is on Tailwind v4.
Keyboard-verify any change to focus styling rather than trusting the CSS to be applied.

---

## 3. Rules adopted from the skills

Five rules where a skill and the independent audit reached the same conclusion by
different routes. These carry the most confidence.

| Rule | Source | Independent audit finding |
|---|---|---|
| No filled bar tracks | `taste-skill` 9.F | Values clustered 78 to 96, graphic illegible |
| Ration the middle dot to 1 per line | `taste-skill` 9.F | Not caught by the audit. Verified: 4 dots on the hero strip, 3 in the footer |
| Eyebrow restraint | `taste-skill` 4.7 | The uppercase micro-label was also the element failing contrast |
| Cut the recitation | `no-ai-slop` | The seven item list appeared 4 times, "ordered by how well they fit" 3 times |
| One label per CTA intent | `taste-skill` 4.5 | Six labels served two actions |

### Eyebrow budget

9 sections, so `taste-skill` allows `ceil(9/3) = 3`. v10 had 5 true section eyebrows plus
12 repeated field labels. v11 has exactly three:

1. `Agricultural recruitment` (hero kicker)
2. `Example: how applicants arrive` (panel header)
3. `Your profile` (worker panel header)

Absorbed rather than deleted: "Built around the farm" became an `<h2>`, which also fixed
the heading outline. Restyled to plain sentence case: the sample-score disclaimer and the
pricing sub-line. Deleted outright: the four "match" labels on the role rows, since the
section header already says what the number is.

**The five pricing card labels are the pricing table, not eyebrows. They stay untouched.**

### Action labels

Two classes, four labels, no synonyms for any of them.

**Intent actions, exactly 2.** They declare which side of the marketplace you are on and
route accordingly:

- **`I'm hiring`**
- **`I'm looking for work`**

**Account actions, exactly 2** (added v12). They are authentication and are
audience-neutral:

- **`Join TopFarms`**
- **`Sign in`**

These are different classes. Collapsing them would force either an ambiguous single CTA
or a return to six labels. The account CTA is only unambiguous because the audience
toggle (1.9) says which side the visitor is on.

Retired: "Post a job. First listing free", "Build your profile", "Find work that fits".
A new synonym for any of the four labels is a regression.

**Scope note (resolves a v12 conflict).** The label gate counts action controls: buttons
and standalone CTA links. Destination links inside the audience-scoped nav sets ("Post a
job" on the employer set, "Build a profile" on the seeker set) are navigation, not
action labels. Within a declared audience there is no ambiguity for them to create. They
are allowed only inside the matching nav set, never as page CTAs. Outside those sets the
retired-label rule still applies to them in full.

Navigation (v12): the utility bar carries the toggle on the left and the two account
actions on the right. The nav pill below it keeps the wordmark and three audience-scoped
section links, and nothing else. The intent CTAs live in the hero, the card row and the
closing section, not the nav. v11's two-row mobile nav existed because logo plus both
intent CTAs measured 365px into 322px available; moving intent out of the nav removes
that pressure at the source.

Nav link sets per audience:

| Audience | Links |
|---|---|
| Employer (default) | How it works, Pricing, Post a job |
| Job seeker | How it works, Open roles, Build a profile |

Both sets exist in the DOM. The employer set is the CSS default so the page is correct
without JavaScript; the seeker set is revealed by the toggle.

---

## 4. NOT THIS

Settled. Do not re-propose without new evidence.

- [ ] **Do not delete the 01 / 02 / 03 numerals.** The defect was contrast. See 1.8.
- [ ] **Do not re-advertise the scoring mechanic in card links.** "See how scoring works"
      and every variant is out. See 1.3.
- [ ] **Do not add `picsum.photos` or any placeholder photography.** See 1.2 and 5.
- [ ] **Do not flatten the alternating green panels to a single theme.** See 1.6.
- [ ] **Do not add testimonials, customer logos, user counts or case studies.** None
      exist. Proposing them is proposing content, not design. Any fix that depends on
      them is BLOCKED until the content is real.
- [ ] **Do not promote "The right person applied. You just never found them." into the
      hero.** It is the stronger line and it is employer-only. Promoting it would undo
      the two-sided balance. See 6.
- [ ] **Do not reintroduce a personal numeric score on any worker-facing surface.** See 1.4.
- [ ] **Do not cut "Every applicant stays on the list, ordered by fit. You decide who to
      ring."** See 1.5.
- [ ] **Do not use `--ochre` on a light surface or `--ochre-ink` on a dark one.** See 2.
- [ ] **Do not pair `outline:none` with `focus-visible:outline-*`.** See 2.
- [ ] **Do not remove the audience toggle as a simplification.** It is load-bearing for
      the account CTA (1.9) and, since v13, for the hero headline (1.11).
- [ ] **Do not centre the wordmark.** It stays left. The nav is asymmetric by design and
      the wordmark depends on the left position for weight. Centring copies a surface
      detail from a page whose structure was already rejected.
- [ ] **Do not promote search into the hero.** Search is a secondary entry point at the
      head of Open roles. See 1.13.
- [ ] **Do not remove the pricing claim line when moving the pricing table.** The table
      moves; the position does not. See 1.12.
- [ ] **Do not add a category chip row.** Same emptiness problem as a search-first hero,
      and a commodity pattern besides. See 1.13 and Test 3.
- [ ] **Do not add any social proof line.** "Join thousands of job seekers" is proof
      ZEIL has and TopFarms does not. Blocked until the numbers are real, same as
      testimonials and logos.
- [ ] **Do not seed the production database.** Local and preview only, demo-labelled if
      shown on prod. See 1.15.
- [ ] **Do not re-propose /signin, /join, /post or /profile as routes.** The repo's
      names win; the mapping is in 1.14.
- [ ] **Do not remove the counter credibility gate** (`MIN_CREDIBLE` in
      `CountersSection`). See 1.15.

### Pricing (added 1.19, 2026-08-04)

- [ ] **Do not charge workers anything, for anything, at any price point.** Not $10,
      not $1, not a boost, not a CV review. See 1.19.
- [ ] **Do not price placement as a percentage of salary.** Bands are the model. The
      reasons in 1.19 are structural and do not expire with scale.
- [ ] **Do not sell Featured before its trigger fires.** Selling prominence on an empty
      board is 1.15's counter-credibility failure with an invoice attached.
- [ ] **Do not put any price behind "contact us".** If a price cannot be published, the
      product does not ship. The model can change; the transparency cannot.
- [ ] **Do not let any paid product reorder an employer's applicant list.** Ordering is
      by fit, or the integrity claim comes off every surface first. See 1.19 and 1.4.
- [ ] **Do not offer a guarantee longer than the job.** Guarantee windows are scoped by
      `contract_type`; a seasonal role must never carry a window that outlives it.

---

## 5. Image slots

The page ships with no photography by design (1.2). These are the placements a shoot
would fill, marked in the HTML as labelled comments. None are placeholder images.

| Slot | Placement | Ratio | What it needs to be |
|---|---|---|---|
| `hero-context` | Behind or beside the hero card | 16:9, 2400px wide | A real working scene. Yards, a shed, a race, at the hour the work actually happens. Not golden-hour landscape |
| `role-sector` | Open roles section, one per sector | 4:3, 1200px | Livestock, cropping, machinery, farm ops, management. Equipment and stock, not portraits |
| `worker-life` | Worker split, beside the profile panel | 3:4, 1200px | Housing, a road home, a family kitchen. The thing the roster and the house are actually for |
| `og-card` | Social share meta | 1200x630 | Currently absent. `og:image` is deliberately omitted rather than faked |

**Shoot brief in one line:** real TopFarms farms, real consented people, mid-task not
posed, overcast acceptable, no stock, no models, no drone hero shots.

Until then: `og:image` stays out of the head, and every slot stays an HTML comment. An
empty slot is honest. A `picsum` seed is not.

---

## 6. Open tests

Logged, not actioned. Insufficient traffic to run either.

### Test 1: hero headline (first to run once there is volume)

| Variant | Headline | Risk |
|---|---|---|
| A (current) | "The right match, both ways." | "Both ways" is a claim every two-sided marketplace makes |
| B | "The right person applied. You just never found them." | Sharper and more specific, but employer-only. Would undo two-sided balance |

Do not resolve this by argument. It is an A/B question. Until it can be run, A ships.

### Test 2: nav CTA weight

Superseded by v12: the audience toggle gives the worker path a chrome element the same
size as the employer's (1.9). Replaced by measuring toggle usage against hero button
usage, split by audience, once analytics exist.

### Test 3: homepage search (decision recorded, will be re-proposed)

**Partially superseded 2026-08-03 by 1.13:** with seeded preview inventory or real
listings, search returns as a SECONDARY entry point at the head of Open roles. What
survives of this entry unchanged: search never replaces the hero, and the category chip
row stays out. The paragraphs below are kept as the reasoning of record.

Not an A/B test. A decision with a revisit trigger, recorded because search will be
re-proposed every time someone benchmarks the category.

Search is a liquidity pattern. It only works when the answer to a query is "here are
forty jobs". TopFarms has effectively zero live listings, so a homepage search box
converts a curious visitor into someone who now knows the marketplace is empty. That is
the same failure as the zero counter deleted in v1, with more steps.

Second cost: a search-first hero is the most commodity hero in the category. Every job
board has one. Adopting it means replacing the match panel, the only genuinely novel
element on the page (1.1), with the most copied pattern in the sector.

The category chip row fails the same way: it is an inventory pattern, and clicking a
chip on an empty marketplace proves the emptiness.

**Revisit trigger:** enough live listings that a typical query returns a useful result.
Not before, and not because a competitor has one.

---

## 7. Exploration brief

Two questions, runnable by any model against this directive. Outputs are diffable because
the tokens, type stack and constraints are fixed here.

**Constraints that apply to both:** tokens from section 2 verbatim. Archivo plus
Bricolage Grotesque, no substitutions. Zero photography. Zero em dashes and en dashes.
Everything in section 4 still applies.

### Question 1: four hero compositions

Two on "The right match, both ways." Two on "The right person applied. You just never
found them." Same tokens, same type stack, no photography.

For each: state the composition anchor, keep the hero to at most 4 text elements, keep
subtext at or under 20 words, and keep the primary CTA visible without scrolling. The
left-text / right-image arrangement is the current one, so at least two of the four must
use a different anchor.

### Question 2: three treatments for differentiating the five green panels

Section 1.6 sets the current rule: three product surfaces, one flat commercial surface,
one finer-ruled closing surface. Propose three alternative systems. Each must be a stated
rule that assigns every one of the five panels, not a set of one-off treatments, and each
must survive a sixth panel being added later.

Deliver as one horizontal image per option, labelled, following
`imagegen-frontend-web` section 5. Note that image generation requires the FLUX connector
to be authenticated; it is not currently.

---

## 8. Verification gates

A change is done when these produce the stated output, not when the task is ticked.

| Gate | Command or check | Pass condition |
|---|---|---|
| Contrast | Compute ratio for every text selector against its composited background | Every value at or above 4.5:1, or 3:1 for text 24px and over |
| Dashes | `grep -c $'—\|–' topfarms-v11.html` | `0` |
| Dots | Middle dots per line | At most 1 |
| Eyebrows | Count elements with `text-transform:uppercase` and font-size at or under 15px above section content | At most 3 section eyebrows |
| No-JS | Load with JavaScript disabled | Full page renders, not hero plus footer |
| Overflow | `scrollWidth === clientWidth` at 390, 768, 1024, 1440, 1920 | True at all five |
| Measure | Approximate characters per line for every paragraph | At or under 70ch |
| Outline | Heading sequence | No level skipped, one `h1` |
| Focus | Tab through every interactive element | Visible ring on all, on both light and dark surfaces |
| Motion | `prefers-reduced-motion: reduce` | No transition, no animation, no auto-rotation |
| Action labels | Count distinct action-control labels | Exactly 2 intent labels and exactly 2 account labels, no synonyms. Audience-scoped nav destination links excluded per section 3 scope note |
| Toggle | Tab to it, activate with keyboard, reload | Operable by keyboard, state exposed via `aria-pressed`, choice persists across reload |
| No-JS nav | Load with JavaScript disabled | Both nav link sets in the DOM, employer set visible, seeker set hidden |

### v13 port gates (apply per stage, reported per stage)

| Gate | Command or check | Pass condition |
|---|---|---|
| Dead links | Crawl every `href` and `to=` on every ported page | Zero elements resolving to `#` or a route that renders NotFound |
| Headline | Load landing with JavaScript disabled | Both headline strings in the DOM, employer string visible |
| All-routes design | Run the contrast, dash, eyebrow and measure gates on every ported route | Every route passes, not only the landing page. Auth, empty, loading and error states included |
| Repo gates | `npx tsc -b` && `npx vitest run` && the Playwright suite that covers the touched surface | All green. `tsc --noEmit` is not a substitute (project references mask strict errors) |
| States | Per ported component: loading, empty, error, authed, suspended where applicable | Each state renders in the new system; none fell back to the old one or to nothing |
| Stage coherence | Visual pass over the stage's whole surface | No page shows both systems at once. A stage that cannot claim this does not merge |
| Prod safety | Branch + preview deploy | Nothing merges to `main` until every gate above passes on every ported route |
