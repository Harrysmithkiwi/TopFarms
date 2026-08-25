/**
 * Four radii, nothing else: 8 (inputs, in-card chips), 12 (cards, callouts), 16 (large
 * panels, modals), pill. Brand_and_Design.md.
 *
 * Two things this holds that a value check alone would not.
 *
 * ONE VOCABULARY, not just legal values. `rounded-lg` is 8px and `rounded-md` is 6px, and
 * sitting next to each other they read as siblings — that is how 6px passed for a small
 * corner in this codebase for a year. Everything is now spelled rounded-8/12/16/full, so a
 * wrong value cannot disguise itself as a step on the scale.
 *
 * THE DESIGN GATE CANNOT SEE RADII. scripts/design-gate.mjs checks colour and font-size
 * only. Before this file, nothing anywhere failed on a radius, which is why the sweep found
 * 116 off-scale uses across 101 files.
 */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const SRC = resolve(__dirname, '..', 'src')

/** Everything Tailwind ships or accepts that is not on the scale. */
const BANNED = String.raw`\brounded(-[trbl]{1,2})?-(none|xs|sm|md|lg|xl|2xl|3xl|4xl|\[[^\]]+\])`

function offScale(): string[] {
  try {
    return execFileSync(
      'grep',
      ['-rnE', '--include=*.tsx', '--include=*.ts', '--include=*.css', '-e', BANNED, SRC],
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      // A comment naming the old vocabulary is not a use of it. Same trap the design gate,
      // the token ratchet and the display-floor test each hit in turn.
      .filter((l) => !/^[^:]*:\d+:\s*(\/\/|\*|\/\*|\{\/\*)/.test(l))
      .filter(Boolean)
  } catch {
    return []
  }
}

describe('the radius scale has four values', () => {
  it('no off-scale radius anywhere in src/', () => {
    const found = offScale()
    expect(found, `off-scale radii:\n${found.join('\n')}`).toEqual([])
  })

  it('the three numeric steps are declared in index.css', () => {
    const css = execFileSync('cat', [resolve(SRC, 'index.css')], { encoding: 'utf-8' })
    for (const [name, px] of [
      ['--radius-8', '8px'],
      ['--radius-12', '12px'],
      ['--radius-16', '16px'],
    ]) {
      expect(css, `${name} must be declared for rounded-${name.slice(9)} to compile`).toContain(
        `${name}: ${px}`,
      )
    }
  })
})
