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
 * ROW 8 (2026-08-25): the v14 marketing vocabulary reaches zero. It was never a second
 * palette — every one of its tokens already held the portal's hex under a different name —
 * so this locks the DICTIONARY, not the colours. Two names for one colour is how a reader
 * ends up believing there are two design systems.
 *
 * All three token worlds are now retired. A name added here is a name that cannot return.
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
  // v13 (row 7)
  'cream', 'cream-2', 'card', 'ink', 'ink-60', 'ink-40',
  'green', 'green-2', 'green-3', 'lime', 'lime-2',
  'ochre', 'ochre-ink', 'line', 'danger-ink',
  // v14 marketing (row 8)
  'fern-900', 'fern-800', 'fern-700', 'fern-600', 'fern-500', 'fern-lite',
  'fern-100', 'fern-50', 'bark', 'sage', 'paper', 'linen', 'rule',
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

/**
 * The CLASS form, which the token check above cannot see.
 *
 * Deleting a token from index.css does not stop anyone writing `text-fern-900` — Tailwind
 * simply generates nothing and the element renders with no colour at all. That is exactly
 * how `border-t-moss` survived in this codebase for a year, painting nothing on ten
 * components while everyone read the class name and assumed it worked.
 *
 * Found because the row 8 red-proof did not go red: injecting a v14 class passed cleanly,
 * because every proof up to that point had injected a DECLARATION or a var() reference.
 * Two failure shapes, and only one of them was ever tested.
 */
function classHits(name: string): string[] {
  // Colour utilities only. `shadow` is deliberately absent: --shadow-card is a live
  // elevation token and has nothing to do with the retired --color-card, but `card` is on
  // the list and the two collide on the name alone. This list is about colour.
  const PREFIXES =
    'bg|text|border|from|to|via|fill|stroke|ring|divide|outline|decoration|placeholder|caret|accent'
  try {
    return execFileSync(
      'grep',
      ['-rnE', '--include=*.tsx', '--include=*.ts', '-e', `\\b(${PREFIXES})(-[trbl]{1,2})?-${name}\\b`, SRC],
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter((l) => !/^[^:]*:\d+:\s*(\/\/|\*|\/\*|\{\/\*)/.test(l))
      .filter(Boolean)
  } catch {
    return []
  }
}

describe('retired design tokens do not come back', () => {
  it.each(RETIRED_COLOUR_TOKENS)('no `*-%s` utility class survives', (name) => {
    expect(classHits(name), `${name} is retired — ${classHits(name).join('\n')}`).toEqual([])
  })

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
