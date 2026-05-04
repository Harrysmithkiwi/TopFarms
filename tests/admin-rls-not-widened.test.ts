import { describe, it } from 'vitest'

// CRITICAL — empirical proof that introducing migration 023 + admin RPCs did NOT
// widen any existing seeker or employer's data access. See 20-VALIDATION.md
// "Critical Validation: RLS Not-Widened Proof" + RESEARCH.md § "Critical Validation".
describe('admin RLS not-widened proof (ADMIN-RLS-NEG)', () => {
  it.todo('ADMIN-RLS-NEG-1: seeker JWT SELECT count(*) FROM jobs WHERE status=active returns identical count pre/post migration 023')
  it.todo('ADMIN-RLS-NEG-1: seeker JWT SELECT count(*) FROM match_scores returns identical count pre/post migration 023')
  it.todo('ADMIN-RLS-NEG-2: employer JWT SELECT count(*) FROM applications returns identical count pre/post migration 023')
  it.todo('ADMIN-RLS-NEG-2: employer JWT SELECT count(*) FROM jobs WHERE employer_id=self returns identical count pre/post migration 023')
})
