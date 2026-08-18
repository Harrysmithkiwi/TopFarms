import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Test intent — Phase B2: nothing gets lost or shown blank between the two lanes.
//
// `lead_staging` holds both lanes and `lead-intake` — not the screen you pasted on — decides
// which one a post is. `AdminSeekerStaging` and `AdminLeadsStaging` are sibling routes each
// filtered to their own `type`. Two consequences were live:
//
//  1. A screenshot item carries no `raw_text`, and `p_raw_excerpt` read only `item.raw_text`,
//     so every screenshot-captured lead stored an EMPTY excerpt. Three things read that
//     column: the drawer panel a reviewer reads to judge the extraction and write a DM,
//     `_lead_body_key` (092 — the opt-out that holds across handles, which returns NULL on an
//     empty body), and the staging text search. Measured on prod 2026-08-18: `manual_paste`
//     (the source PasteCapture defaults to when you drop an image) had 2 rows, both with no
//     excerpt.
//  2. The fork was invisible. The toast said "Staged N" with no lane split, so a mixed paste
//     on the seeker screen moved employer posts out of view with no signal — and because
//     `admin_leads_staging_list` reads `coalesce(type,'employer')`, a post the model was
//     unsure about defaults to the employer queue too.

const INTAKE = readFileSync(
  join(process.cwd(), 'supabase/functions/lead-intake/index.ts'),
  'utf-8',
)
const PASTE = readFileSync(
  join(process.cwd(), 'src/components/admin/PasteCapture.tsx'),
  'utf-8',
)

describe('B2 — a screenshot keeps its post text', () => {
  it('verbatim_text is a required field on the emit schema', () => {
    // Required, like `seeker`, so the model makes an explicit decision instead of silently
    // omitting it on the items that need it most.
    const required = INTAKE.slice(INTAKE.indexOf("'seeker',\n"), INTAKE.indexOf("'confidence',"))
    expect(required).toMatch(/'verbatim_text',/)
    expect(INTAKE).toMatch(/verbatim_text: \{ type: \['string', 'null'\] \}/)
  })

  it('the prompt asks for a transcription, not a summary', () => {
    // A tidied paraphrase would defeat all three consumers: the reviewer cannot judge the
    // extraction against it, and a normalised body hash of a paraphrase is not stable.
    expect(INTAKE).toMatch(/verbatim_text = the post as written/)
    expect(INTAKE).toMatch(/Do not summarise, tidy, translate or reorder it/)
  })

  it('raw_text wins over the transcription, and the transcription is the fallback', () => {
    // Order is the whole point. A pasted text item already holds ground truth; preferring a
    // model transcription over it would replace real bytes with a re-reading of them.
    expect(INTAKE).toMatch(
      /p_raw_excerpt: \(item\.raw_text \?\? lead\.verbatim \?\? ''\)\.slice\(0, 2000\)/,
    )
  })

  it('the passthrough branch still type-checks with an explicit null', () => {
    // Pre-structured Apify rows never see the vision model; they must not silently become
    // `undefined` on a required field.
    const fb = INTAKE.slice(INTAKE.indexOf('seeker: null,'))
    expect(fb.slice(0, 200)).toMatch(/verbatim_text: null,/)
  })
})

describe('B2 — the lane fork is visible', () => {
  it('intake counts staged rows per lane', () => {
    expect(INTAKE).toMatch(/const staged: Record<'employer' \| 'seeker', number>/)
    expect(INTAKE).toMatch(/staged\[lead\.structured\.type === 'seeker' \? 'seeker' : 'employer'\]\+\+/)
  })

  it('only a row that actually landed is counted', () => {
    // A suppressed or duplicate post is not in either queue. Counting it would report work
    // that does not exist — the same class of lie as F-11's success toast on a failed write.
    const at = INTAKE.indexOf('staged[lead.structured.type')
    expect(INTAKE.slice(Math.max(0, at - 200), at)).toMatch(/if \(outcome === 'inserted'\)/)
  })

  it('the lane default matches the queue that will show the row', () => {
    // admin_leads_staging_list filters on coalesce(structured->>'type','employer'), so an
    // untyped row appears on the EMPLOYER screen. Counting it as a seeker would make the
    // toast disagree with the queue.
    expect(INTAKE).toMatch(/=== 'seeker' \? 'seeker' : 'employer'/)
  })

  it('the response carries the split', () => {
    expect(INTAKE).toMatch(/return json\(\{[\s\S]{0,200}\bstaged,/)
  })
})

describe('B2 — the operator is told where the batch went', () => {
  it('PasteCapture reads the per-lane counts', () => {
    expect(PASTE).toMatch(/staged\?: \{ employer\?: number; seeker\?: number \}/)
    expect(PASTE).toMatch(/const employer = r\.staged\?\.employer \?\? 0/)
    expect(PASTE).toMatch(/const seeker = r\.staged\?\.seeker \?\? 0/)
  })

  it('names both lanes when a batch split, and stays a plain count when it did not', () => {
    // Naming lanes on every single-lane paste would be noise on the common path; the signal
    // is only interesting when something left the screen you are standing on.
    expect(PASTE).toMatch(/employer && seeker/)
    expect(PASTE).toMatch(/\$\{seeker\} to seekers, \$\{employer\} to employers/)
    expect(PASTE).toMatch(/: `\$\{employer \+ seeker\}`/)
  })

  it('still reports dupes and suppressions', () => {
    // 092 makes suppression reachable from the seeker queue; a batch silently dropping rows
    // to an opt-out with no count would look like the intake had failed.
    expect(PASTE).toMatch(/dupes \$\{r\.results\?\.exact_duplicate \?\? 0\}/)
    expect(PASTE).toMatch(/suppressed \$\{r\.results\?\.suppressed \?\? 0\}/)
  })
})
