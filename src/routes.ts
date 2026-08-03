import { type RouteConfig, index, route } from '@react-router/dev/routes'

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
// Ranking, measured against the running server (a flat matchRoutes() check is
// NOT a substitute — see the index route below):
//   /                        -> index          (the splat does NOT cover this)
//   /jobs                    -> jobs
//   /jobs/new                -> jobs/new       (static segment outranks :id)
//   /jobs/<uuid>             -> jobs/:id
//   /dashboard/employer      -> *
//   /nope                    -> *
// The library table's "declare /jobs/new before /jobs/:id" rule does NOT apply
// here — framework mode ranks by specificity, not by declaration order.
//
// THE INDEX ROUTE IS LOAD-BEARING. A splat child of the root layout does not
// match the parent's index position, so without this line the landing page
// renders a blank document — no error, no warning, just nothing. matchRoutes on
// a FLAT array does match '*' against '/', which is why this looked verified
// before the server was actually driven. It points at the same module; framework
// mode only requires the id to be unique.
export default [
  index('./routes/spa.tsx', { id: 'home' }),
  route('jobs', './routes/jobs.tsx'),
  route('jobs/new', './routes/job-form.tsx', { id: 'job-new' }),
  route('jobs/:id', './routes/job-detail.tsx'),
  route('jobs/:id/edit', './routes/job-form.tsx', { id: 'job-edit' }),
  route('*', './routes/spa.tsx'),
] satisfies RouteConfig
