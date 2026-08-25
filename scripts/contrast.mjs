#!/usr/bin/env node
// Phase 4.1 contrast gate. Parses the design tokens out of src/index.css,
// computes WCAG 2.x contrast for every text-role token pair in use, prints the
// table (markdown — redirect to docs/design/contrast.md to regenerate the
// artefact), and exits non-zero if any TEXT pair is below 4.5:1.
//
//   node scripts/contrast.mjs            # table + gate
//   node scripts/contrast.mjs > docs/design/contrast.md   # regenerate artefact
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

// Token map. Resolves one level of var() indirection (brand-700 → brand-hover).
const raw = {}
for (const [, name, value] of css.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)) {
  raw[name] = value.trim()
}
const tokens = {}
for (const [name, value] of Object.entries(raw)) {
  const ref = value.match(/^var\((--color-[\w-]+)\)$/)
  tokens[name] = ref ? raw[ref[1]] : value
}

function lum(hex) {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`)
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg, bg) {
  const [hi, lo] = [lum(tokens[`--color-${fg}`]), lum(tokens[`--color-${bg}`])].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

// kind 'text' → gated at 4.5:1 (WCAG AA normal text).
// kind 'large' → gated at 3:1 (AA large text — ≥24px or ≥18.7px bold only).
// kind 'info' → recorded, not gated (fills, borders, decorative marks).
const PAIRS = [
  // Body text on every surface it appears on
  ['text', 'surface', 'text', 'body text on cards'],
  ['text', 'bg', 'text', 'body text on page bg'],
  ['text', 'surface-2', 'text', 'body text on tinted panels'],
  ['text-muted', 'surface', 'text', 'secondary text on cards'],
  ['text-muted', 'bg', 'text', 'secondary text on page bg'],
  ['text-muted', 'surface-2', 'text', 'secondary text on tinted panels'],
  ['text-muted', 'border', 'text', 'terminal Applied badge (SearchJobCard)'],
  ['text-subtle', 'surface', 'text', 'tertiary text on cards (darkened Phase 4.1)'],
  ['text-subtle', 'bg', 'text', 'tertiary text on page bg'],
  ['text-subtle', 'surface-2', 'text', 'tertiary text on tinted panels'],
  // Added 2026-08-24. These pairs render on real pages and were never gated; the
  // token failed all four and axe caught it on /jobs/:id the first time that sweep
  // had a job to visit. An ungated pair is an unmeasured pair.
  // The three v13 surfaces that used to sit here — cream, cream-2 and card — went with the
  // v13 token world in the design-system sync (row 7, 2026-08-25). Their tokens no longer
  // exist, and this script throws rather than skips on an unknown name: an ungated pair is
  // an unmeasured pair, so a typo must not quietly reduce coverage.
  ['text-subtle', 'paper', 'text', 'tertiary text on the v14 marketing canvas'],
  ['text-subtle', 'danger-bg', 'text', 'tertiary text on error panels'],
  ['text-subtle', 'info-bg', 'text', 'tertiary text on info panels'],
  ['text-subtle', 'warn-bg', 'text', 'tertiary text on warning panels'],
  // CTAs — brand demoted to fill/border; text & CTA fills use brand-hover
  ['text-on-brand', 'brand-hover', 'text', 'primary Button default (Phase 4.1 demotion)'],
  ['text-on-brand', 'brand-900', 'text', 'primary Button hover state'],
  ['brand-hover', 'surface', 'text', 'brand-coloured links / labels on white'],
  ['brand-hover', 'bg', 'text', 'brand-coloured links on page bg'],
  ['brand-hover', 'surface-2', 'text', 'brand-coloured links on tinted panels'],
  // Semantic text-on-tint tokens — each against its *-bg partner
  ['success-text-on-bg', 'success-bg', 'text', 'green Tag / MatchCircle high band'],
  ['warn-text-on-bg', 'warn-bg', 'text', 'warn Tag / MatchCircle mid band'],
  ['info-text-on-bg', 'info-bg', 'text', 'blue Tag (visa sponsorship)'],
  ['ai-text-on-bg', 'ai-bg', 'text', 'purple Tag / AI info boxes'],
  ['danger-text-on-bg', 'danger-bg', 'text', 'red Tag / error boxes'],
  // Semantic colours still used as text directly on light surfaces
  ['danger', 'surface', 'text', 'inline error text on white'],
  ['danger', 'bg', 'text', 'inline error text on page bg'],
  // Retired-as-text pairs, kept in the table as the record of WHY (all fail)
  ['brand', 'surface', 'text', 'brand as text — legal since brand moved to #15803D'],
  ['brand', 'bg', 'text', 'brand as text on the page ground'],
  ['text-on-brand', 'brand', 'info', 'RETIRED: old primary Button default'],
  ['warn', 'surface', 'info', 'fill/icon only — never text'],
  ['info', 'surface', 'info', 'fill/icon only — never text'],
  ['ai', 'surface', 'info', 'fill/icon only — never text'],
  ['success', 'success-bg', 'info', 'RETIRED as text: old green Tag (2.94, prompt said pass — it does not)'],
]

const rows = []
let failed = 0
for (const [fg, bg, kind, note] of PAIRS) {
  const r = ratio(fg, bg)
  const min = kind === 'text' ? 4.5 : kind === 'large' ? 3 : null
  const verdict = min === null ? 'n/a (not text)' : r >= min ? 'PASS' : 'FAIL'
  if (verdict === 'FAIL') failed++
  rows.push({ fg, bg, hexFg: tokens[`--color-${fg}`], hexBg: tokens[`--color-${bg}`], r, kind, verdict, note })
}

function t(name) {
  return tokens[`--color-${name}`]
}
console.log('# Token contrast — computed, not quoted')
console.log()
console.log(`Generated by \`node scripts/contrast.mjs\` from \`src/index.css\`.`)
console.log('Text pairs are gated at 4.5:1 (WCAG AA); the script exits non-zero on any text-pair failure.')
console.log('Rows marked `n/a (not text)` are fills/borders recorded for the audit trail — the token contract')
console.log('(src/index.css §Semantic) forbids using them as text.')
console.log()
console.log('| Foreground | Background | Ratio | Gate | Verdict | Where |')
console.log('|---|---|---|---|---|---|')
for (const row of rows) {
  const gate = row.kind === 'text' ? '4.5' : row.kind === 'large' ? '3.0' : '—'
  console.log(
    `| \`${row.fg}\` ${t(row.fg)} | \`${row.bg}\` ${t(row.bg)} | ${row.r.toFixed(2)} | ${gate} | ${row.verdict} | ${row.note} |`,
  )
}
console.log()
console.log(`Text pairs failing: ${failed}`)

// Source scan: a raw semantic colour used as TEXT on the same line as a tinted
// background is exactly the pattern that shipped the 1.93:1 orange Tag. The
// *-text-on-bg tokens exist for this; fail the gate if the raw pattern returns.
import { execSync } from 'node:child_process'
const rawOnTint = execSync(
  String.raw`grep -rnE 'text-(warn|info|ai|danger|brand)([ "'\''/]|$)' src --include='*.tsx' | grep -E 'bg-(warn|info|ai|danger|success)-bg|bg-brand-50|bg-brand/10|rgba\(74,124,47|rgba\(220,53,69' | grep -vE 'text-(warn|info|ai|danger|success|brand)-text-on-bg|hover:text|// ' || true`,
  { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' },
).trim()
if (rawOnTint) {
  console.log()
  console.log('Raw semantic text colour on a tinted background (use *-text-on-bg):')
  console.log(rawOnTint)
  process.exit(1)
}
// ── text-brand rule (Phase 5.1b) ────────────────────────────────────────────
// Phase 4.1 demoted --color-brand to a fill-and-border colour: white-on-brand
// and brand-on-white are both 3.30:1, which clears the 3:1 non-text bar and
// fails the 4.5:1 text bar. The tinted-background scan above cannot see this —
// brand-on-WHITE is the same defect in a different shape, and it survived Phase
// 4 on every route axe did not scan.
//
// Icons are legitimate at 3.30 (WCAG 1.4.11 non-text). We cannot infer element
// type reliably, so this FAILS CLOSED: an element whose tag is not a known icon
// must carry `contrast-exempt-non-text` within the preceding 3 lines, or the
// gate rejects it. An exemption is a claim someone signed, not a silent pass.
import { readdirSync, readFileSync as rf } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name)
    return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) ? [p] : []
  })

const SVG_TAGS = /^(svg|path|circle|rect|line|polyline|ellipse|polygon)$/

// Which tokens this scan polices. It was `text-brand` alone, back when --color-brand was
// #16A34A at 3.30:1. That token moved to #15803D on 2026-08-25 and is now legal as text, so
// the check had no subject left — but the SHAPE of it is the only thing in this repo that
// can tell an icon from a word. Repointed at the tokens the table above still labels
// "fill/icon only": each one is a base semantic colour whose readable partner is *-text-on-bg.
const FILL_ONLY = ['warn', 'info', 'ai', 'success']
const FILL_ONLY_RE = new RegExp(`text-(${FILL_ONLY.join('|')})(?![-a-zA-Z0-9])`)
const offenders = []
for (const file of walk(join(ROOT, 'src'))) {
  const src = rf(file, 'utf8')
  if (!FILL_ONLY_RE.test(src)) continue
  const icons = new Set()
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g))
    m[1].split(',').forEach((n) => icons.add(n.trim().split(' as ').pop().trim()))
  const lines = src.split('\n')
  lines.forEach((ln, i) => {
    if (!FILL_ONLY_RE.test(ln)) return
    // Skip comment lines: prose ABOUT the rule is not a use of it.
    if (/^\s*(\/\/|\*|\{?\/\*)/.test(ln)) return
    // The exemption may sit a few lines above the element it describes (JSX
    // forbids comments between attributes), so look back a whole element.
    if (lines.slice(Math.max(0, i - 10), i + 1).join(' ').includes('contrast-exempt-non-text')) return
    let tag = null
    for (let j = i; j >= 0 && j > i - 8; j--) {
      const m = /<([A-Za-z][\w.]*)/.exec(lines[j])
      if (m) { tag = m[1]; break }
    }
    if (tag && (icons.has(tag) || SVG_TAGS.test(tag) || /Icon$/.test(tag))) return
    offenders.push(`${file.replace(ROOT, '')}:${i + 1}  <${tag ?? '?'}>  ${ln.trim().slice(0, 80)}`)
  })
}
if (offenders.length) {
  console.log()
  console.log(`A fill-only token (${FILL_ONLY.join(', ')}) used as TEXT on a non-icon element.`)
  console.log('These are fills, borders and icons. For words on a tint use the matching')
  console.log('*-text-on-bg partner; add `contrast-exempt-non-text` only if it really is non-text:')
  offenders.forEach((o) => console.log(`  ${o}`))
  process.exit(1)
}

if (failed > 0) process.exit(1)
