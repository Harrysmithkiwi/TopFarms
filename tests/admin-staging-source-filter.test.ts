import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// T-2 source filter — security + drift guards. Static-source posture suite:
// parse the migration with comments stripped so assertions are about EXECUTABLE
// SQL, and cross-check the "mine" classification against lead-intake's
// ALLOWED_SOURCES so the two can't silently diverge.

const RAW = readFileSync('supabase/migrations/054_staging_source_filter.sql', 'utf8')
const SQL = RAW.split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')
const body = SQL.split(/AS \$\$/)[1]?.split(/\$\$;/)[0] ?? ''

const INTAKE = readFileSync('supabase/functions/lead-intake/index.ts', 'utf8')

// Pull a quoted-string list out of a snippet, e.g. ARRAY['a','b'] or = ['a','b'].
function quotedList(s: string): string[] {
  return (s.match(/'([^']+)'/g) ?? []).map((q) => q.slice(1, -1)).sort()
}

describe('054 admin_leads_staging_list — source filter security (T-2)', () => {
  it('drops the old 5-arg overload before recreating (no ambiguous resolution)', () => {
    expect(SQL).toMatch(
      /DROP FUNCTION IF EXISTS public\.admin_leads_staging_list\(text, int, int, text, text\)/,
    )
  })

  it('adds p_source defaulting to all (backward-compatible with the T-1 main)', () => {
    expect(SQL).toMatch(/p_source\s+text\s+DEFAULT\s+'all'/)
  })

  it('validates p_source against the mine/harvested/all allowlist, defaulting to all', () => {
    for (const token of ['mine', 'harvested']) {
      expect(SQL).toMatch(new RegExp(`WHEN\\s+'${token}'\\s+THEN\\s+'${token}'`))
    }
    // unknown → all (the safe, non-hiding default)
    const sourceCase = SQL.split(/v_source text :=/)[1]?.split('END')[0] ?? ''
    expect(sourceCase).toMatch(/ELSE\s+'all'/)
  })

  it('NEVER interpolates p_source and uses no dynamic SQL', () => {
    expect(SQL).not.toMatch(/\|\|\s*p_source/)
    expect(SQL).not.toMatch(/p_source\s*\|\|/)
    expect(body).not.toMatch(/\bEXECUTE\b/i)
  })

  it('filters via the manual-sources array, not string-built SQL', () => {
    // The predicate keys off the array membership, parameterised by the token.
    expect(body).toMatch(/= ANY\(v_manual_sources\)/)
    expect(body).toMatch(/v_source = 'mine'\s+AND/)
    expect(body).toMatch(/v_source = 'harvested'\s+AND NOT/)
  })

  it('preserves the SECURITY DEFINER + gate-first posture', () => {
    expect(SQL).toMatch(/SECURITY DEFINER/)
    expect(SQL).toMatch(/SET search_path = public/)
    expect(body).toMatch(/BEGIN\s+PERFORM public\._admin_gate\(\);/)
  })
})

describe('054 "mine" classification stays in sync with lead-intake (drift guard)', () => {
  it("the RPC's v_manual_sources == lead-intake ALLOWED_SOURCES", () => {
    const rpcArray = quotedList(SQL.split(/v_manual_sources text\[\] :=/)[1]?.split(';')[0] ?? '')
    const intakeArray = quotedList(INTAKE.split(/ALLOWED_SOURCES\s*=/)[1]?.split(']')[0] ?? '')
    expect(rpcArray.length).toBeGreaterThan(0)
    expect(rpcArray).toEqual(intakeArray)
  })
})
