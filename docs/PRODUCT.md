# Product

## Register

product

## Users

**Two-sided NZ farm labour marketplace.**

- **Employers**: Dairy farm owners, sheep/beef operators, farm managers across New Zealand. Practical, time-poor, operationally sceptical of slick "tech bro" products. Spend their working day in tools like Xero, LIC MINDA, FarmIQ, Halter, Gallagher. Review applicants on phone after evening milking. Value Kiwi authenticity and decisions they can defend to a farm advisor.
- **Seekers**: Farm workers, relief milkers, equipment operators, seasonal workers. Often on mobile, often on older Android devices on rural-NZ data. Some are visa-holders for whom English is a second language. Value clear information and no bullshit. Use TopFarms because Facebook groups + word-of-mouth are too slow and too noisy.

The product mediates a direct-pay marketplace (employers pay placement fee on hire, seekers free), so the chrome must visibly earn employer trust without cheapening the seeker experience.

## Product Purpose

TopFarms is an AI-powered farm labour marketplace for New Zealand. It replaces the current default channels (Facebook groups, word-of-mouth, recruitment agencies taking 15–25% of first-year salary) with a faster, more transparent way to match farm employers and farm workers.

**Success looks like**: a Kiwi dairy farmer post-milking on a Tuesday evening uses TopFarms to review applicants the same way they use Xero to check the books — without thinking about the tool, just doing the job. The product becomes the default channel for NZ farm hiring within 2 years of launch.

## Brand Personality

**Confident · grounded · clear.**

Voice that of a respected farm advisor — knows the sector, gives straight answers, doesn't waste your time, doesn't pretend to be a farmer when they're not. Warmth comes through content (real farms, real workers, NZ-specific terminology), never through chrome (no sepia filters, no rustic-shed clichés, no rolling-hills-at-sunset gradients).

## Anti-references

Specifically NOT to look like:

- **Generic B2B SaaS** — Salesforce, Monday, HubSpot. Bloated CTAs, glassmorphism, purple/blue gradients, "innovative platform" hero copy.
- **Craft-beer / artisan-food aesthetics** — sepia, cream backgrounds, editorial serif display fonts, "from the soil to your plate" warmth-via-chrome.
- **Stock agricultural branding** — green-gradients-over-rolling-hills, drone-overhead cliches, smiling-farmer-with-arms-crossed stock photos.
- **Notion / overly-minimal** — ultra-light type weights, whitespace-as-luxury. Farmers value information density not airiness.
- **Slick tech-bro startup** — purple/pink gradients, wave animations, "leveraging AI to revolutionise" copy.

The visual register to aim for instead: Linear, Stripe, Vercel (light mode), Xero, Halter, FarmIQ — confident clarity, single accent, near-white backgrounds, density done right.

## Design Principles

1. **Anti-chrome paranoia.** Are we leaning on chrome to do work content should do? Does any surface look like it could be for any SaaS product? Is there anything that would feel out of place in a Kiwi farmer's daily workflow alongside Xero and MINDA? If the answer to any of these is yes, the surface is failing — even if every v2 token is correctly applied. The chrome (Inter, hex palette, single-green) is settled and deliberate. Audit and critique passes focus exclusively on whether the chrome is getting out of the way of the content, not on whether the chrome itself is "perfect."

2. **Authentic via content, not chrome.** Warmth and Kiwi-ness come from real farm photos, real job counts, real NZ-specific copy ("8/2 roster", "relief milking", "calf-rearing season"). Never from sepia filters, cream backgrounds, or rustic decorative elements. If a surface feels generic, fix the content not the chrome.

3. **Show, don't tell.** Product screenshots beat marketing illustrations. Live counters beat "thousands of farmers" copy. Real match percentages beat "AI-powered matching" buzzwords. Defensible numbers always beat aspirational adjectives.

4. **Plain English always.** No "leverage / synergise / unlock". AI explanations in farmer-friendly sentences ("We rank candidates by how well their shed experience, location, and accommodation needs match your job"). Voice pinned in Brand Spec §7 — apply consistently.

5. **Trust via clarity.** Verification badges, match-score math, placement-fee structure, contact-release mechanism — all explicit, defensible, and inspectable. Trust is earned by showing the working, not by polished chrome.

## Accessibility & Inclusion

- **WCAG AA minimum** (Brand Spec §10). Verify any custom contrast pairing. `--text` on `--bg` = 17.8:1 (AAA). `--brand` on white = 4.5:1 (AA exact).
- **44×44 tap targets** on mobile (seeker primary device). Brand Spec §10 enforced.
- **Focus rings always present** — 2px `--brand` outline, 2px offset. Never removed.
- **prefers-reduced-motion: reduce** respected on every animation (Brand Spec §10).
- **Form labels above fields**, never placeholder-as-label.
- **Icons with meaningful semantics** carry `aria-label` or adjacent text.

Audience-specific: many seekers are on older Android devices on rural-NZ data — pages must not require JS-heavy hero animations to be functional. Many seekers are second-language English speakers — copy must be plain English (Principle 4 reinforces this).

## Operative documents

- **Authoritative brand spec**: `.planning/v2-migration/TopFarms_Brand_Spec_v2.md`
- **Migration audit (Phase 0–6 plan)**: `.planning/v2-migration/TopFarms_Migration_Audit.md`
- **Empirical baseline (V1_CLEAN scan)**: `SENSE_CHECK_AUDIT_2026-05-01.md` (repo root)

When `/impeccable audit` or `/impeccable critique` finds a token-level issue, defer to the brand spec. When they find a content-level issue, apply Design Principle 1 (anti-chrome paranoia) — fix the content, not the chrome.
