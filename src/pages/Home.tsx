import { Nav } from '@/components/layout/Nav'
import { HeroSection } from '@/components/landing/HeroSection'
import { CountersSection } from '@/components/landing/CountersSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { FeaturedListings } from '@/components/landing/FeaturedListings'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Nav />
      <HeroSection />
      <CountersSection />
      <HowItWorksSection />
      <FeaturedListings />
      <TestimonialsSection />
      <LandingFooter />
    </div>
  )
}
