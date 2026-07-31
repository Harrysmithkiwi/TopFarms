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
        className="font-display leading-none font-bold"
        style={{
          fontSize: 'clamp(48px, 5vw, 72px)',
          color: 'var(--color-text-on-brand)',
        }}
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

export function CountersSection() {
  const [stats, setStats] = useState<PlatformStats>({ jobs: 0, seekers: 0, matches: 0 })
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
        <div
          className="grid grid-cols-1 divide-y divide-white/[0.08] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          hidden={statsUnavailable}
        >
          <CounterBlock label="Jobs Posted" target={stats.jobs} active={inView} />
          <CounterBlock label="Workers Registered" target={stats.seekers} active={inView} />
          <CounterBlock label="Matches Made" target={stats.matches} active={inView} />
        </div>
      </div>
    </section>
  )
}
