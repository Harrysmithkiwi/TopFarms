import { useState } from 'react'
import { AdminTable } from '@/components/admin/AdminTable'
import { ProfileDrawer } from '@/components/admin/ProfileDrawer'
import { Tag } from '@/components/ui/Tag'

interface EmployerRow {
  user_id: string
  name: string | null
  email: string
  verification_tier: 'unverified' | 'email' | 'nzbn' | 'featured'
  joined: string
  jobs_count: number
  is_active: boolean
}

/**
 * Verification-tier → Tag display map.
 * Source: UI-SPEC §"Per-view primary actions and states" — Employer list table.
 *   unverified → Tag variant="grey" "Unverified"
 *   email      → Tag variant="blue" "Email"
 *   nzbn       → Tag variant="green" "NZBN"
 *   featured   → Tag variant="warn" "Featured"
 */
const TIER_DISPLAY: Record<
  EmployerRow['verification_tier'],
  { label: string; variant: 'grey' | 'blue' | 'green' | 'warn' }
> = {
  unverified: { label: 'Unverified', variant: 'grey' },
  email: { label: 'Email', variant: 'blue' },
  nzbn: { label: 'NZBN', variant: 'green' },
  featured: { label: 'Featured', variant: 'warn' },
}

/**
 * EmployerList — `/admin/employers`.
 *
 * Composes <AdminTable rpc="admin_list_employers"> for the searchable / paginated
 * employer table. Each row click opens <ProfileDrawer userId={...}/> for that user.
 * Drawer state (userId + initialActive) is held here so it survives row swaps and
 * reflects the freshest is_active boolean for the row that triggered open.
 *
 * Copy + Tag mapping locked by UI-SPEC §"Per-view primary actions and states".
 */
export function EmployerList() {
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)
  const [drawerActive, setDrawerActive] = useState(true)

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Employers
      </h1>

      <AdminTable<EmployerRow>
        rpc="admin_list_employers"
        searchable
        searchPlaceholder="Search by name or email…"
        emptyHeading="No employers yet"
        emptyBody="Employers will appear here once they sign up."
        errorCopy="Failed to load employers. Refresh the page or check your connection."
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'tier', label: 'Tier' },
          { key: 'status', label: 'Status' },
          { key: 'joined', label: 'Joined' },
          { key: 'jobs', label: 'Jobs' },
          { key: 'active', label: 'Active' },
        ]}
        renderRow={(row, onClick) => (
          <>
            <td
              className="px-4 py-3 text-[15px]"
              style={{ color: 'var(--color-text)' }}
              onClick={onClick}
            >
              <div>{row.name ?? row.email}</div>
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {row.email}
              </div>
            </td>
            <td className="px-4 py-3" onClick={onClick}>
              <Tag variant={TIER_DISPLAY[row.verification_tier].variant}>
                {TIER_DISPLAY[row.verification_tier].label}
              </Tag>
            </td>
            <td className="px-4 py-3" onClick={onClick}>
              {row.is_active ? (
                <Tag variant="green">Active</Tag>
              ) : (
                <Tag variant="red">Suspended</Tag>
              )}
            </td>
            <td
              className="px-4 py-3 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={onClick}
            >
              {new Date(row.joined).toLocaleDateString('en-NZ', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </td>
            <td
              className="px-4 py-3 text-[15px]"
              style={{ color: 'var(--color-text)' }}
              onClick={onClick}
            >
              {row.jobs_count}
            </td>
            <td className="px-4 py-3" onClick={onClick}>
              {row.is_active ? '✓' : '—'}
            </td>
          </>
        )}
        onRowClick={(row) => {
          setDrawerUserId(row.user_id)
          setDrawerActive(row.is_active)
        }}
      />

      <ProfileDrawer
        userId={drawerUserId}
        initialActive={drawerActive}
        onClose={() => setDrawerUserId(null)}
        onActiveChanged={(next) => setDrawerActive(next)}
      />
    </div>
  )
}
