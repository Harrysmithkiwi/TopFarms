// Phase 23 Wave 0 — Static-source-guard over supabase/migrations/034_skills_taxonomy_v2.sql
//
// This test encodes the acceptance criteria for:
//   TAX-01  schema changes (sector drop, discipline add, category CHECK)
//   TAX-02  24 ag-broad competencies seeded
//   TAX-03  data migration order (clear seeker_skills/match_scores/skills, then reseed + recompute)
//   TAX-05  no qualification-category competencies seeded
//   ANLY-01 admin_skill_coverage SECURITY DEFINER RPC in migration
//   ANLY-02 seeker_count + job_count columns in RPC output
//   ANLY-03 analytics_events table + RLS + admin read RPC
//
// All assertions are RED until plan 23-01 authors the migration file.
// Pattern: readFileSync from tests/fk-indexes.test.ts (canonical template).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SQL_PATH = resolve(__dirname, '..', 'supabase/migrations/034_skills_taxonomy_v2.sql')

// ---------------------------------------------------------------------------
// 24 ag-broad competencies (verbatim from CONTEXT.md decision #1)
// ---------------------------------------------------------------------------
const COMPETENCIES = [
  // Livestock (5)
  'Dairy cattle management',
  'Beef cattle management',
  'Sheep & lamb handling',
  'Animal health & husbandry',
  'Mustering & stockmanship',
  // Cropping & agronomy (4)
  'Arable & grain production',
  'Vegetable & root crop production',
  'Pasture & forage management',
  'Agronomy & soil management',
  // Machinery & equipment (4)
  'Tractor operation',
  'Heavy machinery & harvest equipment',
  'Spraying & application equipment',
  'Farm vehicle handling',
  // Farm operations & infrastructure (4)
  'Fencing & yard construction',
  'Irrigation & water systems',
  'General farm maintenance',
  'Fuel & chemical handling',
  // Management & business (4)
  'Farm planning & operations management',
  'Staff supervision & leadership',
  'Farm financial management',
  'Compliance & record-keeping',
  // Cross-cutting (3)
  'Health & safety competency',
  'Sustainable & regenerative practices',
  'Data & farm tech literacy',
]

describe('Migration 034 — skills taxonomy v2', () => {
  const sql = readFileSync(SQL_PATH, 'utf8')

  // -------------------------------------------------------------------------
  // Migration structure — BEGIN/COMMIT/verify block
  // -------------------------------------------------------------------------
  it('has transaction wrapper (BEGIN / COMMIT) and verify block', () => {
    expect(sql).toMatch(/^BEGIN;/m)
    expect(sql).toMatch(/COMMIT;/)
    expect(sql).toMatch(/DO \$verify\$/)
  })

  // -------------------------------------------------------------------------
  // TAX-01 — schema: drop sector constraint + column, add discipline + category CHECK
  // -------------------------------------------------------------------------
  describe('TAX-01: schema changes', () => {
    it('drops the sector CHECK constraint', () => {
      expect(sql).toMatch(/DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+skills_sector_check/i)
    })

    it('drops the sector column', () => {
      expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+sector/i)
    })

    it('adds discipline column with agriculture default', () => {
      expect(sql).toMatch(
        /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+discipline\s+text\s+NOT\s+NULL\s+DEFAULT\s+'agriculture'/i,
      )
    })

    it('adds skills_category_check constraint', () => {
      expect(sql).toMatch(/skills_category_check/i)
    })

    it('category CHECK includes livestock', () => {
      expect(sql).toMatch(/'livestock'/)
    })

    it('category CHECK includes cropping_agronomy', () => {
      expect(sql).toMatch(/'cropping_agronomy'/)
    })

    it('category CHECK includes machinery_equipment', () => {
      expect(sql).toMatch(/'machinery_equipment'/)
    })

    it('category CHECK includes farm_operations_infrastructure', () => {
      expect(sql).toMatch(/'farm_operations_infrastructure'/)
    })

    it('category CHECK includes management_business', () => {
      expect(sql).toMatch(/'management_business'/)
    })

    it('category CHECK includes cross_cutting', () => {
      expect(sql).toMatch(/'cross_cutting'/)
    })
  })

  // -------------------------------------------------------------------------
  // TAX-02 — 24 competencies seeded
  // -------------------------------------------------------------------------
  describe('TAX-02: 24 competencies seeded', () => {
    it('COMPETENCIES array has exactly 24 entries', () => {
      expect(COMPETENCIES).toHaveLength(24)
    })

    it.each(COMPETENCIES)('seeds competency: %s', (name) => {
      expect(sql).toContain(name)
    })
  })

  // -------------------------------------------------------------------------
  // TAX-03 — data migration: clear in dependency order, then reseed + recompute
  // -------------------------------------------------------------------------
  describe('TAX-03: data migration order', () => {
    it('deletes seeker_skills before reseed', () => {
      expect(sql).toMatch(/DELETE\s+FROM\s+public\.seeker_skills/i)
    })

    it('deletes match_scores before reseed', () => {
      expect(sql).toMatch(/DELETE\s+FROM\s+public\.match_scores/i)
    })

    it('deletes skills before reseed', () => {
      expect(sql).toMatch(/DELETE\s+FROM\s+public\.skills/i)
    })

    it('triggers match score recompute (backfill)', () => {
      expect(sql).toMatch(/compute_match_score/i)
    })
  })

  // -------------------------------------------------------------------------
  // TAX-05 — no qualification-category competencies seeded
  // -------------------------------------------------------------------------
  describe('TAX-05: no qualification competencies seeded', () => {
    it('does not seed DairyNZ Level competencies', () => {
      expect(sql).not.toMatch(/DairyNZ Level/i)
    })

    it("does not seed any 'qualification' category row", () => {
      expect(sql).not.toMatch(/'qualification'/i)
    })
  })

  // -------------------------------------------------------------------------
  // ANLY-01/ANLY-02 — admin_skill_coverage RPC in migration
  // -------------------------------------------------------------------------
  describe('ANLY-01/02: admin_skill_coverage RPC', () => {
    it('creates admin_skill_coverage function', () => {
      expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_skill_coverage/i)
    })

    it('uses SECURITY DEFINER', () => {
      expect(sql).toMatch(/SECURITY\s+DEFINER/i)
    })

    it('calls _admin_gate() guard', () => {
      expect(sql).toMatch(/PERFORM\s+public\._admin_gate\(\)/i)
    })

    it('returns seeker_count column', () => {
      expect(sql).toMatch(/seeker_count/i)
    })

    it('returns job_count column', () => {
      expect(sql).toMatch(/job_count/i)
    })

    it('grants EXECUTE to authenticated role', () => {
      expect(sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.admin_skill_coverage.*TO\s+authenticated/i,
      )
    })
  })

  // -------------------------------------------------------------------------
  // ANLY-03 — analytics_events table + RLS + admin read RPC
  // -------------------------------------------------------------------------
  describe('ANLY-03: analytics_events table + RLS + admin read RPC', () => {
    it('creates analytics_events table', () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.analytics_events/i)
    })

    it('analytics_events has event_type column', () => {
      expect(sql).toMatch(/event_type/)
    })

    it('analytics_events has entity_id column', () => {
      expect(sql).toMatch(/entity_id/)
    })

    it('analytics_events has metadata column', () => {
      expect(sql).toMatch(/metadata/)
    })

    it('analytics_events has created_at column', () => {
      expect(sql).toMatch(/created_at/)
    })

    it('enables RLS on analytics_events', () => {
      expect(sql).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i)
    })

    it('admin read RLS policy uses get_user_role(auth.uid()) = admin', () => {
      expect(sql).toMatch(/get_user_role\(auth\.uid\(\)\)\s*=\s*'admin'/i)
    })

    it('creates admin_list_analytics_events RPC', () => {
      expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.admin_list_analytics_events/i)
    })
  })
})
