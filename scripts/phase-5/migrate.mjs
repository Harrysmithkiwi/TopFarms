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

// Tailwind expresses alpha as `/NN`. Only colours that map to a known token are
// converted; an unrecognised rgb() is left for a human, because picking a token
// for an arbitrary colour is a design decision, not a transform.
const RGB_TOKENS = { '255,255,255': 'white', '0,0,0': 'black' }

const toClass = (prop, value) => {
  const p = PROP[prop]
  if (!p) return null
  const v = value.match(/^var\(--color-([a-z0-9-]+)\)$/)
  if (v) return `${p}-${v[1]}`
  const lit = LITERAL[value]
  if (lit) return `${p}-${lit}`
  const rgba = value.match(/^rgba?\(\s*(\d+\s*,\s*\d+\s*,\s*\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/)
  if (rgba) {
    const token = RGB_TOKENS[rgba[1].replace(/\s/g, '')]
    if (!token) return null
    const a = rgba[2] === undefined ? 1 : parseFloat(rgba[2])
    if (a === 1) return `${p}-${token}`
    const pct = Math.round(a * 100)
    return `${p}-${token}/${pct}`
  }
  return null
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

/**
 * Multi-property objects are ~100 of the 751 remaining and are where the real
 * bugs hide (the 3.95:1 error message was one). Convert only when EVERY property
 * maps to a utility — a partial conversion would silently drop styling, which is
 * worse than leaving the object alone. Returns null to defer to a human.
 */
const multiToClasses = (body) => {
  const props = [...body.matchAll(/([A-Za-z]+):\s*'([^']*)'\s*,?/g)]
  if (!props.length) return null
  // Reject if anything in the body was not a simple quoted string prop.
  const consumed = props.reduce((n, m) => n + m[0].length, 0)
  if (body.replace(/\s|,/g, '').length > consumed) {
    const stripped = body.replace(/([A-Za-z]+):\s*'([^']*)'\s*,?/g, '').replace(/[\s,]/g, '')
    if (stripped.length) return null
  }
  const classes = []
  for (const [, prop, value] of props) {
    const c = toClass(prop, value)
    if (!c) return null
    classes.push(c)
  }
  return classes.join(' ')
}

// Repeat until no more matches — each edit shifts offsets.
for (;;) {
  // Multi-property first: the single-prop pattern would otherwise not match them
  // and they would never be attempted.
  const mm = /\s*style=\{\{([^{}]*)\}\}/.exec(src)
  if (mm && !/^\s*[A-Za-z]+:\s*'[^']*'\s*$/.test(mm[1])) {
    const cls = multiToClasses(mm[1])
    if (cls) {
      const tag = enclosingTag(src, mm.index)
      if (tag) {
        const [ts, te] = tag
        let tagSrc = src.slice(ts, te + 1)
        const rel = mm.index - ts
        tagSrc = tagSrc.slice(0, rel) + tagSrc.slice(rel + mm[0].length)
        const strCn = /className="([^"]*)"/.exec(tagSrc)
        if (strCn) {
          tagSrc = tagSrc.replace(strCn[0], `className="${cls} ${strCn[1]}"`)
        } else {
          const tagName = /^<([A-Za-z][\w.]*)/.exec(tagSrc)
          if (tagName) tagSrc = tagSrc.replace(tagName[0], `${tagName[0]} className="${cls}"`)
          else { skipped.push(`multi: unparsed tag`); src = src.replace(mm[0], mm[0].replace('style={{', 'styleXX={{')); continue }
        }
        src = src.slice(0, ts) + tagSrc + src.slice(te + 1)
        applied++
        continue
      }
    }
    skipped.push(`multi-prop: ${mm[1].replace(/\s+/g, ' ').trim().slice(0, 70)}`)
    src = src.replace(mm[0], mm[0].replace('style={{', 'styleXX={{'))
    continue
  }

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
