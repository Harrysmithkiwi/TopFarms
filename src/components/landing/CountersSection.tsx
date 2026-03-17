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
    <div className="flex flex-col items-center gap-2 py-10 px-6">
      <p
        className="font-display font-bold leading-none"
        style={{
          fontSize: 'clamp(48px, 5vw, 72px)',
          color: 'var(--color-cream)',
        }}
      >
        {count.toLocaleString()}{suffix}
      </p>
      <p
        className="text-sm font-medium tracking-wide uppercase"
        style={{ color: 'rgba(247,242,232,0.55)' }}
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
    <section
      ref={ref}
      style={{ backgroundColor: 'var(--color-soil)' }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x"
          style={{ divideColor: 'rgba(255,255,255,0.08)' }}
        >
          <CounterBlock label="Jobs Posted" target={stats.jobs} active={inView} />
          <CounterBlock label="Workers Registered" target={stats.seekers} active={inView} />
          <CounterBlock label="Matches Made" target={stats.matches} active={inView} />
        </div>
      </div>
    </section>
  )
}
