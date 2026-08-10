// Migration ledger drift guard — Phase 0 Task 0.2 (audit P0-8, reclassified P1).
//
// Production migrations are applied via Supabase Studio / the claude.ai connector because
// pooler auth is blocked (see supabase/migrations/README.md). Studio does NOT write a
// supabase_migrations.schema_migrations row, so between 2026-06 and 2026-07 the ledger
// silently drifted to 45 rows against 64 files on disk — nothing could determine what had
// actually been applied.
//
// CI cannot reach the database, so this guard enforces the REPO-side record instead:
// every .sql file must appear in LEDGER.md. That catches the real failure mode — "added a
// migration, applied it by hand, forgot to record it" — at PR time, because the manifest
// row is the thing you cannot forget without CI failing.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const MIGRATIONS_DIR = resolve(__dirname, '..', 'supabase/migrations')

const diskMigrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => f.replace(/\.sql$/, ''))
  .sort()

const ledgerDoc = readFileSync(resolve(MIGRATIONS_DIR, 'LEDGER.md'), 'utf8')

// Rows look like: | 041_leads_pipeline | `041` | backfilled 2026-07-30 |
const manifest = new Map<string, string>()
for (const line of ledgerDoc.split('\n')) {
  const m = line.match(/^\|\s*([0-9]{3}_[a-z0-9_]+)\s*\|\s*`([^`]+)`\s*\|/)
  if (m) manifest.set(m[1], m[2])
}

describe('migration ledger manifest', () => {
  it('parses a plausible number of manifest rows', () => {
    // Guards against a formatting change silently emptying the manifest and turning
    // every assertion below into a vacuous pass.
    expect(manifest.size).toBeGreaterThan(60)
  })

  it('every migration on disk has a manifest row', () => {
    const missing = diskMigrations.filter((f) => !manifest.has(f))
    expect(
      missing,
      `Migrations on disk with no LEDGER.md row:\n  ${missing.join('\n  ')}\n\n` +
        `Add a row to supabase/migrations/LEDGER.md mapping the file to its ledger version, ` +
        `and confirm the migration is actually recorded in supabase_migrations.schema_migrations ` +
        `(Studio-applied SQL does NOT record itself — see README.md).`,
    ).toEqual([])
  })

  it('every manifest row points at a file that exists', () => {
    const orphans = [...manifest.keys()].filter((f) => !diskMigrations.includes(f))
    expect(
      orphans,
      `LEDGER.md rows with no .sql file:\n  ${orphans.join('\n  ')}`,
    ).toEqual([])
  })

  it('assigns each migration a distinct ledger version', () => {
    const versions = [...manifest.values()]
    const dupes = versions.filter((v, i) => versions.indexOf(v) !== i)
    expect(dupes, `Duplicate ledger versions in LEDGER.md: ${dupes.join(', ')}`).toEqual([])
  })

  it('documents the two known duplicate ledger rows and where their content lives', () => {
    // Both are "apply a delta, then amend the source file". The audit initially read these
    // as production schema outside version control; they are not. If someone deletes this
    // section, the correction is lost and the finding gets re-raised.
    expect(ledgerDoc).toContain('20260722232729')
    expect(ledgerDoc).toContain('20260729095445')
    expect(ledgerDoc).toMatch(/058_fix_admin_profile_doc_queue_applicants/)
    expect(ledgerDoc).toMatch(/064_lane_a_outreach_worklist/)
  })

  it('keeps numbering sequential with no gaps', () => {
    // A number can be legitimately missing from main while its PR is still open — the file
    // exists, just on a branch. LEDGER.md has to say so in as many words, and that row is
    // what stops this gate degrading into a silent hole: delete the row and the gap fails
    // again. Shape: `(079 = `name`, applied `version`; file lives on `branch`, PR #N, unmerged)`
    const documentedUnmerged = new Set(
      [...ledgerDoc.matchAll(/\((\d{3}) = [^)]*unmerged\)/g)].map((m) => parseInt(m[1], 10)),
    )
    const nums = diskMigrations.map((f) => parseInt(f.slice(0, 3), 10)).sort((a, b) => a - b)
    const gaps: number[] = []
    for (let i = nums[0]; i <= nums[nums.length - 1]; i++) {
      if (!nums.includes(i) && !documentedUnmerged.has(i)) gaps.push(i)
    }
    expect(gaps, `Gaps in migration numbering: ${gaps.join(', ')}`).toEqual([])
  })
})

describe('maintenance scripts are not mistaken for migrations', () => {
  it('one-off operational SQL lives outside the migrations directory', () => {
    // supabase/maintenance/ holds ledger repairs and similar. A replay from zero must not
    // execute them, so they must never be given a migration number.
    const strays = diskMigrations.filter((f) => /backfill|maintenance|one_?off/i.test(f))
    expect(strays, `Operational scripts found in migrations/: ${strays.join(', ')}`).toEqual([])
  })
})
