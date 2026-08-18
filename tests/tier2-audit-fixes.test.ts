import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Audit Tier 2 — four defects that all share one shape: something that LOOKS like it works.
// A filter that renders and filters nothing, a retry that retries nothing, a guard whose
// default is the unguarded branch, a chip that selects but cannot deselect. None of them
// error, so none of them would ever be reported by a user as broken — only as "the site is
// a bit odd".

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8')

const SEARCH = read('src/pages/jobs/JobSearch.tsx')
const CONTACT = read('src/hooks/useSeekerContact.ts')
const CHIPS = read('src/components/ui/ChipSelector.tsx')
const PHOTOS = read('src/pages/verification/FarmPhotoUpload.tsx')

describe('F-18 — the herd-size filter actually filters', () => {
  it('groups a two-sided bucket with and()', () => {
    // A COMMA IS PostgREST'S OR SEPARATOR. 'herd_size_min.lte.500,herd_size_max.gte.200'
    // joined into .or() became two independent OR terms, so "200-500" asked for
    // min<=500 OR max>=200 — satisfied by almost every job on the board.
    //
    // Proven in SQL 2026-08-18, filtering the 200-500 bucket over three jobs:
    //   old form  ->  120-180 MATCH, 300-450 MATCH, 1400-1600 MATCH   (all three)
    //   new form  ->  120-180 no,    300-450 MATCH, 1400-1600 no
    // The or(and(...)) syntax was confirmed against live PostgREST (HTTP 200).
    expect(SEARCH).toMatch(/return terms\.length === 1 \? terms\[0\] : `and\(\$\{terms\.join\(','\)\}\)`/)
  })

  it('expresses buckets as bounds rather than hand-written predicate strings', () => {
    expect(SEARCH).toMatch(/const BOUNDS: Record<string, \{ lo\?: number; hi\?: number \}>/)
    // Comment lines stripped: the old predicate string is quoted in the explanation above the
    // fix, and an assertion that cannot tell code from commentary is not an assertion.
    const code = SEARCH.split('\n')
      .filter((l) => !l.trimStart().startsWith('//'))
      .join('\n')
    expect(code).not.toMatch(/'herd_size_min\.lte\.500,herd_size_max\.gte\.200'/)
  })

  it('agrees with the scoring function on what overlap means', () => {
    // `_herd_bucket_overlaps` (migration 093) tests job.min <= bucket.hi AND job.max >=
    // bucket.lo. If search and scoring disagree, a job the search shows scores as a herd-size
    // miss — and nothing anywhere reports the contradiction.
    expect(SEARCH).toMatch(/herd_size_min\.lte\.\$\{b\.hi\}/)
    expect(SEARCH).toMatch(/herd_size_max\.gte\.\$\{b\.lo\}/)
    const migration = read('supabase/migrations/093_match_score_v3.sql')
    expect(migration).toMatch(/_herd_bucket_overlaps/)
  })
})

describe('F-14 — a save cannot null a name it never loaded', () => {
  it('the flag means loaded, not not-failed', () => {
    // `prefillFailed` defaulted to FALSE, which claims the prefill SUCCEEDED — so the
    // full-overwrite branch was the DEFAULT, and a save landing before the fetch settled took
    // it. The guard covered a failed read and not a pending one, which is the commoner case.
    expect(CONTACT).toMatch(/const \[loaded, setLoaded\] = useState\(false\)/)
    expect(CONTACT).not.toMatch(/const \[prefillFailed, setPrefillFailed\]/)
  })

  it('only settles true after a clean read', () => {
    expect(CONTACT).toMatch(/setLoaded\(true\)/)
    // The error branch returns without setting it, so failed and pending behave identically.
    expect(CONTACT).toMatch(/return {3}\/\/ `loaded` stays false/)
  })

  it('the partial patch is the default, not the exception', () => {
    expect(CONTACT).toMatch(/const patch: Record<string, string \| null> = !loaded/)
  })
})

describe('F-34 — a single-select chip can be cleared', () => {
  it('toggles rather than always setting', () => {
    // Single mode was `onChange([optionValue])`: select, never deselect. The only caller is
    // the OPTIONAL min_salary band, so a seeker who tapped one by accident could not get back
    // to "no minimum". Multi mode always toggled; single silently did not.
    expect(CHIPS).toMatch(/onChange\(value\.includes\(optionValue\) \? \[\] : \[optionValue\]\)/)
  })
})

describe('F-25 — the retry button refetches', () => {
  it('the photos effect depends on the nonce', () => {
    expect(PHOTOS).toMatch(/\}, \[session\?\.user\?\.id, reloadNonce\]\)/)
  })

  it('retry bumps the nonce instead of only clearing the flag', () => {
    // Clearing the flag left photosError false, loadingPhotos false and photos empty — and
    // the render guard is `!photosError && (loadingPhotos || photos.length > 0)`, so retrying
    // replaced the error with an EMPTY PANEL saying nothing at all.
    expect(PHOTOS).toMatch(/onRetry=\{\(\) => setReloadNonce\(\(n\) => n \+ 1\)\}/)
    expect(PHOTOS).not.toMatch(/onRetry=\{\(\) => setPhotosError\(false\)\}/)
  })

  it('clears the error when the refetch starts', () => {
    // Otherwise the nonce refetches under a stale error flag and the panel stays hidden.
    expect(PHOTOS).toMatch(/setLoadingPhotos\(true\)\s*\n\s*setPhotosError\(false\)/)
  })
})
