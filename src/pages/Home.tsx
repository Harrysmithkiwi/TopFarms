import { Nav } from '@/components/layout/Nav'
import { HeroSection } from '@/components/landing/HeroSection'
import { CountersSection } from '@/components/landing/CountersSection'
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
      <CountersSection />
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
