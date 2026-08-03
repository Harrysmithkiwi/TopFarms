import { PublicShell } from '@/components/shell/PublicShell'
import { HeroSection } from '@/components/landing/HeroSection'
import { CardRowSection } from '@/components/landing/CardRowSection'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { MatchBandSection } from '@/components/landing/MatchBandSection'
import { OpenRolesSection } from '@/components/landing/OpenRolesSection'
import { WorkerSplitSection } from '@/components/landing/WorkerSplitSection'
import { StepsSection } from '@/components/landing/StepsSection'
import { PricingClaimSection } from '@/components/landing/PricingClaimSection'
import { CountersSection } from '@/components/landing/CountersSection'
import { CloseSection } from '@/components/landing/CloseSection'

// v13 landing (stage 2 of the port, docs/design/v11-DIRECTIVE.md). Section
// order follows the comp; PublicShell provides utility bar, nav, footer and
// the audience lens. CountersSection is DORMANT (renders null below credible
// volume) and stays mounted so the credibility gate survives (1.15).
// TestimonialsSection + TrustedByStrip stay out (truth pass 2026-07-08):
// re-add only with real, per-name-consented content. See REMEDIATION-LOG.md.

export function Home() {
  return (
    <PublicShell>
      <HeroSection />
      <CardRowSection />
      <ProblemSection />
      <MatchBandSection />
      <OpenRolesSection />
      <WorkerSplitSection />
      <StepsSection />
      <PricingClaimSection />
      <CountersSection />
      <CloseSection />
      <div className="pb-4" />
    </PublicShell>
  )
}
