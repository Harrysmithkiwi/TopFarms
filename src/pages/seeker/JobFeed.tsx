import { MatchScoreRing } from '@/components/ui/MatchScoreRing'
import { SkillBar } from '@/components/ui/SkillBar'
import { Chip } from '@/components/ui/Chip'

// Standalone mobile-portrait Job Feed screen (design-system import:
// "Seeker · Job Feed"). Built on the v2 design tokens with mock data; wire to
// the real seeker profile + matched-jobs query in a follow-up pass.

interface MatchedJob {
  id: string
  title: string
  farm: string
  chips: string[]
  salary: string
  score: number
}

const profile = {
  name: 'Aroha',
  summary: 'Herd Manager · Waikato · 5 yrs',
  fit: 92,
  skills: [
    { name: 'Herd Management', value: 90 },
    { name: 'Rotary & AMS sheds', value: 82 },
  ],
}

const jobs: MatchedJob[] = [
  {
    id: '1',
    title: 'Dairy Farm Manager',
    farm: 'Riverbend Dairy · Waikato',
    chips: ['Dairy', 'Rotary shed', 'Accommodation'],
    salary: '$85k – $95k /yr',
    score: 94,
  },
  {
    id: '2',
    title: 'Herd Manager',
    farm: 'Clearwater Farms · Canterbury',
    chips: ['Dairy', 'Herringbone', 'AEWV'],
    salary: '$78k – $86k /yr',
    score: 88,
  },
  {
    id: '3',
    title: 'Relief Milker',
    farm: 'Southern Pastures · Southland',
    chips: ['Dairy', 'Couple position'],
    salary: '$65k – $72k /yr',
    score: 81,
  },
]

function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          data-anim="logo-leaf"
          d="M3 21C3 12 9 5 21 3C19 13 13 19 3 21Z"
          style={{ fill: 'color-mix(in srgb, var(--color-brand) 62%, white)' }}
        />
        <path
          d="M6.5 17.5C9 13 13 8.5 17 6"
          fill="none"
          stroke="var(--color-brand-900)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight text-text-on-brand">TopFarms</span>
    </span>
  )
}

export function JobFeed() {
  return (
    <div className="flex min-h-screen justify-center bg-surface-2">
      <div className="flex min-h-screen w-full max-w-[390px] flex-col bg-bg">
        {/* App bar */}
        <header className="flex items-center justify-between bg-brand-900 px-[18px] py-3.5">
          <BrandMark />
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
            A
          </span>
        </header>

        <div className="flex flex-col gap-4 p-5">
          {/* Profile + match ring */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <MatchScoreRing score={profile.fit} variant="score" size={84} label="Profile fit" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[19px] font-bold tracking-tight text-text">
                  Kia ora, {profile.name}
                </p>
                <p className="mt-0.5 text-[13px] text-text-muted">{profile.summary}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-[9px]">
              {profile.skills.map((s) => (
                <SkillBar key={s.name} name={s.name} value={s.value} />
              ))}
            </div>
          </section>

          {/* Feed label */}
          <div className="mt-0.5 flex items-baseline justify-between">
            <h2 className="text-[16px] font-bold text-text">Matched for you</h2>
            <span className="font-mono text-[13px] tabular-nums text-text-muted">
              {jobs.length} jobs
            </span>
          </div>

          {/* Job cards */}
          {jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-text">{job.title}</h3>
                  <p className="mt-0.5 text-[13px] text-text-muted">{job.farm}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {job.chips.map((chip) => (
                      <Chip key={chip}>{chip}</Chip>
                    ))}
                  </div>
                  <p className="mt-2.5 font-mono text-[13px] tabular-nums text-text">{job.salary}</p>
                </div>
                <MatchScoreRing score={job.score} variant="badge" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
