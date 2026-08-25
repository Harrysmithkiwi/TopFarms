/**
 * Brand_and_Design.md v2.1: every elevation is tinted #0B1F10, never black.
 *
 * This asserts against the BUILT stylesheet, not the source, because grepping src/ for a
 * black shadow finds nothing and always did — the black lives inside Tailwind's default
 * theme, and it reached production three ways that no source grep could see:
 *
 *   1. The default elevation tokens, used by 28 call sites across 23 files.
 *   2. A 1,200-line landing-page HTML dump in marketing/ and two planning documents in
 *      .planning/ — Tailwind v4 auto-scans the whole project root including Markdown, so
 *      prose quoting a utility name emits that utility.
 *   3. The word "shadow" appearing in an ordinary code comment in src/, which was enough
 *      to emit the unsuffixed elevation utility with its black default.
 *
 * All three are closed in src/index.css (tinted tokens + @source not). This test is what
 * notices if a fourth appears. It skips when no build output exists, so `npm test` on a
 * clean checkout does not fail for the wrong reason — CI runs the build before the tests.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const ASSETS = resolve(__dirname, '..', 'build', 'client', 'assets')

function builtCss(): string | null {
  if (!existsSync(ASSETS)) return null
  const files = readdirSync(ASSETS).filter((f) => f.endsWith('.css'))
  if (files.length === 0) return null
  return files.map((f) => readFileSync(join(ASSETS, f), 'utf-8')).join('\n')
}

describe('no black shadows reach production CSS', () => {
  it('the built stylesheet contains no black shadow colour', () => {
    const css = builtCss()
    if (css === null) {
      console.warn('[no-black-shadows] no build/client/assets — run `npm run build` first')
      return
    }
    // Every form a black shadow colour compiles to: rgb()/rgba() functional, and the
    // #000000AA hex Lightning CSS minifies them into.
    const black = css.match(/rgba?\(\s*0[,\s]+0[,\s]+0[\s,/)]|#0{6}[0-9a-f]{0,2}\b/gi) ?? []
    expect(black, `black shadow colours in the built CSS: ${[...new Set(black)].join(', ')}`)
      .toEqual([])
  })
})
