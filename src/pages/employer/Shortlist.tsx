import { ShortlistRow } from '@/components/ui/ShortlistRow'

// Standalone mobile-portrait Shortlist screen (design-system import:
// "Employer · Shortlist"). Built on the v2 design tokens with mock data; wire to
// the real job posting + ranked applicants query in a follow-up pass.

interface Candidate {
  id: string
  name: string
  role: string
  skills: string[]
  score: number
}

const job = {
  title: 'Dairy Farm Manager',
  meta: 'Riverbend Dairy · Waikato · Permanent',
  applicants: 14,
  shortlisted: 3,
  topMatch: 92,
}

const worthCalling: Candidate[] = [
  {
    id: '1',
    name: 'Alex R.',
    role: 'Dairy Farm Manager · Waikato',
    skills: ['Herd Management', 'Rotary shed', '5 yrs'],
    score: 92,
  },
  {
    id: '2',
    name: 'Jordan M.',
    role: 'Herd Manager · Bay of Plenty',
    skills: ['Pasture', 'Herringbone', '3 yrs'],
    score: 85,
  },
  {
    id: '3',
    name: 'Sam T.',
    role: 'Relief Milker · Waikato',
    skills: ['Milking', 'AMS', '2 yrs'],
    score: 81,
  },
]

const rest: Candidate[] = [
  {
    id: '4',
    name: 'Pat L.',
    role: 'Dairy Assistant · Canterbury',
    skills: ['Milking', '1 yr'],
    score: 68,
  },
  {
    id: '5',
    name: 'Casey W.',
    role: 'Trainee · Southland',
    skills: ['Fencing', 'New'],
    score: 54,
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

function DarkStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2.5">
      <div className="text-[22px] font-bold tracking-tight text-white tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold tracking-[0.08em] text-white/50 uppercase">
        {label}
      </div>
    </div>
  )
}

export function Shortlist() {
  return (
    <div className="flex min-h-screen justify-center bg-surface-2">
      <div className="flex min-h-screen w-full max-w-[390px] flex-col bg-bg">
        {/* App bar */}
        <header className="flex items-center justify-between bg-brand-900 px-[18px] py-3.5">
          <BrandMark />
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
            H
          </span>
        </header>

        {/* Job context band */}
        <section className="bg-brand-900 px-[18px] pt-1 pb-[22px]">
          <span className="text-[10px] font-bold tracking-[0.14em] text-brand uppercase">
            Your job posting
          </span>
          <h1 className="mt-2 text-[22px] leading-[1.15] font-bold tracking-tight text-white">
            {job.title}
          </h1>
          <p className="mt-1 text-[13px] text-white/70">{job.meta}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <DarkStat value={String(job.applicants)} label="Applicants" />
            <DarkStat value={String(job.shortlisted)} label="Shortlisted" />
            <DarkStat value={`${job.topMatch}%`} label="Top match" />
          </div>
        </section>

        <div className="flex flex-col gap-3 p-5">
          {/* "Three worth calling" */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-brand uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Three worth calling
            </span>
            <p className="mt-1.5 mb-1 text-[13px] leading-snug text-text-muted">
              Ranked by Match Score on shed type, region, accommodation and skills.
            </p>
          </div>

          {worthCalling.map((c) => (
            <ShortlistRow
              key={c.id}
              name={c.name}
              role={c.role}
              skills={c.skills}
              score={c.score}
              top
            />
          ))}

          <div className="mt-3 mb-1 h-px bg-border" />
          <span className="text-[11px] font-semibold tracking-[0.06em] text-text-subtle uppercase">
            {job.applicants - worthCalling.length} more applicants
          </span>

          {rest.map((c) => (
            <ShortlistRow key={c.id} name={c.name} role={c.role} skills={c.skills} score={c.score} />
          ))}
        </div>
      </div>
    </div>
  )
}
