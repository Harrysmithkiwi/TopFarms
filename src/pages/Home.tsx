import { PublicShell } from '@/components/shell/PublicShell'
import { V12Hero, V12AudienceCards, V12Recruitment, V12Banner, V12SplitCards, V12Sectors, V12Why, V12Close } from '@/components/landing/v12/V12Sections'
import { V12Roles } from '@/components/landing/v12/V12Roles'

// v12 landing (docs/design/v12-DIRECTIVE.md), superseding the v13 port of v11.
//
// THESIS — The page owns one idea: a visitor is either hiring or looking, and the page asks
// which before it says anything else. It refuses the category default this replaced, a dark
// product-panel hero explaining a matching algorithm to a farmer who has not yet decided the
// site is for them.
//
// OWN-WORLD — An illustrated New Zealand paddock drawn in the same fern ramp as the
// interface, so scene and chrome are one material. Cormorant Garamond display over Inter
// body, pill actions, 16px card radius, white cards on linen with art bleeding off their
// right edge. Recognisable with every word removed.
//
// STORY — The visitor sees a farm they know, understands within one line that this is NZ
// agricultural hiring, picks their side of the fork, and lands on /jobs or the employer
// signup with the role already chosen.
//
// FIRST VIEWPORT — Full-bleed pastoral scene; centred serif headline over the quiet upper
// sky; one-sentence subhead; two pill actions side by side, "Find work" filled and "Hire
// staff" on white; a quiet "Browse jobs" beneath. The two audience cards ride up over the
// scene's lower edge on a negative margin.
//
// FORM — Operator-supplied comp (docs/design/design-reference/topfarming landing concept
// 3.png), brief-pinned; no direction roll, per new-work.md ("a user- or brief-pinned
// direction beats the roll, always").
//
// Sections follow the comp's order exactly. V12Roles is live-data and renders its honest
// empty state while prod holds zero active jobs (directive 1.15, carried forward).
// CountersSection, TestimonialsSection and TrustedByStrip stay OUT for the same reason they
// were out of v13: no real volume, no consented names.

export function Home() {
  return (
    <PublicShell>
      <V12Hero />
      <V12AudienceCards />
      <V12Recruitment />
      <V12Roles />
      <V12Banner />
      <V12SplitCards />
      <V12Sectors />
      <V12Why />
      <V12Close />
    </PublicShell>
  )
}
