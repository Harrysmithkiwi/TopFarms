import { PublicShell } from '@/components/shell/PublicShell'
import {
  V12Hero,
  V14FeatureStrip,
  V12Recruitment,
  V12SplitCards,
  V12Sectors,
  V12Close,
} from '@/components/landing/v12/V12Sections'
import { V12Roles } from '@/components/landing/v12/V12Roles'

// v14 landing (docs/design/MARKETING-DESIGN.md), superseding the v12 illustrated world.
// Operator comp: docs/design/design-reference/Landing pages /TopFarms landing page final
// draft.png (2026-08-24), brief-pinned.
//
// THESIS — Marketing and product are one material now. The comp's palette IS the portal
// system (one green around #16A34A, Inter, near-white canvas), so a farmer sees the same
// world before and after signing up, and the hero can honestly preview the product in the
// product's own tokens instead of illustrating around it.
//
// STORY — The visitor reads one line, sees the actual job board on the right, picks their
// side of the fork ("Find work" / "Post a job", the only two labels on the page), and
// lands on /jobs or the employer signup with the role already chosen.
//
// MINIMAL (2026-08-24, operator's call: clean and minimalist, no photography). The page
// previously stated the two-audience fork TWICE in two card layouts. It now states it once,
// in the version carrying real product UI. No illustration, no photography, no tinted
// close panel: type, hairlines and two actions.
//
// V12Roles is live-data and renders its honest empty state while prod holds zero active
// jobs (directive 1.15, carried forward). Counters, testimonials and logo walls stay OUT:
// no real volume, no consented names.

export function Home() {
  return (
    <PublicShell>
      <V12Hero />
      <V14FeatureStrip />
      <V12Recruitment />
      <V12Roles />
      <V12SplitCards />
      <V12Sectors />
      <V12Close />
    </PublicShell>
  )
}
