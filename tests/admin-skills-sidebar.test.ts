// Phase 23 Wave 0 — Static-source-guard over AdminSidebar.tsx + AdminTable.tsx
//
// Encodes ANLY-01/02/03 + sidebar/union acceptance criteria:
//   - AdminSidebar.tsx: new /admin/skills nav item present (label: 'Skills' or 'Analytics')
//   - AdminTable.tsx: AdminListRpc union extended with 'admin_skill_coverage'
//     and 'admin_list_analytics_events' (Pitfall 4 guard — type union must include
//     new RPCs or AdminTable will refuse to call them)
//
// All assertions are RED until plan 23-02 ships the page, route, sidebar item,
// and union extension.
// Pattern: readFileSync from tests/fk-indexes.test.ts (canonical template).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SIDEBAR_PATH = resolve(__dirname, '..', 'src/components/layout/AdminSidebar.tsx')
const TABLE_PATH = resolve(__dirname, '..', 'src/components/admin/AdminTable.tsx')

describe('AdminSidebar — /admin/skills nav item (ANLY-01)', () => {
  const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8')

  it("contains a nav item with to: '/admin/skills'", () => {
    expect(sidebarSrc).toMatch(/to:\s*'\/admin\/skills'/)
  })

  it("contains the 'Skills' or 'Analytics' label for the nav item", () => {
    expect(sidebarSrc).toMatch(/'Skills'|'Analytics'/)
  })
})

describe("AdminTable union — 'admin_skill_coverage' + 'admin_list_analytics_events' (ANLY-01/03)", () => {
  const tableSrc = readFileSync(TABLE_PATH, 'utf8')

  it("AdminListRpc union contains 'admin_skill_coverage'", () => {
    expect(tableSrc).toContain("'admin_skill_coverage'")
  })

  it("AdminListRpc union contains 'admin_list_analytics_events'", () => {
    expect(tableSrc).toContain("'admin_list_analytics_events'")
  })
})
