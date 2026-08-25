/**
 * The design-system sync retires a token name per row. This is the ratchet that stops a
 * retired name coming back — the failure mode the whole exercise exists to end, since every
 * one of the three forked token worlds started as a name somebody added and nobody removed.
 *
 * ROW 1 (2026-08-25): `font-bricolage` reaches zero with the deletion of the eleven orphaned
 * pre-v12 landing components.
 * ROW 3 (2026-08-25): `font-archivo` reaches zero — it was one className on AuthLayout, and
 * with it both retired typefaces and their Google Fonts request leave the bundle. `Archivo`
 * and `Bricolage` are checked as bare words too, so re-adding the @import fails here even
 * before a component uses it.
 *
 * Add the next name to RETIRED as its row lands; do not add one before its row, or this file
 * goes red on work that has not happened yet.
 *
 * Still live, each pinned to its own row: cream/cream-2/card/line
 * (rows 4, 6, 7) · ink/ink-60/ink-40 (rows 4, 6, 7) · lime/lime-2 (row 5) · green/green-2/
 * green-3/ochre/ochre-ink (rows 5, 7) · the fern ramp, bark, sage, paper, linen and rule
 * (row 8). Note for whoever edits this comment: `fern-*` followed by a slash closes the
 * block early and the file stops parsing — vitest reports "no tests", not a syntax error.
 */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const SRC = resolve(__dirname, '..', 'src')

const RETIRED = ['font-bricolage', 'font-archivo']

/** Face names, checked across src/ including index.css — an @import is enough to fail. */
const RETIRED_FACES = ['Archivo', 'Bricolage', 'Satoshi', 'Fraunces', 'DM Sans']

function hits(name: string): string[] {
  try {
    // -w so `green` would not match `green-500`; grep exits 1 on no match, which is the pass.
    return execFileSync('grep', ['-rnw', '--include=*.tsx', '--include=*.ts', name, SRC], {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

function faceHits(name: string): string[] {
  try {
    return execFileSync('grep', ['-rn', '--include=*.tsx', '--include=*.ts', '--include=*.css', name, SRC], {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      // A mention is not a use. index.css records in prose WHY these faces left, and this
      // file's own header names them — neither loads a font. Keep only the three forms that
      // actually pull or declare one. Filtering by "is it a comment?" was tried and failed:
      // a continuation line inside a CSS block comment starts with plain text.
      .filter((l) => /@import|font-family|--font-/.test(l))
      .filter(Boolean)
  } catch {
    return []
  }
}

describe('retired design tokens do not come back', () => {
  it.each(RETIRED)('`%s` has zero uses in src/', (name) => {
    expect(hits(name), `${name} is retired — ${hits(name).join('\n')}`).toEqual([])
  })

  it.each(RETIRED_FACES)('the `%s` typeface is not loaded or declared', (face) => {
    expect(faceHits(face), `${face} is retired — ${faceHits(face).join('\n')}`).toEqual([])
  })
})
