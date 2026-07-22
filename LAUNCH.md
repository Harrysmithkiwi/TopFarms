# LAUNCH.md — TopFarms Launch Readiness Backlog

Source of truth for launch readiness. An item is ticked ONLY when fixed **and** independently verified on production (evidence linked). Findings reference `UAT_MASTER_REPORT.md`.

**Current score: 62/100 → target ≥ 90/100.**

## 🔴 Launch blockers (engineering-owned)

- [ ] **B1. Privacy Policy page** (TF-001) — real `/privacy` route + NZ Privacy Act 2020-appropriate content. _Content drafted by engineering; flag for legal review before public marketing push._
- [ ] **B2. Terms of Service page** (TF-001) — real `/terms` route + content. _Same legal-review flag._
- [ ] **B3. Custom 404 + router errorElement** (TF-002) — catch-all `*` route, branded NotFound, `errorElement` so the React Router dev screen can never render.
- [ ] **B4. Signup consent links** (TF-012) — "Terms of Service" / "Privacy Policy" in the consent row become real links (new tab).
- [ ] **B5. Remove fabricated stats — sector counts** (TF-003) — `FarmTypesStrip.tsx` hardcoded 12/8/5/3/4.
- [ ] **B6. Remove fabricated stats — auth panel** (TF-003/TF-013) — `AuthLayout.tsx` "500+ / 2,000+ / 16 regions".
- [ ] **B7. Remove fabricated stats — PostJob step 1** (TF-003) — `JobStep1Basics.tsx` "500+".
- [ ] **B8. Honest copy — "hundreds of farms"** (TF-003) — `/for-employers` CTA line.
- [ ] **B9. Demo panels marked as examples** (TF-004) — Home "Your Top Matches" / "Your Dashboard" mock panels get an explicit Example label.
- [ ] **B10. Favicon** (TF-005) — replace `vite.svg` with TopFarms mark.
- [ ] **B11. Per-route titles + meta description + OG tags** (TF-005).
- [ ] **B12. robots.txt + sitemap.xml as real static files** (TF-021).
- [ ] **B13. Password policy** (TF-010) — block weak passwords at the form (min 10 + strength gate).
- [ ] **B14. Leaked-password protection ON** (TF-011) — Supabase Auth setting. _If MCP/management API can't reach it: operator toggle, documented below._
- [ ] **B15. Landing CTAs point at signup, not protected onboarding** (TF-004/UX) — `/onboarding/*` CTAs on Home → `/signup?role=…`.

## 🟠 High (engineering-owned)

- [ ] **H1. Footer dead links** (TF-006) — remove "Help Center"/"About" until pages exist.
- [ ] **H2. Jobs empty-state** (TF-007) — true empty-marketplace copy when no filters set; default sort "Most Recent" for logged-out users.
- [ ] **H3. `<main>` landmark** (TF-019) — Home + marketing pages.
- [ ] **H4. Color-contrast failures** (TF-020) — 14 nodes on Home (eyebrow labels, selected tab, watermarks aria-hidden).
- [ ] **H5. `aria-expanded` on mobile menu** (TF-009).
- [ ] **H6. Job-id UUID validation** (TF-008) — no 400s from `/jobs/:id` garbage ids.
- [ ] **H7. `marketplace_employer_profiles` → security_invoker** (TF-014) — migration.
- [ ] **H8. Restrict `get_user_role` from anon** (TF-015) — migration.

## 🟢 Verification (E2E with UAT accounts)

- [ ] **V1. UAT accounts provisioned** — employer, seeker, admin; email-confirmed; credentials documented in this file.
- [ ] **V2. Employer journey** — onboarding → company profile → post job → edit → publish → applicants → shortlist/reject → archive → logout/login.
- [ ] **V3. Seeker journey** — onboarding → profile/resume → search → filter → save → apply → withdraw → settings → logout.
- [ ] **V4. Admin journey** — login → employers/seekers/jobs lists → document queue → analytics → moderation actions → audit log.
- [ ] **V5. Seeded realistic NZ agri data** — ≥6 active jobs across dairy/sheep&beef/hort/viti/arable, applications, skills.
- [ ] **V6. Regression pass on marketing + auth after all fixes deployed.**
- [ ] **V7. Post-fix Lighthouse** — a11y ≥ 95 with contrast fixed, SEO ≥ 95.

## ⚪ Human-owned (not blocking engineering completion)

- [ ] **O1. Legal review of Privacy/Terms content** (engineering ships reviewed-quality draft; sign-off is a business action).
- [ ] **O2. Purge/keep decision on pre-existing test data** (TF-018) — 6 legacy users, 3 test jobs, lead-staging rows. Purge is destructive; operator call on timing.
- [ ] **O3. Marketplace cold-start** — seed real listings/outreach before marketing push.
- [ ] **O4. `pg_trgm` schema move (TF-017), deny-all docs (TF-016)** — post-launch hardening batch.

## UAT accounts

_To be filled when V1 completes._

| Role | Email | Password | Status |
|---|---|---|---|

## Evidence log

_Links appended as items are verified._
