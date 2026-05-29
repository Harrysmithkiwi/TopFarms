// Phase 23 Wave 0 — Static-source-guard over src/components/ui/SkillsPicker.tsx
//
// This test encodes the TAX-04 acceptance criteria: the SkillsPicker component
// must be re-pointed from the sector-based filter to the discipline-based filter
// (ag-broad taxonomy v2). Asserts:
//   1. The sector filter `.or('sector.eq...')` is REMOVED
//   2. The discipline filter `.eq('discipline', 'agriculture')` is PRESENT
//   3. The `sector` prop type annotation is removed from the interface
//   4. A CATEGORY_LABELS mapping is present (research recommendation #3)
//
// All assertions are RED until plan 23-01 re-points the component.
// Pattern: readFileSync from tests/fk-indexes.test.ts (canonical template).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SRC_PATH = resolve(__dirname, '..', 'src/components/ui/SkillsPicker.tsx')

describe('SkillsPicker TAX-04: sector filter removed, discipline filter added', () => {
  const src = readFileSync(SRC_PATH, 'utf8')

  // -------------------------------------------------------------------------
  // Removed: sector-based filter (current line 59 in SkillsPicker.tsx)
  // -------------------------------------------------------------------------
  it('does not contain the sector.eq. filter string', () => {
    expect(src).not.toContain('sector.eq.')
  })

  it('does not contain the .or(`sector filter expression', () => {
    expect(src).not.toMatch(/\.or\(`sector/)
  })

  // -------------------------------------------------------------------------
  // Added: discipline-based filter (ag-broad replacement)
  // -------------------------------------------------------------------------
  it("contains .eq('discipline', 'agriculture') filter", () => {
    expect(src).toMatch(/\.eq\('discipline',\s*'agriculture'\)/)
  })

  // -------------------------------------------------------------------------
  // Removed: sector prop from interface
  // -------------------------------------------------------------------------
  it("does not contain the old sector prop type ('dairy' | 'sheep_beef')", () => {
    expect(src).not.toMatch(/sector:\s*'dairy'\s*\|\s*'sheep_beef'/)
  })

  // -------------------------------------------------------------------------
  // Added: CATEGORY_LABELS mapping (research recommendation #3 — human-readable
  // category display names for the 6 ag-broad category slugs)
  // -------------------------------------------------------------------------
  it('contains CATEGORY_LABELS mapping', () => {
    expect(src).toMatch(/CATEGORY_LABELS/)
  })
})
