import { useEffect } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Step8Complete() {
  useEffect(() => {
    toast.success('Farm profile complete!')
  }, [])

  return (
    <div className="text-center space-y-6 py-4">
      {/* Success illustration */}
      <div className="flex justify-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ backgroundColor: 'var(--color-hay-lt)' }}
        >
          🌾
        </div>
      </div>

      {/* Celebration icon */}
      <div className="relative mx-auto w-16 h-16">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(74,124,47,0.1)' }}
        >
          <svg
            className="w-8 h-8"
            viewBox="0 0 32 32"
            fill="none"
            style={{ color: 'var(--color-fern)' }}
          >
            <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="2" />
            <path
              d="M9 16.5L13.5 21L23 11"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2
          className="font-display text-2xl font-semibold"
          style={{ color: 'var(--color-soil)' }}
        >
          Your farm profile is complete!
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
          You're ready to post your first job and start finding workers
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link
          to="/jobs/new"
          className={cn(
            'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
            'bg-moss text-white hover:bg-fern',
            'px-6 py-3 text-[14px]',
          )}
        >
          Post Your First Job
        </Link>
        <Link
          to="/dashboard/employer"
          className={cn(
            'font-body font-bold rounded-[8px] transition-all duration-200 inline-flex items-center justify-center',
            'bg-white border border-moss text-moss hover:bg-mist',
            'px-6 py-3 text-[14px]',
          )}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
