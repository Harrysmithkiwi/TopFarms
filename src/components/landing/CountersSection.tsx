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
        className="text-sm font-medium tracking-wide uppercase"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {label}
      </p>
    </div>
  )
}

export function CountersSection() {
  const [stats, setStats] = useState<PlatformStats>({ jobs: 0, seekers: 0, matches: 0 })
  const { ref, inView } = useInView(0.2)

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.rpc('get_platform_stats')
      if (error || !data) {
        // Fallback: use 0 for all counters on error
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
    <section ref={ref} style={{ backgroundColor: 'var(--color-brand-900)' }}>
      <div className="mx-auto max-w-5xl px-4">
        {/* Live badge */}
        <div className="mb-4 flex justify-center pt-8">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-widest uppercase"
            style={{
              borderColor: 'color-mix(in oklab, var(--color-brand) 30%, transparent)',
              backgroundColor: 'color-mix(in oklab, var(--color-brand) 8%, transparent)',
              color: 'var(--color-brand)',
            }}
          >
            <span
              className="h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: 'var(--color-brand)' }}
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

        {/* Honest framing — these are real, live counts from get_platform_stats,
            small by design at launch. Better an honest number than an invented one. */}
        <p
          className="pb-12 text-center text-sm"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          Real numbers, updated live as farms and workers join.
        </p>
      </div>
    </section>
  )
}
