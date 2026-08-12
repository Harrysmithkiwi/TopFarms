import { useRoutes } from 'react-router'
import { routeTable } from '@/legacyRoutes'

// The client-only catch-all: every route that is not /jobs or /jobs/:id.
//
// `clientLoader` + `HydrateFallback` with NO server `loader` is framework mode's
// supported way to say "do not server-render this route". The server emits the
// fallback (nothing), the client renders the table on hydration — byte-for-byte
// the behaviour these routes have today under the SPA shell. That is the point:
// the gated surface must not change during a rendering migration.
//
// useRoutes takes the legacy table verbatim, so no route object was rewritten.
// It has no data APIs (no loader/action/errorElement) — errors are caught by
// root.tsx's ErrorBoundary instead, and any route needing a loader is promoted
// out of the table into its own module.
export async function clientLoader() {
  return null
}

export function HydrateFallback() {
  return null
}

export default function Spa() {
  return useRoutes(routeTable())
}
