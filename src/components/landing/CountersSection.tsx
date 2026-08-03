import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useInView } from '@/hooks/useInView'
import { useCountUp } from '@/hooks/useCountUp'

interface PlatformStats {
  jobs: number
  seekers: number
  matches: number
}

interface CounterBlockProps {
  label: string
  target: number
  active: boolean
  suffix?: string
}

function CounterBlock({ label, target, active, suffix = '' }: CounterBlockProps) {
  const count = useCountUp(target, 1800, active)
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10">
      <p
        className="font-display text-text-on-brand leading-none font-bold"
        // fluid clamp() type — no utility equivalent; colour is on the class.
        style={{ fontSize: 'clamp(48px, 5vw, 72px)' }}
      >
        {count.toLocaleString()}
        {suffix}
      </p>
      <p
        className="text-sm font-medium tracking-wide uppercase text-white/55"
      >
        {label}
      </p>
    </div>
  )
}

// v13 (2026-08-03): counters render ONLY when every stat clears this floor.
// Phase 5.6 stopped zeros rendering when the RPC *fails*; this extends the same
// reasoning to when it *succeeds*: "0 Jobs Posted" under a pulsing LIVE badge is
// anti-proof, and single digits read the same way. 10 is a judgment call, not a
// measurement — raise it if double digits still look thin next to real boards.
// See docs/design/v11-DIRECTIVE.md section 6 (Test 3: liquidity patterns).
const MIN_CREDIBLE = 10

export function CountersSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [statsUnavailable, setStatsUnavailable] = useState(false)
  const { ref, inView } = useInView(0.2)

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.rpc('get_platform_stats')
      if (error || !data) {
        // Phase 5.6: do NOT fall back to zeros. "0 Jobs Posted" on the landing
        // page is not a degraded state, it is a false claim about the business --
        // the same class of defect Phase 0.5 removed when it deleted the
        // fabricated stats. An unknown number is not zero; show nothing.
        console.error('CountersSection: failed to load platform stats', error)
        setStatsUnavailable(true)
        return
      }
      setStats({
        jobs: Number(data.jobs ?? 0),
        seekers: Number(data.seekers ?? 0),
        matches: Number(data.matches ?? 0),
      })
    }
    fetchStats()
  }, [])

  // Nothing renders (no dark band, no LIVE badge) until stats are loaded AND
  // credible. Before the fetch resolves stats is null, so first paint is empty
  // rather than a band that pops its numbers in later.
  if (
    statsUnavailable ||
    stats === null ||
    stats.jobs < MIN_CREDIBLE ||
    stats.seekers < MIN_CREDIBLE ||
    stats.matches < MIN_CREDIBLE
  ) {
    return null
  }

  return (
    <section className="bg-brand-900" ref={ref}>
      <div className="mx-auto max-w-5xl px-4">
        {/* Live badge */}
        <div className="mb-4 flex justify-center pt-8">
          {/* brand on brand-900 was 3.33:1 — brand-300 is the on-dark green */}
          <div className="border-brand/30 bg-brand/8 text-brand-300 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-brand"
            />
            Live
          </div>
        </div>

        {/* divide color via utility class — `divideColor` is not a CSS property,
            so the previous inline style was silently ignored by React. */}
        <div className="grid grid-cols-1 divide-y divide-white/[0.08] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <CounterBlock label="Jobs Posted" target={stats.jobs} active={inView} />
          <CounterBlock label="Workers Registered" target={stats.seekers} active={inView} />
          <CounterBlock label="Matches Made" target={stats.matches} active={inView} />
        </div>
      </div>
    </section>
  )
}
