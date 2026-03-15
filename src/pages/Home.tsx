import { Link } from 'react-router'
import { Nav } from '@/components/layout/Nav'

export function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Nav />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 text-center">
        <h1
          className="font-display text-5xl md:text-6xl font-semibold mb-4"
          style={{ color: 'var(--color-soil)' }}
        >
          TopFarms
        </h1>
        <p
          className="text-lg md:text-xl mb-10"
          style={{ color: 'var(--color-mid)' }}
        >
          Find your next farm role
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/signup"
            className="px-8 py-3.5 rounded-xl text-base font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-soil)',
              color: 'var(--color-cream)',
            }}
          >
            I'm a Farm Worker
          </Link>
          <Link
            to="/signup"
            className="px-8 py-3.5 rounded-xl text-base font-semibold border-2 transition-colors hover:bg-fog"
            style={{
              borderColor: 'var(--color-soil)',
              color: 'var(--color-soil)',
            }}
          >
            I'm a Farm Employer
          </Link>
        </div>
      </main>
    </div>
  )
}
