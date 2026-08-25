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
 *   2. ANY hex colour literal outside src/index.css. Not "any hex that is off-palette" —
 *      any hex at all. A literal that happens to equal a token today is the thing that
 *      stops equalling it tomorrow: root.tsx's theme-color held the deep green through
 *      three sync rows and only became visible when --color-brand-900 moved and the value
 *      stopped matching anything. Six exceptions are named below; everything else fails.
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

// index.css is the source of truth, so it cannot violate itself. Nothing else is excluded.
//
// The marketing surface used to be: landing/, Home, Pricing, ForEmployers, legal/ and
// AuthLayout were all skipped because CLAUDE.md §10 said a visual finding there was
// discarded. That rule was REVOKED on 2026-08-25 — there is one design system now, and a
// gate that cannot see half the product is not a gate. Dropping the exclusions added eight
// font-size findings and zero colour findings, which is its own small piece of evidence
// that the marketing surface was already on the tokens.
const EXCLUDE = ['src/index.css']

/**
 * The six sanctioned hex literals, each with the reason it cannot be a token.
 * A literal not on this list is a finding, whatever its value.
 */
const ALLOWED = [
  // Stripe Elements takes a JS object, not CSS, and cannot resolve a custom property.
  // colorPrimary mirrors --color-brand and must be updated by hand when it moves.
  { file: 'src/components/stripe/PaymentForm.tsx', why: 'Stripe Elements cannot read CSS variables' },
  // Google's brand mark. You cannot recolour someone else's logo.
  { file: 'src/pages/auth/Login.tsx', why: "Google's brand mark in the OAuth button SVG" },
  { file: 'src/pages/auth/SignUp.tsx', why: "Google's brand mark in the OAuth button SVG" },
  // A <meta> tag has no cascade to read a variable from.
  { file: 'src/root.tsx', why: 'theme-color meta tag mirrors --color-brand-900' },
]

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
  const allowed = ALLOWED.some((a) => rel === a.file)
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  // Block-comment state, tracked ACROSS lines. Testing whether a line starts with a marker
  // is not enough: a continuation line inside /* */ or {/* */} begins with plain prose, and
  // three separate gates in this repo have now failed on their own explanatory comments.
  let inBlock = false
  lines.forEach((line, i) => {
    const t = line.trim()
    const wasInBlock = inBlock
    const opens = (line.match(/\/\*/g) ?? []).length
    const closes = (line.match(/\*\//g) ?? []).length
    if (opens > closes) inBlock = true
    else if (closes > opens) inBlock = false
    if (wasInBlock || inBlock) return
    if (/\bimpeccable-disable\b/.test(line)) return
    // Comments are where a fix records the value it replaced. Flagging those
    // would make documenting a change cost you a finding.
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
    for (const m of line.matchAll(/text-\[(\d+)px\]|fontSize:\s*['"](\d+)px['"]/g)) {
      const px = m[1] ?? m[2]
      if (!ramp.has(px)) findings.push({ rel, line: i + 1, kind: 'font-size', value: `${px}px` })
    }
    if (allowed) return
    // `&#8599;` is an HTML entity for an arrow, not a colour. Strip entities before the
    // hex scan or the gate fails CI on a glyph.
    const scan = line.replace(/&#\d+;/g, '')
    for (const m of scan.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      findings.push({ rel, line: i + 1, kind: 'color', value: m[0] })
    }
  })
}

const max = Number(process.argv[process.argv.indexOf('--max') + 1] ?? Infinity)
if (process.argv.includes('--list') || findings.length > max) {
  for (const f of findings) console.log(`${f.rel}:${f.line}  ${f.kind}  ${f.value}`)
}
console.log(
  `design-gate: ${findings.length} hardcoded value(s) in src/` +
    (Number.isFinite(max) ? ` (pin ${max})` : ''),
)
console.log(
  'Colour: ANY hex outside src/index.css fails — six named exceptions in ALLOWED.\n' +
    'Size: arbitrary literals vs the declared ramp; Tailwind size utilities are NOT covered ' +
    '(the 14px ruling is open).\nNothing here judges design quality.',
)
if (findings.length > max) {
  console.error(
    `\n✗ ${findings.length} > pin ${max}. Use a declared token, or ratchet the pin DOWN — never up.`,
  )
  process.exit(2)
}
process.exit(0)
