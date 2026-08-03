import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useInView } from '@/hooks/useInView'
import { useCountUp } from '@/hooks/useCountUp'

// v13 restyle, gate PRESERVED (directive 1.15, NOT THIS list). This section is
// deliberately DORMANT until every stat clears MIN_CREDIBLE: the comp has no
// counters section, but the component stays so the credibility gate survives.
// Deleting it to match the comp would resurrect the zero counter the day
// someone adds a stats band back.
// Restyle notes: green-3 flat surface (1.6 commercial family), ochre numerals
// (5.19:1 on green-3), and the pulsing "Live" badge is gone -- a pulse on a
// stats band is the same simulation-signal class 1.1 stripped from the hero.

interface PlatformStats {
  jobs: number
  seekers: number
  matches: number
}

// v13 (2026-08-03): counters render ONLY when every stat clears this floor.
// Phase 5.6 stopped zeros rendering when the RPC *fails*; this extends the same
// reasoning to when it *succeeds*: "0 Jobs Posted" is anti-proof, and single
// digits read the same way. 10 is a judgment call, not a measurement -- raise
// it if double digits still look thin next to real boards.
// See docs/design/v11-DIRECTIVE.md sections 1.15 and 6 (Test 3).
const MIN_CREDIBLE = 10

function CounterBlock({ label, target, active }: { label: string; target: number; active: boolean }) {
  const count = useCountUp(target, 1800, active)
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-9">
      <p className="text-ochre text-5xl font-extrabold tracking-[-.04em] md:text-6xl">
        {count.toLocaleString()}
      </p>
      <p className="text-sm font-medium tracking-wide text-white/78 uppercase">{label}</p>
    </div>
  )
}

export function CountersSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [statsUnavailable, setStatsUnavailable] = useState(false)
  const { ref, inView } = useInView(0.2)

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.rpc('get_platform_stats')
      if (error || !data) {
        // Phase 5.6: do NOT fall back to zeros. An unknown number is not zero;
        // show nothing.
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
    <section ref={ref} className="mx-auto max-w-[1440px] px-3 pt-14 sm:px-5 md:pt-16">
      <div className="bg-green-3 grid grid-cols-1 divide-y divide-white/8 rounded-3xl text-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <CounterBlock label="Jobs Posted" target={stats.jobs} active={inView} />
        <CounterBlock label="Workers Registered" target={stats.seekers} active={inView} />
        <CounterBlock label="Matches Made" target={stats.matches} active={inView} />
      </div>
    </section>
  )
}
