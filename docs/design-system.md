# TopFarms Design System

Paste this as context into any generative UI tool (v0, Google Stitch, Figma, etc.) when building screens.

## Typography

| Role | Font | Usage |
|------|------|-------|
| Headings / Display | **Fraunces** (serif) | All headings, match score numbers, large display text |
| Body / UI | **DM Sans** (sans-serif) | Body copy, labels, buttons, navigation, form fields |

Google Fonts:
- `Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400`
- `DM+Sans:wght@300;400;500;600`

## Colour Palette

```css
:root {
  --soil: #2C1A0E;       /* Primary dark — nav, hero sections */
  --soil-deep: #1E1108;  /* Deepest dark — hero backgrounds, footer */
  --moss: #2D5016;       /* Primary green — buttons, headings, match circles (high) */
  --fern: #4A7C2F;       /* Secondary green — hover states, icons */
  --meadow: #7AAF3F;     /* Accent green — highlights, logo leaf, live indicators */
  --hay: #D4A843;        /* Amber — warnings, featured badges, hay-tier actions */
  --hay-lt: #FFF8E7;     /* Amber light — hay background tints */
  --cream: #F7F2E8;      /* Page background */
  --fog: #EEE8DC;        /* Borders, dividers, card outlines */
  --mist: #F2EEE6;       /* Input backgrounds, subtle fills */
  --ink: #1A1208;        /* Primary text */
  --mid: #6B5D4A;        /* Secondary text */
  --light: #9E8E78;      /* Tertiary text, placeholders */
  --white: #FFFFFF;      /* Card backgrounds */
  --red: #C0392B;        /* Errors, match circles (low <60%) */
  --red-lt: #FDF0EE;     /* Error backgrounds */
  --blue: #1A5276;       /* Info states, verified badges */
  --blue-lt: #EAF4FB;    /* Info backgrounds */
  --orange: #E67E22;     /* Match circles (mid 60-79%), warnings */
  --orange-lt: #FEF5EC;  /* Warning backgrounds */
  --purple: #6C3483;     /* AI insight boxes, growth-phase labels */
  --purple-lt: #F5EEF8;  /* AI insight backgrounds */
  --green-lt: #EAF5EA;   /* Success/confirmation backgrounds */
}
```

## Navigation Bar

- Background: `--soil`, height: 56px, sticky top
- Logo: Fraunces 20px, "TopFarms" with `--meadow` leaf prefix
- Nav links: DM Sans 12px 600, cream at 50% opacity, active = full cream + rgba white bg pill
- Bottom border: `rgba(255,255,255,.06)`

## Cards

- Background: `--white`
- Border: `1.5px solid var(--fog)`
- Border radius: 12px
- Padding: 20px
- Hover: `translateY(-1px)` + subtle shadow

## Buttons

| Variant | Background | Text | Hover |
|---------|-----------|------|-------|
| `btn-primary` | `--moss` | white | `--fern` |
| `btn-outline` | white | `--moss` (border + text) | — |
| `btn-ghost` | transparent | `--mid` (`--fog` border) | darken border |
| `btn-hay` | `--hay` | `--soil` | — |

All buttons: DM Sans 13px 700, border-radius 8px, transition 0.2s.

## Match Score Circles

| Range | Background | Border | Text |
|-------|-----------|--------|------|
| >= 80% (high) | `rgba(45,80,22,.08)` | `rgba(45,80,22,.2)` | `--moss` |
| 60-79% (mid) | `--orange-lt` | `--orange` | `--orange` |
| < 60% (low) | `--red-lt` | `--red` | `--red` |

Number font: Fraunces 700. Sizes: 38px (card), 50px (search), 72px (detail).

## Tags / Chips

| Variant | Background | Text | Usage |
|---------|-----------|------|-------|
| `tag-green` | `rgba(--moss, 7%)` | `--moss` | Farm type, shed type, experience |
| `tag-hay` | `--hay-lt` | `#7A5C00` | Accommodation, perks, housing |
| `tag-blue` | `--blue-lt` | `--blue` | Qualifications, verified, info |
| `tag-grey` | `--mist` | `--mid` | General, eligibility, neutral |
| `tag-orange` | `--orange-lt` | `--orange` | Partial match, warnings |
| `tag-purple` | `--purple-lt` | `--purple` | AI features |
| `tag-red` | `--red-lt` | `--red` | Warnings, not matched |

## Form Inputs

- Border: `1.5px solid var(--fog)`, border-radius 8px
- Focus: `border-color: var(--fern)` + `box-shadow: 0 0 0 3px rgba(74,124,47,.08)`
- Placeholder: `--light`
- Font: DM Sans 13px

## Info Boxes

| Variant | Background | Title colour | Usage |
|---------|-----------|-------------|-------|
| `ib-blue` | `--blue-lt` | blue | Informational |
| `ib-hay` | `--hay-lt` | `#7A5C00` | Warning |
| `ib-green` | `rgba(--moss, 6%)` | moss | Success |
| `ib-purple` | `--purple-lt` | purple | AI insights |
| `ib-red` | `--red-lt` | red | Errors |

## AI Insight Boxes

- Background: `--purple-lt`
- Border: `1.5px solid rgba(108,52,131,.15)`
- Header: purple text, small caps eyebrow ("AI" badge)

## Auth Layout (Login, Signup, etc.)

**Desktop:** Two-column split — left 50-60% (soil bg with gradient, dot pattern) / right 40-50% (cream bg, form)
- Left panel: soil-deep gradient, TopFarms logo (Fraunces 24px, hay), headline (4-5xl, Fraunces, cream), 3-column stats footer
- Right panel: centered content, max-w-md

**Mobile:** Left panel hidden, full-width cream bg with centered logo above form.

## Screen Reference

Each screen has an interactive HTML wireframe and a written spec:

| Screen | Wireframe | Spec Section |
|--------|-----------|-------------|
| Landing Page | `TopFarms_Launch_Pack/wireframes/TopFarms_Landing_Page.html` | WIREFRAME_SPECS.md or WIREFRAME_SPECS_FULL.md |
| Login / Signup | (uses Auth Layout above) | WIREFRAME_SPECS.md Section 1-3 |
| Employer Onboarding | `TopFarms_Launch_Pack/wireframes/TopFarms_Employer_Onboarding.html` | WIREFRAME_SPECS.md Section 5 |
| Post Job | `TopFarms_Launch_Pack/wireframes/TopFarms_Employer_Job_Posting_Form.html` | WIREFRAME_SPECS.md Section 6 |
| Seeker Onboarding | `TopFarms_Launch_Pack/wireframes/topfarms_seeker_onboarding.html` | WIREFRAME_SPECS.md Section 7 |
| Job Search | `TopFarms_Launch_Pack/wireframes/TopFarms_Worker_Job_Search_v2.html` | WIREFRAME_SPECS.md Section 8 |
| Job Detail | `TopFarms_Launch_Pack/wireframes/TopFarms_Job_Detail_Page.html` | WIREFRAME_SPECS.md Section 9 |
| Applicant Dashboard | `TopFarms_Launch_Pack/wireframes/topfarms_applicant_dashboard.html` | WIREFRAME_SPECS.md Section 10 |
| My Applications | `TopFarms_Launch_Pack/wireframes/TopFarms_Worker_Application_View.html` | WIREFRAME_SPECS.md Section 11 |
| Messaging | `TopFarms_Launch_Pack/wireframes/TopFarms_Messaging.html` | Out of scope for MVP |

## Workflow for Generative UI Tools

1. Paste this entire file as your "style guide" context
2. Open the HTML wireframe for your target screen in a browser, screenshot it
3. Copy the relevant section from `TopFarms_Launch_Pack/WIREFRAME_SPECS_FULL.md`
4. Feed screenshot + spec text to the tool
