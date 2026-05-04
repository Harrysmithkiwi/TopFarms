import { describe, it } from 'vitest'

// JSONB shape contract locked in 20-UI-SPEC.md § "SECURITY DEFINER RPC contract — drawer payload".
describe('admin drawer JSONB shape (ADMIN-DRAWER)', () => {
  it.todo('ADMIN-DRAWER: admin_get_user_profile(employer_uuid) returns required keys: role, name, email, region, join_date, last_sign_in, verification_tier, total_jobs_posted')
  it.todo('ADMIN-DRAWER: admin_get_user_profile(seeker_uuid) returns required keys: role, name, email, region, join_date, last_sign_in, onboarding_complete, onboarding_step, match_scores_computed')
  it.todo('ADMIN-DRAWER: verification_tier is one of "unverified" | "email" | "nzbn" | "featured"')
  it.todo('ADMIN-DRAWER: onboarding_step is integer in [1, 7]')
})
