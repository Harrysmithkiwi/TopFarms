#!/usr/bin/env node
/**
 * design-gate — a ratchet on hardcoded design values in gated-portal code.
 *
 * WHY THIS EXISTS RATHER THAN impeccable's detect.mjs, which the phase brief
 * originally called for: detect.mjs ships inside the impeccable plugin under
 * ~/.claude/plugins/. It is not a repo dependency and the vendored copy was
 * deliberately deleted (5fe3de8) to stop two versions loading at once. CI has no
 * plugin, so "add detect.mjs to CI" cannot run. This is the repo-owned subset.
 *
 * WHAT IT CHECKS, and nothing more:
 *   1. Arbitrary font-size literals — `text-[19px]`, `fontSize: '19px'` — against
 *      the declared type ramp.
 *   2. Hex colour literals against the declared palette.
 *
 * WHAT IT DOES NOT CHECK, stated so the number is not mistaken for coverage:
 *   - Tailwind size utilities (`text-sm` = 14px is off-ramp and invisible here).
 *     That is deliberate: the 14px group is ~49 findings and is an OPEN ruling.
 *     Wiring it in before that ruling would pin the wrong number, which is the
 *     mistake Gate A already caught once.
 *   - Everything judgement-shaped: hierarchy, states, copy, whether an empty
 *     state reads as good news. A green run here means no NEW hardcoded values.
 *     It does not mean the design is good. Use /impeccable critique for that.
 *
 * SOURCE OF TRUTH IS src/index.css, not docs/DESIGN.md. Canon says the stylesheet
 * wins on any hex, and it has been right three times: the doc's YAML declared 5
 * type steps against the prose's 8, it omitted --text-micro and --text-label
 * entirely, and its palette still published text-subtle #8A968D — the value that
 * failed contrast at 3.08:1 and was replaced by #647268. A gate reading the doc
 * would have enforced a WCAG failure.
 *
 * Usage: node scripts/design-gate.mjs [--max N] [--list]
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CSS = path.join(ROOT, 'src/index.css')

// Public marketing answers to docs/design/v11-DIRECTIVE.md and is settled — a
// VISUAL finding there is discarded, not filed (CLAUDE.md §10). index.css is the
// source of truth, so it cannot violate itself.
const EXCLUDE = [
  'src/index.css',
  'src/components/landing/',
  'src/pages/Home',
  'src/pages/Pricing',
  'src/pages/ForEmployers',
  'src/pages/legal/',
  'src/components/layout/AuthLayout',
]

// Third-party brand marks. You cannot recolour someone else's logo, so these are
// outside the palette by necessity, not drift. Narrow and named on purpose —
// anything not on this list is a finding.
const THIRD_PARTY_BRAND = new Set([
  '#4285f4', '#34a853', '#fbbc05', '#ea4335', // Google
  '#1877f2', // Facebook
])

const css = fs.readFileSync(CSS, 'utf8')
const palette = new Set(
  [...css.matchAll(/--color-[a-z0-9-]+:\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => m[1].toLowerCase()),
)
// Ramp: the --text-* tokens plus the steps declared in DESIGN.md's typography block.
const ramp = new Set([...css.matchAll(/--text-[a-z0-9-]+:\s*(\d+)px/g)].map((m) => m[1]))
const design = fs.readFileSync(path.join(ROOT, 'docs/DESIGN.md'), 'utf8')
for (const m of design.split('\n---')[0].matchAll(/fontSize:\s*"(\d+)px"/g)) ramp.add(m[1])

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(tsx|ts|css)$/.test(e.name)) out.push(p)
  }
  return out
}

const findings = []
for (const file of walk(path.join(ROOT, 'src'))) {
  const rel = path.relative(ROOT, file)
  if (EXCLUDE.some((x) => rel.startsWith(x))) continue
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/\bimpeccable-disable\b/.test(line)) return
    // Comments are where a fix records the value it replaced. Flagging those
    // would make documenting a change cost you a finding.
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
    for (const m of line.matchAll(/text-\[(\d+)px\]|fontSize:\s*['"](\d+)px['"]/g)) {
      const px = m[1] ?? m[2]
      if (!ramp.has(px)) findings.push({ rel, line: i + 1, kind: 'font-size', value: `${px}px` })
    }
    for (const m of line.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const hex = m[0].toLowerCase()
      if (!palette.has(hex) && !THIRD_PARTY_BRAND.has(hex))
        findings.push({ rel, line: i + 1, kind: 'color', value: m[0] })
    }
  })
}

const max = Number(process.argv[process.argv.indexOf('--max') + 1] ?? Infinity)
if (process.argv.includes('--list') || findings.length > max) {
  for (const f of findings) console.log(`${f.rel}:${f.line}  ${f.kind}  ${f.value}`)
}
console.log(
  `design-gate: ${findings.length} hardcoded value(s) in gated-portal code` +
    (Number.isFinite(max) ? ` (pin ${max})` : ''),
)
console.log(
  'Mechanical only — arbitrary literals vs src/index.css. Tailwind size utilities ' +
    'are NOT covered (the 14px ruling is open), and nothing here judges design quality.',
)
if (findings.length > max) {
  console.error(
    `\n✗ ${findings.length} > pin ${max}. Use a declared token, or ratchet the pin DOWN — never up.`,
  )
  process.exit(2)
}
process.exit(0)
