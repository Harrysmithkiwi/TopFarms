export function SeekerStep7Complete() {
  // The wizard shell navigates to /jobs after step 6 completes.
  // This screen shows briefly during the final save + redirect.
  return (
    <div className="text-center space-y-6 py-4">
      {/* Success icon */}
      <div className="flex justify-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ backgroundColor: 'var(--color-hay-lt)' }}
        >
          🌾
        </div>
      </div>

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
          Your profile is ready!
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-mid)' }}>
          Finding your best matches...
        </p>
      </div>

      {/* Loading indicator */}
      <div className="flex justify-center">
        <div
          className="w-6 h-6 rounded-full border-[2px] border-t-transparent animate-spin"
          style={{ borderColor: 'var(--color-fern)', borderTopColor: 'transparent' }}
        />
      </div>
    </div>
  )
}
