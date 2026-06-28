import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// T-1 server-side sort security guard. Static-source posture suite (same style
// as admin-leads-rpcs.test.ts): parse the migration with comments stripped, so
// every assertion is about EXECUTABLE SQL — a reassuring doc comment can't make
// the test pass. The load-bearing property: p_sort never reaches the ORDER BY
// as data; it is validated against a fixed allowlist and mapped to hard-coded
// column expressions.

const RAW = readFileSync('supabase/migrations/053_staging_sortable.sql', 'utf8')
// Strip line comments so doc prose ("p_sort is NEVER interpolated") can't be
// what satisfies the regexes below.
const SQL = RAW.split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')

// The ORDER BY ... LIMIT block — the only place sort can do damage.
const orderBy = SQL.split(/ORDER BY/i)[1]?.split(/LIMIT/i)[0] ?? ''
// The PL/pgSQL body (between the dollar-quotes) — excludes the GRANT EXECUTE line
// so the dynamic-SQL guard isn't a false positive on the grant keyword.
const body = SQL.split(/AS \$\$/)[1]?.split(/\$\$;/)[0] ?? ''

describe('053 admin_leads_staging_list — sort security (T-1)', () => {
  it('drops the old 3-arg overload before recreating (no ambiguous PostgREST resolution)', () => {
    expect(SQL).toMatch(/DROP FUNCTION IF EXISTS public\.admin_leads_staging_list\(text, int, int\)/)
  })

  it('adds p_sort/p_dir with safe defaults', () => {
    expect(SQL).toMatch(/p_sort\s+text\s+DEFAULT\s+'captured'/)
    expect(SQL).toMatch(/p_dir\s+text\s+DEFAULT\s+'desc'/)
  })

  it('NEVER interpolates p_sort/p_dir into SQL and uses no dynamic SQL', () => {
    // No string concatenation of the sort params, no EXECUTE anywhere.
    expect(SQL).not.toMatch(/\|\|\s*p_sort/)
    expect(SQL).not.toMatch(/p_sort\s*\|\|/)
    expect(SQL).not.toMatch(/\|\|\s*p_dir/)
    expect(SQL).not.toMatch(/p_dir\s*\|\|/)
    // No dynamic SQL in the function body (GRANT EXECUTE lives outside it).
    expect(body).not.toMatch(/\bEXECUTE\b/i)
  })

  it('validates p_sort against exactly the four allowlist tokens, defaulting to captured', () => {
    for (const token of ['captured', 'confidence', 'lane', 'region']) {
      expect(SQL).toMatch(new RegExp(`WHEN\\s+'${token}'\\s+THEN\\s+'${token}'`))
    }
    // unknown → captured
    expect(SQL).toMatch(/ELSE\s+'captured'/)
  })

  it('the ORDER BY references only whitelisted column expressions', () => {
    // The four allowed sort keys, and nothing else.
    expect(orderBy).toMatch(/st\.confidence/)
    expect(orderBy).toMatch(/st\.structured->>'lane'/)
    expect(orderBy).toMatch(/st\.structured->>'region'/)
    expect(orderBy).toMatch(/st\.created_at/)
    // No sort param leaks into the ORDER BY, and no non-whitelisted jsonb path.
    expect(orderBy).not.toMatch(/p_sort|p_dir/)
    const jsonbPaths = orderBy.match(/structured->>'(\w+)'/g) ?? []
    for (const p of jsonbPaths) {
      expect(["structured->>'lane'", "structured->>'region'"]).toContain(p)
    }
  })

  it('preserves the SECURITY DEFINER + gate-first posture', () => {
    expect(SQL).toMatch(/SECURITY DEFINER/)
    expect(SQL).toMatch(/SET search_path = public/)
    // _admin_gate is the first statement in the body.
    const body = SQL.split(/AS \$\$/)[1] ?? ''
    expect(body).toMatch(/BEGIN\s+PERFORM public\._admin_gate\(\);/)
  })

  it('re-applies grants after the drop (REVOKE from PUBLIC/anon, GRANT to authenticated)', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.admin_leads_staging_list\(text, int, int, text, text\) FROM PUBLIC, anon/)
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_leads_staging_list\(text, int, int, text, text\) TO authenticated/)
  })
})
