/**
 * The display face has a floor. Brand_and_Design.md: Newsreader is display only — marketing
 * H1/H2, app page titles, empty-state headlines — and never under 20px, never a card title,
 * label, table header, chip or button.
 *
 * This exists because of how --font-display moved. It resolved to INTER until 2026-08-25,
 * so every one of the 33 `font-display` call sites rendered sans-serif and nothing anywhere
 * enforced the floor. Flipping one line in index.css changed the face at all 33 at once —
 * and six of them were below the floor, plus a numeric match score. A rule nobody could
 * break was silently violated seven times the moment it started applying.
 *
 * Static source scan, deliberately: jsdom has no font stack and a rendered test would assert
 * on a fallback. The thing worth holding is "no call site pairs the display face with a small
 * size", which is a property of the source.
 */
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const SRC = resolve(__dirname, '..', 'src')

/** Tailwind steps that resolve below 20px, plus this repo's two custom small tokens. */
const BELOW_FLOOR = ['micro', 'label', 'xs', 'sm', 'base', 'lg']

function displaySites(): string[] {
  try {
    return execFileSync(
      'grep',
      ['-rn', '--include=*.tsx', '-e', 'font-display', '-e', 'font-serif', SRC],
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
      // A comment saying "font-body, not font-display" is not a call site. Every one of
      // the six fixes in this row carries exactly such a note, so without this the gate
      // fails on the very change that satisfies it — which is what it did on first run.
      .filter((l) => !/^[^:]*:\d+:\s*(\/\/|\*|\/\*|\{\/\*)/.test(l))
  } catch {
    return []
  }
}

describe('the display face stays above its 20px floor', () => {
  it('no call site pairs it with a sub-20px size token', () => {
    const offenders = displaySites().filter((line) =>
      BELOW_FLOOR.some((t) => new RegExp(`\\btext-${t}\\b`).test(line)),
    )
    expect(offenders, `display face below 20px:\n${offenders.join('\n')}`).toEqual([])
  })

  it('no call site pairs it with an arbitrary size under 20px', () => {
    const offenders = displaySites().filter((line) => {
      const m = line.match(/text-\[(\d+)px\]/)
      return m !== null && Number(m[1]) < 20
    })
    expect(offenders, `display face below 20px:\n${offenders.join('\n')}`).toEqual([])
  })

  it('is set at weight 500, the only weight the spec allows it', () => {
    // Newsreader is loaded at 400/500/600. 600 rendered a real weight, so nothing looked
    // broken while 30 sites carried it — which is exactly why this needs a gate rather than
    // an eye. Brand_and_Design.md: "Newsreader 500", full stop.
    const offenders = displaySites().filter((l) =>
      /\bfont-(thin|light|normal|semibold|bold|extrabold|black)\b/.test(l),
    )
    expect(offenders, `display face at a weight other than 500:\n${offenders.join('\n')}`).toEqual(
      [],
    )
  })

  it('the match score is never set in the display face', () => {
    // A serif number with tabular-nums is the one thing a display face must never render.
    const offenders = displaySites().filter((l) => l.includes('MatchCircle.tsx'))
    expect(offenders, `the match score is in the display face:\n${offenders.join('\n')}`).toEqual(
      [],
    )
  })
})
