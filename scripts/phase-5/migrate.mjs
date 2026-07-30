// Phase 5 Task 5.1 — per-file inline-colour-style -> Tailwind utility transform.
//   node migrate.mjs <file> [--dry]
// Handles ONLY single-property colour styles, merged into the enclosing tag's
// className. Anything else is left alone and reported, so nothing is silently
// dropped. Run on ONE file at a time; diff-review before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const [file, ...flags] = process.argv.slice(2)
const dry = flags.includes('--dry')
let src = readFileSync(file, 'utf8')

const PROP = { color: 'text', backgroundColor: 'bg', borderColor: 'border' }

// `var(--color-x)` -> token name `x`; bare literals map to Tailwind names.
const LITERAL = { white: 'white', transparent: 'transparent' }
const toClass = (prop, value) => {
  const p = PROP[prop]
  if (!p) return null
  const v = value.match(/^var\(--color-([a-z0-9-]+)\)$/)
  if (v) return `${p}-${v[1]}`
  const lit = LITERAL[value]
  return lit ? `${p}-${lit}` : null
}

/** Find the JSX tag containing index i: returns [tagStart, tagEnd]. */
const enclosingTag = (s, i) => {
  const start = s.lastIndexOf('<', i)
  if (start < 0) return null
  // Walk forward respecting nested {} so `className={cn(...)}` does not end the tag early.
  let depth = 0
  for (let j = start; j < s.length; j++) {
    const c = s[j]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return [start, j]
  }
  return null
}

const skipped = []
let applied = 0

// Repeat until no more matches — each edit shifts offsets.
for (;;) {
  const m = /\s*style=\{\{\s*([A-Za-z]+):\s*'([^']+)'\s*\}\}/.exec(src)
  if (!m) break
  const whole = m[0]
  const cls = toClass(m[1], m[2])
  if (!cls) {
    skipped.push(`${m[1]}: ${m[2]}`)
    // Neutralise so the loop advances, restored verbatim at the end.
    src = src.replace(whole, whole.replace('style={{', 'styleXX={{'))
    continue
  }
  const tag = enclosingTag(src, m.index)
  if (!tag) { skipped.push(`no enclosing tag for ${cls}`); src = src.replace(whole, whole.replace('style={{', 'styleXX={{')); continue }

  let [ts, te] = tag
  let tagSrc = src.slice(ts, te + 1)
  const rel = m.index - ts
  // Remove the style attribute from the tag.
  tagSrc = tagSrc.slice(0, rel) + tagSrc.slice(rel + whole.length)

  // Merge the class into an existing className, else add one.
  const strCn = /className="([^"]*)"/.exec(tagSrc)
  const tplCn = /className=\{`([^`]*)`\}/.exec(tagSrc)
  if (strCn) {
    tagSrc = tagSrc.replace(strCn[0], `className="${strCn[1]} ${cls}".trim()`.replace('".trim()', '"'))
  } else if (tplCn) {
    tagSrc = tagSrc.replace(tplCn[0], `className={\`${tplCn[1]} ${cls}\`}`)
  } else if (/className=\{/.test(tagSrc)) {
    skipped.push(`${cls} — className is an expression (cn()/ternary), needs hand edit`)
    src = src.slice(0, ts) + src.slice(ts).replace(whole, whole.replace('style={{', 'styleXX={{'))
    continue
  } else {
    const tagName = /^<([A-Za-z][\w.]*)/.exec(tagSrc)
    if (!tagName) { skipped.push(`${cls} — unparsed tag`); src = src.replace(whole, whole.replace('style={{', 'styleXX={{')); continue }
    tagSrc = tagSrc.replace(tagName[0], `${tagName[0]} className="${cls}"`)
  }
  src = src.slice(0, ts) + tagSrc + src.slice(te + 1)
  applied++
}

src = src.replaceAll('styleXX={{', 'style={{')

console.log(`${file}: ${applied} migrated, ${skipped.length} left for hand edit`)
for (const s of new Set(skipped)) console.log(`   SKIP  ${s}`)
if (!dry) writeFileSync(file, src)
