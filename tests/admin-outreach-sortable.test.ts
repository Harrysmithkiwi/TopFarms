import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// T-5 outreach sort — security + urgency-ordinal guard. Static-source posture
// suite: parse the migration comments-stripped so assertions are about
// EXECUTABLE SQL.

const RAW = readFileSync('supabase/migrations/055_outreach_sortable.sql', 'utf8')
const SQL = RAW.split('\n')
  .map((l) => l.replace(/--.*$/, ''))
  .join('\n')
const body = SQL.split(/AS \$\$/)[1]?.split(/\$\$;/)[0] ?? ''
const orderBy = SQL.split(/ORDER BY/i)[1]?.split(/LIMIT/i)[0] ?? ''

describe('055 admin_outreach_list — sort security (T-5)', () => {
  it('drops the old 3-arg overload before recreating', () => {
    expect(SQL).toMatch(/DROP FUNCTION IF EXISTS public\.admin_outreach_list\(text, int, int\)/)
  })

  it('adds p_sort/p_dir with safe defaults', () => {
    expect(SQL).toMatch(/p_sort\s+text\s+DEFAULT\s+'captured'/)
    expect(SQL).toMatch(/p_dir\s+text\s+DEFAULT\s+'desc'/)
  })

  it('validates p_sort against the status/captured allowlist, defaulting to captured', () => {
    expect(SQL).toMatch(/WHEN\s+'status'\s+THEN\s+'status'/)
    expect(SQL).toMatch(/WHEN\s+'captured'\s+THEN\s+'captured'/)
    expect(SQL).toMatch(/ELSE\s+'captured'/)
  })

  it('NEVER interpolates p_sort and uses no dynamic SQL', () => {
    expect(SQL).not.toMatch(/\|\|\s*p_sort/)
    expect(SQL).not.toMatch(/p_sort\s*\|\|/)
    expect(body).not.toMatch(/\bEXECUTE\b/i)
  })

  it('sorts status by URGENCY ordinal (responded-first), not alphabetical', () => {
    // responded=1 < sent=2 < approved=3 < drafted=4 → first-click asc = responded top
    expect(orderBy).toMatch(
      /WHEN 'responded' THEN 1 WHEN 'sent' THEN 2\s+WHEN 'approved' THEN 3 WHEN 'drafted' THEN 4/,
    )
    // guard against an accidental alphabetical / workflow-order regression
    expect(orderBy).not.toMatch(/WHEN 'drafted' THEN 1/)
  })

  it('preserves the SECURITY DEFINER + gate-first posture', () => {
    expect(SQL).toMatch(/SECURITY DEFINER/)
    expect(SQL).toMatch(/SET search_path = public/)
    expect(body).toMatch(/BEGIN\s+PERFORM public\._admin_gate\(\);/)
  })
})
