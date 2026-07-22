import { Nav } from '@/components/layout/Nav'
import { HeroSection } from '@/components/landing/HeroSection'
import { CountersSection } from '@/components/landing/CountersSection'
import { AIMatchingSection } from '@/components/landing/AIMatchingSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { FarmTypesStrip } from '@/components/landing/FarmTypesStrip'
import { FeaturedListings } from '@/components/landing/FeaturedListings'
import { EmployerCTABand } from '@/components/landing/EmployerCTABand'
import { FinalCTASection } from '@/components/landing/FinalCTASection'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
      <main>
        <HeroSection />
        <CountersSection />
        <AIMatchingSection />
        <HowItWorksSection />
        <FarmTypesStrip />
        <FeaturedListings />
        <EmployerCTABand />
        {/* TestimonialsSection + TrustedByStrip removed 2026-07-08 (truth pass):
            fabricated testimonials/stats and real brands falsely implied as customers.
            Re-add only with real, per-name-consented content — see REMEDIATION-LOG.md. */}
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
