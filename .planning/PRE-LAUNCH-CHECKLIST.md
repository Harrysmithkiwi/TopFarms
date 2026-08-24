# Pre-launch checklist — TopFarms

Written 2026-08-21. Score at time of writing: **72/100** (honest eight-dimension re-walk, not
the summed tracker). Engineering ceiling is ~81; the rest needs a market.

**Rule for this file:** a box is ticked when its **pass criterion** is met, not when the task
feels done. If a check fails, write what happened next to it rather than unticking silently.

Legend — **[O]** operator only · **[C]** Claude can do it · **[M]** needs the market

---

## A. Already proven — do not re-do

Recorded so nobody spends a morning re-testing these.

- [x] **Signup verification link works** — path-based token, proven E2E on live prod, and you
      walked employer signup yourself (2026-08-21).
- [x] **All 5 auth email templates** carry `{{ .TokenHash }}`, branded, read back from live config.
- [x] **Employer onboarding step 2** no longer fails on an empty INZ date.
- [x] **CI green on `main`**, 1,074 tests, `tsc -b` 0, lint 0 errors at the 52-warning pin.
- [x] **Sentry names the user** — probe fired on prod, event `9004f77c…`, envelope carried
      `user.id` + `environment: production`.
- [x] **0 advisor ERRORs**; the 12 deny-by-default tables now have two layers and comments.
- [x] **`/jobs`, `/for-employers`, `/pricing` in one design world**, verified 1440 + 390.

---

## B. Must pass before the first tranche goes out

The recipient-facing path. If any of these fails, a real farmer hits it.

### B1 · The employer journey, end to end [O]
- [ ] Sign up fresh as an employer from `/signup?role=employer` on a **phone**, not desktop.
- [ ] Complete all 8 onboarding steps. **Leave every optional number blank** — herd size,
      property size, team size, salary.
- [ ] Publish a job. **Pass:** it appears on `/jobs` within a minute and is visible in a
      logged-out browser.
- [ ] **Pass:** in the DB, the blanks you left are `NULL`, not `0`.
      → `select herd_size, property_size_ha, team_size, salary_min from employer_profiles;`
      This is the match-corruption fix; it has never been verified against a real form submit.
- [ ] Close the tab mid-wizard, come back, resume. **Pass:** no data lost, no error screen.

### B2 · The seeker journey [O]
- [ ] Sign up as a seeker on a phone. Complete onboarding, leave optional numbers blank.
- [ ] **Pass:** `years_experience` and `min_salary` are `NULL`, not `0`.
- [ ] Apply to the job from B1. **Pass:** it appears in the employer's applicant list.
- [ ] **Pass:** the seeker is never shown a numeric match score anywhere (directive 1.4).

### B3 · Match scoring sanity [C, once B1+B2 exist]
- [ ] **Pass:** a match score exists for the B1 job × B2 seeker pair, and the breakdown reads
      sensibly. Specifically check the salary and experience factors score **neutral**, not 8/8
      or 0/8 — that was the bug.

### B4 · Password reset [O]
- [ ] Request a reset, click the delivered link. **Pass:** you can set a new password and log
      in with it. (Mechanically proven, never walked by a human.)

### B5 · Legal pages [C] — DONE 2026-08-24
- [x] Port `legal/` to v12. **Pass met:** `LegalLayout` now uses `Display` (Cormorant
      Garamond, `fern-900`), the `bark` body ramp and `fern-700` links. The legal TEXT was
      not touched, and 1.17b still exempts these pages from the zero-dash gate.
- [x] **Pass met:** both reachable from `ShellFooter`, rendered and eyeballed at 1440 and 390.
- Found while looking: Cormorant ships **old-style figures**, so `/terms` rendered
  "1. What TopFarms is" with the numeral below the baseline, reading as a lowercase letter.
  Fixed with `lining-nums` on the h2. It would have shipped unnoticed without the render.
- Gates: `tsc -b` 0 · lint 0 errors / 52 warnings (pin holds) · 1,074 tests · build 0 ·
  design-gate 16/17.

### B6 · Deliverability warm-up [O]
- [ ] Send tranche 1 (**10–15 max**, drafts in `.planning/outreach/TRANCHE-01-DRAFT.md`).
- [ ] **Hold 24 hours.** Do not send tranche 2 first.
- [ ] **Pass:** bounce rate under 5%, at least one message confirmed in an inbox not spam.
- [ ] Mark every send with `admin_lead_mark_contacted` / `admin_outreach_mark_sent`.

---

## C. Must pass before you take money

- [ ] **Stripe end to end** [M] — shortlist a real applicant, confirm a hire, invoice fires,
      invoice is paid. **Pass:** money lands and `placements` has the row.
      *Never processed a real transaction. This is the single least-tested path in the product.*
- [ ] **The placement fee shown matches the fee invoiced** [C] — `pricing-parity.test.ts` guards
      the client against the server, but no real invoice has ever proven it.
- [ ] **Replacement guarantee** [O] — you can explain and honour the 90/30-day terms if asked.

---

## D. Operator-owned, do these when convenient

- [ ] **Wire the Sentry MCP** so issues can be read in-session instead of screenshotted.
- [ ] **Decide the `main` branch rule** — solo review is unsatisfiable, so every merge is
      currently logged as an `--admin` bypass. Either drop the review requirement or accept it.
- [ ] **Rule on the design-system board** (see the review artifact): photography vs the shipped
      SVG, and whether Satoshi replaces Inter in the portals. Both contradict something already
      written down.
- [ ] **Rename two misleading files** — `TopFarms latest landing page .html` is the *oldest*,
      and `TopFarms Landing html.html` is an 859 KB JS bundle, not readable HTML.

---

## E. First-run risks — things that have never executed in production

Flagged because "it's built" and "it has run" are different states.

- [ ] **Seeker lead lane (B4 in the work order)** — paste **ONE** post first. **Pass:** confidence
      > 0 and Terms present, before any bulk paste.
- [ ] **Job expiry at 30 days** — no listing has ever aged out.
- [ ] **`notify-job-matches`** to a real seeker — only ever fired in rehearsal.
- [ ] **`notify-job-filled`** — the duplicate-send guard (102) has never run on real data.
- [ ] **Document upload + employer view** — the storage-path ownership trigger (099) has never
      seen a real file.

---

## F. Do not launch if any of these is true

- ❌ A verification email delivers a broken link.
- ❌ An employer can complete onboarding but their job does not appear on `/jobs`.
- ❌ Blank number fields are storing `0`.
- ❌ Bounce rate over 5% after tranche 1.
- ❌ Any public route renders in the old design world. *(closed 2026-08-24 — none left.)*
- ❌ `get_advisors(security)` shows an ERROR.

---

## Scoring reference

| Dimension | Wt | Now | Full marks needs |
|---|---|---|---|
| Core journey | 25 | 19 | Real employer + real seeker complete the loop unassisted |
| Data layer & security | 15 | 14 | The 89 definer-function WARNs triaged |
| Engineering discipline | 15 | 14 | The `--admin` merge bypass resolved |
| Observability | 10 | 9 | Sentry readable in-session |
| Email deliverability | 10 | 7 | A real tranche delivered, inbox not spam |
| Marketing surface | 10 | 8 | artwork (parked by operator) — `legal/` ported 2026-08-24 |
| Demand-side | 10 | 1 | ≥10 contacted, ≥1 reply |
| Revenue proven | 5 | 1 | One invoice paid |
| **Total** | **100** | **73** | |
