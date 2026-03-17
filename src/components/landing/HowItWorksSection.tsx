import { useState } from 'react'

type Tab = 'seeker' | 'employer'

interface Step {
  number: number
  icon: string
  title: string
  description: string
}

const seekerSteps: Step[] = [
  {
    number: 1,
    icon: '👤',
    title: 'Create Profile',
    description: 'Tell us your experience, skills, and what you\'re looking for in your next farm role.',
  },
  {
    number: 2,
    icon: '🎯',
    title: 'Get Matched',
    description: 'Our AI scores your profile against active listings based on skills, location, and preferences.',
  },
  {
    number: 3,
    icon: '📋',
    title: 'Apply',
    description: 'Apply to roles that suit you with a single click. Your profile does the talking.',
  },
  {
    number: 4,
    icon: '🌿',
    title: 'Start Working',
    description: 'Get hired and start your new farm adventure. We help every step of the way.',
  },
]

const employerSteps: Step[] = [
  {
    number: 1,
    icon: '📢',
    title: 'Post a Job',
    description: 'List your role with agriculture-specific details: shed type, herd size, accommodation, and more.',
  },
  {
    number: 2,
    icon: '🔍',
    title: 'Review Matches',
    description: 'We surface pre-scored candidates ranked by fit. No more wading through unsuitable CVs.',
  },
  {
    number: 3,
    icon: '⭐',
    title: 'Shortlist',
    description: 'Mark your favourites, unlock contact details, and move candidates through your pipeline.',
  },
  {
    number: 4,
    icon: '🤝',
    title: 'Hire',
    description: 'Confirm your hire directly on the platform. Simple, transparent placement fee on success.',
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
    <section className="py-20 px-4" style={{ backgroundColor: 'var(--color-cream)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-px" style={{ backgroundColor: 'var(--color-meadow)' }} />
          <p
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: 'var(--color-meadow)' }}
          >
            How It Works
          </p>
        </div>

        {/* Title */}
        <h2
          className="font-display font-bold text-4xl md:text-5xl mb-10"
          style={{ color: 'var(--color-soil)' }}
        >
          Your Path to the{' '}
          <em style={{ color: 'var(--color-moss)', fontStyle: 'italic' }}>Perfect Match</em>
        </h2>

        {/* Tab toggle */}
        <div
          className="inline-flex rounded-full p-1 mb-12"
          role="tablist"
          aria-label="Choose your path"
          style={{ backgroundColor: 'var(--color-fog)' }}
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={activeTab === t.value}
              onClick={() => setActiveTab(t.value)}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
              style={
                activeTab === t.value
                  ? {
                      backgroundColor: 'var(--color-white)',
                      color: 'var(--color-moss)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: 'var(--color-mid)',
                    }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line (desktop only, not on last card) */}
              {index < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-8 left-full w-full h-px z-0"
                  style={{
                    width: 'calc(100% - 64px)',
                    left: '80%',
                    backgroundColor: 'var(--color-fog)',
                    borderTop: '2px dashed var(--color-fog)',
                  }}
                  aria-hidden="true"
                />
              )}

              <div
                className="relative z-10 rounded-2xl p-6 h-full"
                style={{
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-fog)',
                }}
              >
                {/* Faded step number */}
                <p
                  className="font-display font-bold text-6xl leading-none mb-4 select-none"
                  style={{ color: 'var(--color-fog)' }}
                >
                  {String(step.number).padStart(2, '0')}
                </p>

                {/* Icon */}
                <div className="text-2xl mb-3">{step.icon}</div>

                {/* Title */}
                <h3
                  className="font-display font-bold text-lg mb-2"
                  style={{ color: 'var(--color-soil)' }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mid)' }}>
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
