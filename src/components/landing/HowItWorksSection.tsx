import { useState } from 'react'
import {
  ClipboardList,
  Handshake,
  type LucideIcon,
  Megaphone,
  Search,
  Sprout,
  Star,
  Target,
  UserRound,
} from 'lucide-react'

type Tab = 'seeker' | 'employer'

interface Step {
  number: number
  icon: LucideIcon
  title: string
  description: string
}

const seekerSteps: Step[] = [
  {
    number: 1,
    icon: UserRound,
    title: 'Create Profile',
    description:
      "Tell us your experience, skills, and what you're looking for in your next farm role.",
  },
  {
    number: 2,
    icon: Target,
    title: 'Get Matched',
    description:
      'Our AI scores your profile against active listings based on skills, location, and preferences.',
  },
  {
    number: 3,
    icon: ClipboardList,
    title: 'Apply',
    description: 'Apply to roles that suit you with a single click. Your profile does the talking.',
  },
  {
    number: 4,
    icon: Sprout,
    title: 'Start Working',
    description: 'Get hired and start your new farm adventure. We help every step of the way.',
  },
]

const employerSteps: Step[] = [
  {
    number: 1,
    icon: Megaphone,
    title: 'Post a Job',
    description:
      'List your role with agriculture-specific details: shed type, herd size, accommodation, and more.',
  },
  {
    number: 2,
    icon: Search,
    title: 'Review Matches',
    description:
      'We surface pre-scored candidates ranked by fit. No more wading through unsuitable CVs.',
  },
  {
    number: 3,
    icon: Star,
    title: 'Shortlist',
    description:
      'Mark your favourites, unlock contact details, and move candidates through your pipeline.',
  },
  {
    number: 4,
    icon: Handshake,
    title: 'Hire',
    description:
      // audit D8: no messaging UI exists — shortlisting releases contact details.
      'Contact candidates, check their verified profiles, and confirm your hire directly on the platform.',
  },
]

const tabs: { value: Tab; label: string }[] = [
  { value: 'seeker', label: 'Farm Workers' },
  { value: 'employer', label: 'Farm Employers' },
]

export function HowItWorksSection() {
  const [activeTab, setActiveTab] = useState<Tab>('seeker')

  const steps = activeTab === 'seeker' ? seekerSteps : employerSteps

  return (
    <section className="px-4 py-20 bg-bg">
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-8 bg-brand" />
          <p
            className="text-xs font-bold tracking-widest uppercase text-brand-700"
          >
            How It Works
          </p>
        </div>

        {/* Title */}
        <h2
          className="font-display mb-10 text-4xl font-bold md:text-5xl text-brand-900"
        >
          Your Path to the{' '}
          <em className="text-brand-700 italic">Perfect Match</em>
        </h2>

        {/* Tab toggle */}
        <div
          className="mb-12 inline-flex rounded-full p-1 bg-border"
          role="tablist"
          aria-label="Choose your path"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={activeTab === t.value}
              onClick={() => setActiveTab(t.value)}
              className="rounded-full px-5 py-2 text-sm font-semibold transition-all"
              style={
                activeTab === t.value
                  ? {
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-brand-700)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-muted)',
                    }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line (desktop only, not on last card) */}
              {index < steps.length - 1 && (
                <div
                  className="bg-border border-border absolute top-8 left-full z-0 hidden h-px w-full border-t-2 border-dashed lg:block"
                  // calc()/left have no utility equivalent; colour is on classes.
                  style={{ width: 'calc(100% - 64px)', left: '80%' }}
                  aria-hidden="true"
                />
              )}

              <div
                className="bg-surface border border-border relative z-10 h-full rounded-2xl p-6"
              >
                {/* Faded step number — decorative watermark, hidden from a11y tree (TF-020).
                    data-decorative marks it for the axe exclusion in tests/e2e/a11y.spec.ts:
                    WCAG 1.4.3 exempts purely decorative text, which axe cannot infer. */}
                <p
                  className="font-display mb-4 text-6xl leading-none font-bold select-none text-border"
                  aria-hidden="true"
                  data-decorative="watermark"
                >
                  {String(step.number).padStart(2, '0')}
                </p>

                {/* Icon */}
                <div className="mb-3">
                  <step.icon
                    className="h-6 w-6 text-brand-700"
                    aria-hidden="true"
                  />
                </div>

                {/* Title */}
                <h3
                  className="font-display mb-2 text-lg font-bold text-brand-900"
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
