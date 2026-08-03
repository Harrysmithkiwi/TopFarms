import { type RouteConfig, route } from '@react-router/dev/routes'

// v13 stage 3b route config (directive 1.16).
//
// Only the routes that must appear in the RAW HTML get their own module. Every
// other route stays in the legacy table and is served by the `*` catch-all,
// client-rendered exactly as it is today. That is deliberate, not laziness with
// a deadline: server-rendering 40 gated routes buys nothing (a crawler cannot
// see a dashboard) and costs a hydration audit of every one of them. Promoting
// a route later is a two-file change — add a module here, delete its entry from
// legacyRoutes.
//
// Ranking, verified with matchRoutes before this file was written:
//   /                        -> *              (splat matches the empty path)
//   /jobs                    -> jobs
//   /jobs/new                -> jobs/new       (static segment outranks :id)
//   /jobs/<uuid>             -> jobs/:id
//   /dashboard/employer      -> *
// The library table's "declare /jobs/new before /jobs/:id" rule does NOT apply
// here — framework mode ranks by specificity, not by declaration order.
export default [
  route('jobs', './routes/jobs.tsx'),
  route('jobs/new', './routes/job-form.tsx', { id: 'job-new' }),
  route('jobs/:id', './routes/job-detail.tsx'),
  route('jobs/:id/edit', './routes/job-form.tsx', { id: 'job-edit' }),
  route('*', './routes/spa.tsx'),
] satisfies RouteConfig
