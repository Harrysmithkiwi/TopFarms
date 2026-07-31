// Phase 5 Stage 1 — migration ledger generator.
// Emits docs/design/phase-5-ledger.md: every file with an inline style, its
// occurrence counts, surface class, and whether it sits on a Phase 4 axe route.
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const files = execSync(`grep -rl 'style={{' ${ROOT}/src`, { encoding: 'utf8' })
  .trim().split('\n').map((f) => f.replace(`${ROOT}/`, '')).sort()

// Surface classification. Order matters — first match wins.
const SURFACES = [
  [/^src\/pages\/admin\/|^src\/components\/admin\/|^src\/components\/layout\/Admin/, 'admin'],
  [/^src\/pages\/auth\/|^src\/components\/layout\/AuthLayout/, 'auth'],
  [/^src\/components\/landing\/|^src\/pages\/(Home|ForEmployers|Pricing)\.tsx|^src\/pages\/legal\//, 'marketing'],
  [/^src\/pages\/dashboard\/employer\/|^src\/pages\/dashboard\/EmployerDashboard|^src\/pages\/jobs\/(PostJob|steps\/)|^src\/pages\/jobs\/MarkFilledModal|^src\/pages\/onboarding\/(EmployerOnboarding|steps\/Step)|^src\/pages\/verification\//, 'employer'],
  [/^src\/pages\/jobs\/|^src\/pages\/dashboard\/|^src\/pages\/onboarding\/|^src\/components\/saved-search\//, 'seeker'],
]
const surfaceOf = (f) => SURFACES.find(([re]) => re.test(f))?.[1] ?? 'shared'

// Phase 4 axe route set: /, /jobs, /jobs/:id, /dashboard/seeker, /onboarding/seeker,
// employer applicant dashboard. Files rendering on those routes.
const AXE = [
  /^src\/pages\/Home\.tsx/, /^src\/components\/landing\//, /^src\/components\/layout\/Nav/,
  /^src\/pages\/jobs\/(JobSearch|JobDetail)/, /^src\/components\/ui\/(SearchJobCard|SearchHero|FilterSidebar|MyApplicationsSidebar)/,
  /^src\/pages\/dashboard\/SeekerDashboard/, /^src\/pages\/onboarding\/SeekerOnboarding/,
  /^src\/pages\/onboarding\/steps\/Seeker/, /^src\/pages\/dashboard\/employer\/ApplicantDashboard/,
  /^src\/components\/ui\/(ApplicantPanel|MatchBreakdown|ApplicantDocuments|AICandidateSummary)/,
  /^src\/components\/layout\/(DashboardLayout|Sidebar)/,
]
const onAxe = (f) => AXE.some((re) => re.test(f))

const rows = files.map((f) => {
  const src = readFileSync(`${ROOT}/${f}`, 'utf8')
  return {
    f,
    total: (src.match(/style=\{\{/g) ?? []).length,
    colour: (src.match(/var\(--color-/g) ?? []).length,
    hex: (src.match(/#[0-9a-fA-F]{6}\b/g) ?? []).length,
    px: (src.match(/text-\[\d+px\]/g) ?? []).length,
    surface: surfaceOf(f),
    axe: onAxe(f),
  }
})

const ORDER = ['seeker', 'employer', 'admin', 'auth', 'marketing', 'shared']
const sum = (rs, k) => rs.reduce((a, r) => a + r[k], 0)

let out = `# Phase 5 — inline-style migration ledger

Generated Stage 1, before any migration, at commit \`${execSync('git -C ' + ROOT + ' rev-parse --short HEAD', { encoding: 'utf8' }).trim()}\`.
The planning artefact for Task 5.1: what has to move, in what order, and which
files sit on a route the Phase 4 axe gate already watches.

**Totals: ${files.length} files · ${sum(rows, 'total')} \`style={{\` · ${sum(rows, 'colour')} \`var(--color-…)\` · ${sum(rows, 'hex')} hex literals · ${sum(rows, 'px')} \`text-[Npx]\`**

\`colour\` counts \`var(--color-…)\` references anywhere in the file — the migration
target. \`axe\` marks files rendering on one of the six Phase 4 axe routes: those
regress loudest and are migrated first inside their surface class.

Order within each surface is heaviest-first by \`style={{\` count, per the brief.

`

for (const s of ORDER) {
  const rs = rows.filter((r) => r.surface === s).sort((a, b) => b.total - a.total || b.colour - a.colour)
  if (!rs.length) continue
  out += `## ${s} — ${rs.length} files · ${sum(rs, 'total')} \`style={{\` · ${sum(rs, 'colour')} colour refs\n\n`
  out += `| # | File | \`style={{\` | colour | hex | \`text-[Npx]\` | axe route |\n|---|---|---|---|---|---|---|\n`
  rs.forEach((r, i) => {
    out += `| ${i + 1} | \`${r.f.replace('src/', '')}\` | ${r.total} | ${r.colour} | ${r.hex || ''} | ${r.px || ''} | ${r.axe ? '**yes**' : ''} |\n`
  })
  out += '\n'
}

out += `## Batch plan

Landed first, before any page (every migration consumes them):

| Order | Commit | Why first |
|---|---|---|
| 1 | canon amendment — \`Brand_and_Design.md:53\` | The 44×44 line is wrong (AA vs AAA) and the code already contradicts it. Migrating pages against a false spec bakes it in |
| 2 | type scale tokens (Task 5.2) | Every page migration maps \`text-[Npx]\` onto these. Late = migrate twice |

Then page commits, heaviest-first within surface, seeker/employer before admin
(the axe gate watches them; admin has no automated visual coverage):

| Order | Scope | Rationale |
|---|---|---|
| 3 | \`JobDetail.tsx\` | Heaviest file in the repo (55) and on an axe route |
| 4 | \`SeekerDashboard.tsx\` + seeker dashboard children | Axe route, mobile-first surface |
| 5 | \`EmployerDashboard.tsx\`, \`ApplicantDashboard.tsx\` | Axe route (applicants); Task 5.6's false-empty-state lives here |
| 6 | \`SignUp.tsx\` + \`auth/*\` | Every user passes through once, usually on a phone |
| 7 | onboarding steps (seeker, then employer) | High file count, low per-file weight — grouped commits |
| 8 | \`jobs/steps/*\` (PostJob wizard) | Grouped |
| 9 | \`admin/*\` + \`components/admin/*\` | Full cheat-sheet density applies here; desktop-only |
| 10 | \`components/*\` residue (layout, ui, saved-search, tremor) | Shared shells last — they are consumed by everything above, so migrating them early would churn the pages twice |
| 11 | marketing (\`Home\`, landing/\*, \`ForEmployers\`, \`Pricing\`, legal) | Out of cheat-sheet scope; keeps its airier scale. Colour tokens still migrate |

**Not migrated:** \`components/stripe/PaymentForm.tsx\` — the Stripe Elements
\`appearance\` object takes hex strings through Stripe's API, not CSS classes.
Sanctioned exception per Task 5.3; gets a comment saying why.
`

writeFileSync(`${ROOT}/docs/design/phase-5-ledger.md`, out)
console.log(`ledger: ${files.length} files, ${sum(rows, 'total')} style={{, ${sum(rows, 'colour')} colour refs`)
for (const s of ORDER) {
  const rs = rows.filter((r) => r.surface === s)
  if (rs.length) console.log(`  ${s.padEnd(10)} ${String(rs.length).padStart(3)} files  ${String(sum(rs, 'total')).padStart(4)} style  ${String(sum(rs, 'colour')).padStart(4)} colour`)
}
