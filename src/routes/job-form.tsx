import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PostJob, s } from '@/legacyRoutes'

// /jobs/new and /jobs/:id/edit — the same wizard, both employer-gated.
//
// They need their own module only because routes.ts must claim these paths
// before /jobs/:id does; without them "new" would match :id and hit the public
// job loader. The catch-all cannot serve them: useRoutes resolves relative to
// the matched route's pathname, which is only the full URL under a splat.
//
// The element is the legacy table's entry, character for character — same lazy
// chunk (with its deploy-recovery reload), same Suspense fallback. Nothing here
// server-renders: the auth guard stays client-side for this stage (1.16).
export async function clientLoader() {
  return null
}

export function HydrateFallback() {
  return null
}

export default function JobForm() {
  return <ProtectedRoute requiredRole="employer">{s(<PostJob />)}</ProtectedRoute>
}
