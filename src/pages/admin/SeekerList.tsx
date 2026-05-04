import { useState } from 'react'
import { AdminTable } from '@/components/admin/AdminTable'
import { ProfileDrawer } from '@/components/admin/ProfileDrawer'
import { Tag } from '@/components/ui/Tag'

interface SeekerRow {
  user_id: string
  name: string
  email: string
  region: string | null
  onboarding_complete: boolean
  onboarding_step: number
  match_scores_computed: boolean
  joined: string
  is_active: boolean
}

/**
 * SeekerList — `/admin/seekers`.
 *
 * Composes <AdminTable rpc="admin_list_seekers"> for the searchable / paginated
 * seeker table. Each row click opens <ProfileDrawer userId={...}/> for that user.
 *
 * Onboarding state Tag mapping (UI-SPEC §"Per-view primary actions and states"):
 *   onboarding_complete=true  → Tag variant="green" "Complete"
 *   onboarding_complete=false → Tag variant="warn" "Step N of 7"
 *
 * Match-scores Tag mapping:
 *   match_scores_computed=true  → Tag variant="green" "Ready"
 *   match_scores_computed=false → Tag variant="grey" "Pending"
 */
export function SeekerList() {
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)
  const [drawerActive, setDrawerActive] = useState(true)

  return (
    <div className="space-y-6">
      <h1
        className="text-[20px] font-semibold leading-7"
        style={{ color: 'var(--color-text)', letterSpacing: '-0.01em' }}
      >
        Seekers
      </h1>

      <AdminTable<SeekerRow>
        rpc="admin_list_seekers"
        searchable
        searchPlaceholder="Search by name or email…"
        emptyHeading="No seekers yet"
        emptyBody="Seekers will appear here once they sign up."
        errorCopy="Failed to load seekers. Refresh the page or check your connection."
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'onboarding', label: 'Onboarding' },
          { key: 'scores', label: 'Scores' },
          { key: 'region', label: 'Region' },
          { key: 'joined', label: 'Joined' },
          { key: 'active', label: 'Active' },
        ]}
        renderRow={(row, onClick) => (
          <>
            <td
              className="px-4 py-3 text-[15px]"
              style={{ color: 'var(--color-text)' }}
              onClick={onClick}
            >
              <div>{row.name || row.email}</div>
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                {row.email}
              </div>
            </td>
            <td className="px-4 py-3" onClick={onClick}>
              {row.onboarding_complete ? (
                <Tag variant="green">Complete</Tag>
              ) : (
                <Tag variant="warn">{`Step ${row.onboarding_step} of 7`}</Tag>
              )}
            </td>
            <td className="px-4 py-3" onClick={onClick}>
              {row.match_scores_computed ? (
                <Tag variant="green">Ready</Tag>
              ) : (
                <Tag variant="grey">Pending</Tag>
              )}
            </td>
            <td
              className="px-4 py-3 text-[13px]"
              style={{ color: 'var(--color-text-muted)' }}
              onClick={onClick}
            >
              {row.region ?? '—'}
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
            <td className="px-4 py-3" onClick={onClick}>
              {row.is_active ? (
                <Tag variant="green">Active</Tag>
              ) : (
                <Tag variant="red">Suspended</Tag>
              )}
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
