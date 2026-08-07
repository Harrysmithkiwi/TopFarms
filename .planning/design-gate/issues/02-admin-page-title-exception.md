# Admin page titles contradict the declared type ramp

Type: grilling
Status: resolved

## Question

`docs/DESIGN.md:201` assigns **Headline (600, 36/44)** to "Page titles, major section headers.
One per screen." Every admin screen ships its page title at **20px** via
`AdminPageHeader.tsx:31-36` — all 11 of them, consistently.

Assessment A raised this unprompted as a canon disagreement rather than a finding: the shipped
consistency is right for a dense internal tool, and 36px page titles would make the admin
portal shout.

Decide: **record an admin exception in `docs/DESIGN.md`** (page titles are Title 20/28 on
gated-portal tooling; Headline is for marketing and public surfaces), or **change the 11
screens** to match the ramp as written.

If neither happens, every future audit files a correctly-consistent choice as drift — which
is exactly the noise the gate exists to remove.

Note the constraint from the brief: additions go **inline in existing sections**; the
six-section structure of `docs/DESIGN.md` is fixed.

## Answer

Resolved 2026-08-07. **The recommendation I gave before checking was wrong, and the evidence
killed it.** I proposed "record an admin exception". Measuring first showed there is no single
gated-portal value to except *from*:

| Surface | Ships | Treatment |
|---|---|---|
| Admin, 11 screens (`AdminPageHeader.tsx:32`) | **20px** | `text-text` |
| Employer/seeker dashboards, 10 | **30px** (`text-3xl`) | `font-display`, `text-brand-900` |
| Onboarding, 2 | **24px** (`text-2xl`) | `font-display` |
| Canon (`:201` Headline) | 36px | — |

**Three page-title sizes across the gated portals, two colour treatments, none of them the
declared Headline.** "Record an admin exception" would have blessed one of three inconsistent
values and left the other two undocumented — precisely the drift the gate exists to catch.

### Ruling

**Admin's 20px is declared correct**, as Title 20/28, for dense internal tooling. It is
consistent across all 11 screens, it is right for the surface, and 36px page titles would make
an operator console shout. `docs/DESIGN.md` §3 now carries a page-title-by-surface-class table
saying so.

**Employer and seeker are recorded as a finding, not blessed and not restyled.** Their tier is
[ruled separately](11-portal-page-title-tier.md). Snapping twelve customer-facing pages from
30px to 36px is a visible change to real users' screens and does not belong in a typography
reconciliation pass — that is the kind of thing that gets smuggled in and noticed in prod.

### Delivered

`docs/DESIGN.md` §3 — page-title-by-surface-class table, inline in the existing Hierarchy
section per the brief's constraint. No code change: admin already ships the declared value.
