import { PublicShell } from '@/components/shell/PublicShell'
import { NotFound } from '@/pages/NotFound'

// v13 stage 1 review surface. Renders the shared shell with placeholder content
// so the shell can be reviewed on a preview deploy BEFORE any real page adopts
// it (stage 2 is the first real adoption). Follows the main.tsx Analytics
// precedent: enabled in dev and on *.vercel.app previews, renders the 404 page
// on the production hostname unless explicitly flagged. Delete this page when
// the port completes.

const enabled =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_PREVIEW_ROUTES === '1' ||
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'))

export function ShellPreview() {
  if (!enabled) return <NotFound />
  return (
    <PublicShell>
      <section className="px-5 py-16">
        <div className="mx-auto max-w-[1440px]">
          <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
            v13 stage 1 preview
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
            Shared shell: utility bar, nav, footer.
          </h1>
          <p className="text-text-muted mt-4 max-w-[60ch]">
            This page exists so the shell can be reviewed in isolation. Toggle the audience
            above: the nav links swap, and the Join link carries the matching role. Sign in
            and the bar disappears, because a session outranks the toggle.
          </p>
          <div className="v13-dark bg-brand-900 mt-10 max-w-[60ch] rounded-3xl p-8 text-white">
            <p className="font-semibold">Dark panel focus check</p>
            <p className="mt-2 text-sm text-white/80">
              Tab through: the focus ring is ink on cream and white in here.
            </p>
            <a
              href="/jobs"
              className="bg-brand-lite text-brand-hover mt-5 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold"
            >
              Sample lime action
            </a>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
