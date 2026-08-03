import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { useAudience, type Audience } from '@/contexts/AudienceContext'

// v13 shell (directive 1.9, 1.14): audience toggle left, account actions right.
// This is a PRE-AUTH surface: it renders nothing when a session exists, because
// the session role then owns the audience and the account actions are moot.
// Labels are the directive's two account actions verbatim -- no synonyms.
// "Join TopFarms" carries ?role= from the current audience so signup lands
// pre-selected (the repo's existing /signup?role= convention, directive 1.14).

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'seeker', label: 'Job seeker' },
  { value: 'employer', label: 'Employer' },
]

export function UtilityBar() {
  const { session } = useAuth()
  const { audience, setAudience } = useAudience()

  if (session) return null

  return (
    <div className="border-line bg-cream border-b">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-1 px-3 py-1 sm:px-5">
        <div
          className="bg-cream-2 border-line flex gap-0.5 rounded-full border p-0.5"
          role="group"
          aria-label="Browsing as"
        >
          {AUDIENCES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={audience === value}
              onClick={() => setAudience(value)}
              className={[
                // px-2.5 at base: measured at 390, px-3 overflowed the row by 2px
                'min-h-11 cursor-pointer rounded-full px-2.5 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm',
                audience === value
                  ? 'bg-green text-white'
                  : 'text-ink-60 hover:text-ink bg-transparent',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <Link
            to="/login"
            className="text-ink hover:text-green inline-flex min-h-11 items-center px-2.5 text-[13.5px] font-semibold underline decoration-[1.5px] underline-offset-4 sm:px-3.5 sm:text-sm"
          >
            Sign in
          </Link>
          <Link
            to={`/signup?role=${audience}`}
            className="bg-green hover:bg-green-2 inline-flex min-h-11 items-center rounded-full px-3.5 text-[13.5px] font-semibold text-white transition-colors sm:px-5 sm:text-sm"
          >
            Join TopFarms
          </Link>
        </div>
      </div>
    </div>
  )
}
