import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// A retired model ID is a 404, and a 404 inside a swallowing retry loop is indistinguishable
// from "the model had nothing to say" — which is how `claude-sonnet-4-20250514` sat dead in two
// employer- and seeker-facing functions until it was probed directly against the live API on
// 2026-08-19. Nothing failed loudly; the functions just wrote null.
//
// This can't call the API (no key in CI, and a test that needs credit is a test that gets
// skipped), so it does the next best thing: it pins every model ID in the edge functions to a
// reviewed allowlist. Adding a new one fails here until someone has checked it resolves.

const FUNCTIONS = join(process.cwd(), 'supabase/functions')

/**
 * Model IDs verified to return HTTP 200 from api.anthropic.com on 2026-08-19.
 * Before adding one, actually call it — `claude-sonnet-4-20250514` looked no different from
 * these in the source until it was tried.
 */
const VERIFIED_MODEL_IDS = new Set([
  'claude-sonnet-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
])

/** Retired or otherwise known-dead. Present so the failure message can name the reason. */
const KNOWN_DEAD: Record<string, string> = {
  'claude-sonnet-4-20250514': 'retired — returns 404. Replaced by claude-sonnet-5 on 2026-08-19.',
  'claude-3-5-sonnet-20241022': 'retired 2025-10-28',
  'claude-3-opus-20240229': 'retired 2026-01-05',
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : []
  })
}

const found = walk(FUNCTIONS).flatMap((file) => {
  const src = readFileSync(file, 'utf-8')
  return [...src.matchAll(/model:\s*'(claude-[a-z0-9.-]+)'/g)].map((m) => ({
    file: file.replace(`${process.cwd()}/`, ''),
    id: m[1],
  }))
})

describe('every Anthropic model ID in the edge functions has been verified live', () => {
  it('finds model IDs to check at all (guards against the regex silently matching nothing)', () => {
    expect(found.length).toBeGreaterThan(0)
  })

  it('uses no retired model ID', () => {
    const dead = found.filter((f) => f.id in KNOWN_DEAD)
    expect(
      dead.map((f) => `${f.file}: ${f.id} — ${KNOWN_DEAD[f.id]}`),
      'a retired model returns 404, and these call sites swallow it into a null',
    ).toEqual([])
  })

  it('uses only IDs from the verified allowlist', () => {
    const unknown = found.filter((f) => !VERIFIED_MODEL_IDS.has(f.id))
    expect(
      unknown.map((f) => `${f.file}: ${f.id}`),
      'call this ID against api.anthropic.com, then add it to VERIFIED_MODEL_IDS with the date',
    ).toEqual([])
  })

  it('the two short-output functions disable thinking so max_tokens is not shared', () => {
    // Sonnet 5 thinks adaptively when `thinking` is omitted, and max_tokens caps thinking plus
    // response text together. At 150-200 tokens that is a budget these two cannot afford to share.
    for (const fn of ['generate-candidate-summary', 'generate-match-explanation']) {
      const src = readFileSync(join(FUNCTIONS, fn, 'index.ts'), 'utf-8')
      expect(src, `${fn} must pin thinking`).toMatch(/thinking:\s*\{\s*type:\s*'disabled'\s*\}/)
    }
  })

  it('no Anthropic call site swallows its error unlogged', () => {
    // `catch (_err) { attempt++ }` is what turned a 404 into weeks of silent nulls.
    //
    // Comments are stripped first: the fix's own comment quotes the defect verbatim, and a regex
    // that cannot tell code from commentary fails on the commit that repairs it. Second time this
    // exact trap has bitten in this session — see tests/search-hero-wired.test.ts.
    const code = (src: string) =>
      src
        .split('\n')
        .filter((l) => {
          const t = l.trimStart()
          return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
        })
        .join('\n')
    for (const fn of ['generate-candidate-summary', 'generate-match-explanation']) {
      const src = code(readFileSync(join(FUNCTIONS, fn, 'index.ts'), 'utf-8'))
      expect(src, `${fn} silently swallows Anthropic failures`).not.toMatch(/catch \(_err\)/)
      expect(src).toMatch(/console\.error\(/)
    }
  })
})
