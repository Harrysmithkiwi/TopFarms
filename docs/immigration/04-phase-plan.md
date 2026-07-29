# Phase plan — Immigration & overseas-worker support

**Phase goal:** make TopFarms the trusted place where NZ farm employers who can hire overseas workers
meet migrant job-seekers, with a safe clerical/admin spine around the visa process — *without* crossing
the immigration-advice line. Off-GSD-roadmap (like the leads workstream); shipped in atomic PR slices.

**Guiding principle:** rails not advice (see [`02-legal-line.md`](02-legal-line.md)). Every slice below is
in the IALA safe zone unless marked **⚠ GATED** (needs a lawyer/LIA sign-off before build).

## Sequenced slices

### Slice 0 — Register feasibility spike ✅ DONE (2026-07-29)
**Result: GO.** The form calls a JSON endpoint — `POST https://www.immigration.govt.nz/list-api/getAPIResults/`
(`multipart/form-data`: `query`=name/NZBN, `collection`=2, `page`=1) returning `employerName`, `tradingName`,
`nzbn`, `expiryDateOfAccreditation` per match. So the badge can show accreditation **status + expiry**, keyed by
NZBN, from a server-side edge-function call. **One risk for Slice 2:** the site is behind Imperva/Incapsula bot
protection — handle with correct headers / low volume, or fall back to a periodic OIA snapshot. Absence = "unverified".

### Slice 1 — Data foundation *(no-regret; needed by 2 & 3)*
Schema (nullable, additive):
- `employer_profiles`: `nzbn`, `accreditation_status` (accredited/unverified/not_found), `accreditation_checked_at`, `accreditation_type` (if the form returns it).
- Seeker profile: `visa_status` (nz_citizen_resident / whv / needs_aewv / other), optional `visa_expiry`.
- Job/role: `visa_support` — which visa(s) a role can support (none / whv / aewv / peak_seasonal), and whether the employer will sponsor.
RLS + admin-visible. No UI beyond capture. **Safe.**

### Slice 2 — Verified Accredited Employer badge *(flagship, anti-scam)*
Edge function `accreditation-check` (NZBN → INZ lookup → status + checked_at, stored on employer; re-check
job on a schedule). "Checked against INZ's public list on [date]" badge in the marketplace + admin. Absence =
"unverified", never "unaccredited". **Safe** (public info + matching).

### Slice 3 — Visa-aware matching
Seekers declare visa status; employers show accreditation + role visa-support; surface + filter ("employers
who can sponsor", "roles supporting AEWV / open to WHV"). Pure marketplace data. **Safe.**

### Slice 4 — Document checklist + secure-upload spine
Generic, INZ-sourced checklists per visa step (same list for everyone); clerical secure upload (reuse
Supabase Storage + RLS + `FileDropzone`). Status tracking with published INZ processing times. **Safe (clerical)** —
no eligibility verdicts; each item links its INZ source.

### Slice 5 — "Find a licensed adviser" directory + hand-off
Mirror/link the IAA public register; referral hooks from any point a user needs advice. **Safe (explicitly
blessed)** + the monetisation/partnership bridge.

### Slice 6 — Settlement resources
Housing / schools / banking / IRD pointers for arriving migrants. **Safe (exempt carve-out).**

### Later — INTEGRATE (safe, when the spine exists)
KYC identity (APLYiD) for anti-scam verification; e-signature (DocuSign) for employment agreements;
employment-agreement generator from MBIE's clause library.

### ⚠ GATED — do NOT build without a NZ lawyer/LIA sign-off
- Any **eligibility "you qualify" output** (visa recommender).
- Any **AI chatbot that personalises** visa answers. If built, constrain to cited public-info retrieval with hard refusals on personalised questions.

## Recommended order & first buildable slice
**Slice 0 → 1 → 2 → 3** is the seeker-trust spine — highest leverage, lowest risk, ties to the cold-start
(accredited employers are a lead segment). **Slice 1 (data foundation)** is the first no-regret code slice and
needs no external decision. Slices 4–6 layer the admin spine; the advice bridge (5) is where an LIA partnership plugs in.

## Operator decisions needed before/at each fork
1. **Which half first** — seeker-trust spine (0→1→2→3, recommended) or employer accreditation tooling.
2. **The advice bridge** — directory-only referral, formal **LIA partnership**, or in-house LIA. (Revenue line + safe way to help with judgment calls.)
3. **A lawyer/LIA reviewer** for the borderline features (eligibility/calculator/chatbot) before those ship.
4. **Register access** — on-demand scrape (fast) vs OIA periodic snapshot (compliance-safe) vs both.
5. **Segments** — dairy first (clear visa map + Green List hook) or pastoral/sheep-&-beef too (AEWV-only).

## Verify-live before user-facing figures
All INZ fees; exact Green List dairy time-in-role & pay threshold; any sheep-&-beef Green List role; official
median-wage multiples. Lawyer/LIA sign-off on anything near the advice line.
