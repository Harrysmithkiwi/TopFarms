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
 * ROW 7 (2026-08-25): the whole v13 colour world reaches zero and its tokens are deleted
 * from index.css. Both halves are checked — the utility class names, and `var(--color-NAME)`,
 * because two of the last live references were in inline style attributes that a class-name
 * sweep cannot see (a hero gradient and a radial glow in SearchHero).
 *
 * Add the next name to RETIRED as its row lands; do not add one before its row, or this file
 * goes red on work that has not happened yet.
 *
 * Still live, pinned to row 8: the fern ramp, bark, sage, paper, linen and rule. Note for
 * whoever edits this comment: `fern-*` followed by a slash closes the block early and the
 * file stops parsing — vitest reports "no tests", not a syntax error.
 */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const SRC = resolve(__dirname, '..', 'src')

const RETIRED = ['font-bricolage', 'font-archivo']

/**
 * The v13 colour world, retired whole in row 7. Checked as `--color-NAME` rather than as a
 * utility class: that catches the token DEFINITION, every `var()` reference including the
 * ones inside inline style attributes, and — because Tailwind derives `bg-cream` from
 * `--color-cream` — makes re-adding any of them impossible without this file going red.
 */
const RETIRED_COLOUR_TOKENS = [
  'cream', 'cream-2', 'card', 'ink', 'ink-60', 'ink-40',
  'green', 'green-2', 'green-3', 'lime', 'lime-2',
  'ochre', 'ochre-ink', 'line', 'danger-ink',
]

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

function tokenHits(name: string): string[] {
  try {
    return execFileSync(
      'grep',
      // `-e` is load-bearing. A pattern that begins with two dashes is parsed as an OPTION
      // otherwise: grep exits with "invalid option --color-lime", the catch below swallows
      // it, and this returns [] — a guard that can never fail. Caught by injecting a
      // re-declared token and watching the test stay GREEN.
      ['-rnw', '--include=*.tsx', '--include=*.ts', '--include=*.css', '-e', `--color-${name}`, SRC],
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      // index.css records in prose WHICH names were deleted. A tombstone is not a token;
      // a declaration (`--color-x:`) or a reference (`var(--color-x)`) is.
      .filter((l) => /--color-[\w-]+\s*:|var\(--color-/.test(l))
      .filter(Boolean)
  } catch {
    return []
  }
}

describe('retired design tokens do not come back', () => {
  it.each(RETIRED_COLOUR_TOKENS)('`--color-%s` is neither declared nor referenced', (name) => {
    expect(tokenHits(name), `--color-${name} is retired — ${tokenHits(name).join('\n')}`).toEqual(
      [],
    )
  })

  it.each(RETIRED)('`%s` has zero uses in src/', (name) => {
    expect(hits(name), `${name} is retired — ${hits(name).join('\n')}`).toEqual([])
  })

  it.each(RETIRED_FACES)('the `%s` typeface is not loaded or declared', (face) => {
    expect(faceHits(face), `${face} is retired — ${faceHits(face).join('\n')}`).toEqual([])
  })
})
