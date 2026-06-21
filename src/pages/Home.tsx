import { Nav } from '@/components/layout/Nav'
import { HeroSection } from '@/components/landing/HeroSection'
// CountersSection (live DB counters) is retained in the codebase and intentionally
// not rendered pre-launch — it would show ~0 jobs until real listings land. Swapped
// for CapabilitiesSection (no numbers). Wire CountersSection back in here once there
// is genuine traction. See CapabilitiesSection.tsx header.
import { CapabilitiesSection } from '@/components/landing/CapabilitiesSection'
import { AIMatchingSection } from '@/components/landing/AIMatchingSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { FarmTypesStrip } from '@/components/landing/FarmTypesStrip'
import { FeaturedListings } from '@/components/landing/FeaturedListings'
import { EmployerCTABand } from '@/components/landing/EmployerCTABand'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { TrustedByStrip } from '@/components/landing/TrustedByStrip'
import { FinalCTASection } from '@/components/landing/FinalCTASection'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
      <HeroSection />
      <CapabilitiesSection />
      <AIMatchingSection />
      <HowItWorksSection />
      <FarmTypesStrip />
      <FeaturedListings />
      <EmployerCTABand />
      <TestimonialsSection />
      <TrustedByStrip />
      <FinalCTASection />
      <LandingFooter />
    </div>
  )
}
