# TopFarms GTM — Skills Adoption

*2026-07-02 · Shortlist closed. Base = 5 installed Corey Haines skills. Plus one goose skill (carousel) for a named gap. Everything else cut.*

## The rule for every adopted skill

**Fork as `topfarms-*`, strip US spelling + banned words, bind to the canonical constraint file. Steal scaffolding, replace tone.** Skills consume the voice; they never re-derive it (**no `brand-voice-extractor`**).

- **Copy skills** bind to `docs/_canonical/TopFarms_Outreach_Reply_Config.md` (voice + hard rules) **and** the Playbook word-lists (below) as constraints.
- **The carousel skill** binds to `docs/_canonical/Brand_and_Design.md` as a **hard visual constraint** (Inter · `#16A34A` · `#FAFBF9` · no gradients / no glassmorphism / no drop shadows · real farm photos only), exactly the way copy skills bind to the voice config.

### The word-lists every copy skill must load

- **Use freely:** shed · herd · calving · lambing · tailing · milking · rotary · herringbone · AEWV · accredited · RD · the farm · the team · your patch · sorted · straight up · NZ-built · real · fair · direct.
- **Never use:** talent · talent pool · ecosystem · world-class · disrupt · revolutionise · leverage · seamless · frictionless · journey · solutions · end-to-end · holistic · scalable · synergy · empower employers · unlock · harness. Plus: **no em dashes, ever.**

## The base — 5 Corey Haines skills (already installed)

| Skill | Used for | Bound to |
|---|---|---|
| **cold-email** | employer email / Seek / Trade Me sequences | voice config + word-lists |
| **social** | LinkedIn founder posts, FB/social content | voice config + word-lists |
| **copywriting** | landing sections, signup-page copy, offer framing | voice config + word-lists |
| **copy-editing** | polish + strip banned words / US spelling before send | voice config + word-lists |
| **customer-research** | ICP refinement from who-replies data, VOC from group posts | voice config |

## The one goose skill adopted — named gap: visual carousels

- **`create-html-carousel`** (GooseWorks, MIT) → fork as **`topfarms-carousel`**.
- **Gap it fills:** none of the 5 Corey skills produce visual/graphic assets, and the content calendar leans on carousels (why-FB-hiring-is-hard, match-scoring, regional split, employer offer, visa-specific).
- **Why safe:** local HTML/CSS + Puppeteer render, no phone-home, no paid provider, MIT.
- **Binding:** hard visual constraint = `Brand_and_Design.md` tokens (above). Real farm photos only.
- **Packaging rule:** **copy the `SKILL.md` from GitHub — never run `npx gooseworks install`** (keeps you off their CLI, credential store, proxy, MCP).

## Everything else — cut, and why

- **All other goose skills:** either redundant with the 5 Corey skills, or they are the paid-scraping/enrichment infra (`lead-generation/`, `monitoring/` + `social/` scrapers, Apollo/Apify/fal.ai/Higgsfield) that violates the admin-only-Firecrawl stance.
- **`brand-voice-extractor`:** cut — the voice already exists in the config; do not re-derive it.
- **The Playbook's other named skills** (threads-carousel, Remotion, reddit/youtube research): out of the closed shortlist. Remotion stays a *separate* production tool (video), not a "skill" adoption; revisit if/when the video lane is built.
