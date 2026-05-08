// Phase 18.1 #4 — MarkFilledModal calls mark_job_filled RPC with correct args.
//
// Wave 0 RED scaffold. Wave 1 (plan 18.1-02) replaces it.todo() with real
// RTL + static-source assertions. Mirrors Phase 17-02/20-06 vi.hoisted precedent
// when GREEN body lands.

import { describe, it } from 'vitest'

describe('MarkFilledModal — mark_job_filled RPC contract', () => {
  it.todo('handleConfirm calls supabase.rpc("mark_job_filled", { p_job_id, p_applicant_id })')
  it.todo('does NOT make legacy .from("applications").update() or .from("jobs").update() calls')
  it.todo('MarkFilledModal source contains exactly one .rpc("mark_job_filled") call site')
})
