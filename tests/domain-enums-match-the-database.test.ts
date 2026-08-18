import { describe, it, expect } from 'vitest'
import {
  APPLICATION_STATUS_LABELS,
  DAIRYNZ_LEVELS,
  VISA_OPTIONS,
  type ApplicationStatus,
} from '@/types/domain'
import { CONTRACT_TYPE_PREFS } from '@/lib/constants'

// Audit F-27 — replacing phantom coverage with the real thing.
//
// `tests/seeker-profile.test.ts` carried ten `it.todo`s including "dairynz_level stores valid
// DairyNZLevel value" and "visa_status stores valid VisaStatus value", with ZERO assertions.
// They counted green for months and checked nothing.
//
// The check they described IS worth having, and it is not an integration test — it is a
// parity check. Each of these enums exists twice: once as a TypeScript constant the UI
// renders, and once as a CHECK constraint the database enforces. When they drift the UI
// happily offers a value the database rejects, and the seeker gets a failed save naming a
// column they have never heard of.
//
// The DB side is transcribed from `pg_constraint` on prod, 2026-08-18. Re-read it with:
//   select conname, pg_get_constraintdef(oid) from pg_constraint
//    where conrelid = 'public.seeker_profiles'::regclass and contype = 'c';

/** Verbatim from pg_get_constraintdef on prod, 2026-08-18. */
const DB = {
  dairynz_level: ['none', 'level_1', 'level_2', 'level_3', 'level_4'],
  visa_status: [
    'nz_citizen',
    'permanent_resident',
    'working_holiday',
    'student',
    'needs_sponsorship',
  ],
  contract_type_pref: ['permanent', 'contract', 'casual'],
  application_status: [
    'applied',
    'review',
    'interview',
    'shortlisted',
    'offered',
    'hired',
    'declined',
    'withdrawn',
  ],
} as const

describe('the values the UI offers are the values the database accepts', () => {
  it('dairynz_level', () => {
    expect(DAIRYNZ_LEVELS.map((l) => l.value)).toEqual([...DB.dairynz_level])
  })

  it('visa_status', () => {
    // Load-bearing beyond a failed save: compute_match_score gates on
    // `visa_status = 'needs_sponsorship'`, so a renamed token silently stops the visa gate
    // firing and every migrant scores as though sponsorship were not an issue.
    expect(VISA_OPTIONS.map((v) => v.value)).toEqual([...DB.visa_status])
  })

  it('contract_type_pref', () => {
    // Mirrors jobs_contract_type_check too, which is what lets a seeker preference and a job
    // listing compare without a mapping layer.
    expect(CONTRACT_TYPE_PREFS.map((c) => c.value)).toEqual([...DB.contract_type_pref])
  })

  it('application_status', () => {
    const ui = Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]
    expect([...ui].sort()).toEqual([...DB.application_status].sort())
  })
})

describe('every status the database allows is renderable', () => {
  it.each(DB.application_status)('%s has a label', (status) => {
    // A status with no label renders blank or as the raw token. `withdrawn` was in the DB and
    // in the labels but had no path INTO it until migration 097 — the reverse of this check,
    // and the reason it is worth stating in both directions.
    expect(APPLICATION_STATUS_LABELS[status as ApplicationStatus]).toBeTruthy()
  })
})
