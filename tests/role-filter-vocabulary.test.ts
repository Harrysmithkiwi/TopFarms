import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLE_TYPES } from '@/lib/constants'

// Test intent — audit finding F-22 (Tier 0). Every role filter on /jobs returned zero results.
//
// Three files, two vocabularies, no translation between them:
//
//   JobStep1Basics.tsx:36   ROLE_TYPES.map(r => ({ value: r, label: r }))
//                           → jobs.role_type stores the DISPLAY string, e.g. 'Farm Manager'
//   FilterSidebar.tsx:21    a private snake_case list, e.g. 'farm_manager'
//                           → the URL carries role_type=farm_manager
//   JobSearch.tsx:356       .eq('role_type', 'farm_manager')  → matches nothing, ever
//
// The fork was not merely mis-cased: it invented four roles that do not exist (Head Stockman,
// Dairy Assistant, Trainee, Couple Position) and omitted four that do (Assistant Manager,
// Farm Hand, General, Other). A case-mapping layer would still have been wrong.
//
// A rendering test would not have caught this — both lists rendered fine. What was missing is
// that the value a filter EMITS has to be the value the column STORES, which is a property of
// two files agreeing, so that is what this asserts.

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

const SIDEBAR = read('src/components/ui/FilterSidebar.tsx')
const WIZARD = read('src/pages/jobs/steps/JobStep1Basics.tsx')

describe('F-22 — the role filter speaks the vocabulary the column stores', () => {
  it('the sidebar has no private role list', () => {
    // The defect in one line: a second source of truth for role_type.
    expect(SIDEBAR).not.toMatch(/const ROLE_TYPES\s*=\s*\[/)
    expect(SIDEBAR).toMatch(/import\s*\{[^}]*ROLE_TYPES[^}]*\}\s*from '@\/lib\/constants'/)
  })

  it('the sidebar emits the stored value, not a slug', () => {
    // value === label is what makes the emitted filter equal the stored column.
    expect(SIDEBAR).toMatch(/ROLE_TYPES\.map\(\(r\) => \(\{ value: r, label: r \}\)\)/)
    // The exact strings that never matched anything.
    for (const slug of ['farm_manager', 'head_stockman', 'dairy_assistant', 'relief_milker']) {
      const codeOnly = SIDEBAR.split('\n')
        .filter((l) => !l.trimStart().startsWith('//'))
        .join('\n')
      expect(codeOnly).not.toContain(`'${slug}'`)
    }
  })

  it('the writer and the filter derive from the same constant', () => {
    // If these ever diverge again the filter silently returns nothing — no error, no empty
    // state that explains itself, just a board that looks like it has no jobs.
    expect(WIZARD).toMatch(/import\s*\{[^}]*ROLE_TYPES[^}]*\}\s*from '@\/lib\/constants'/)
    expect(WIZARD).toMatch(/ROLE_TYPES\.map\(\(r\) => \(\{ value: r, label: r \}\)\)/)
  })

  it('the canonical list is what a job can actually hold', () => {
    // Guards the roles the fork invented and the ones it dropped.
    expect(ROLE_TYPES).toContain('Farm Manager')
    expect(ROLE_TYPES).toContain('Assistant Manager')
    expect(ROLE_TYPES).toContain('Farm Hand')
    expect(ROLE_TYPES).toContain('General')
    expect(ROLE_TYPES).toContain('Other')
    expect(ROLE_TYPES).not.toContain('Head Stockman')
    expect(ROLE_TYPES).not.toContain('Dairy Assistant')
    expect(ROLE_TYPES).not.toContain('Trainee')
  })
})
