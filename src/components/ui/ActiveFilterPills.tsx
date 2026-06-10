import { X } from 'lucide-react'

interface ActiveFilterPillsProps {
  searchParams: URLSearchParams
  onRemove: (key: string, value?: string) => void
}

const PILL_LABEL_MAP: Record<string, (v: string) => string> = {
  shed_type: (v) => `Shed: ${v}`,
  region: (v) => `Region: ${v}`,
  role_type: (v) => `Role: ${v.replace(/_/g, ' ')}`,
  contract_type: (v) => `Contract: ${v}`,
  herd_size: (v) => `Herd: ${v}`,
  accommodation_type: (v) => `Accommodation: ${v.replace(/_/g, ' ')}`,
  mentorship: () => 'Mentorship',
  vehicle: () => 'Vehicle provided',
  dairynz_pathway: () => 'DairyNZ pathway',
  posted_recent: () => 'Posted < 7 days',
  visa: () => 'Visa sponsorship',
  couples: () => 'Couples welcome',
  dairynz_level: (v) => `DairyNZ: ${v}`,
}

// Single-value keys (remove entire param)
const SINGLE_VALUE_KEYS = new Set([
  'mentorship',
  'vehicle',
  'dairynz_pathway',
  'posted_recent',
  'visa',
  'couples',
  'dairynz_level',
])

export function ActiveFilterPills({ searchParams, onRemove }: ActiveFilterPillsProps) {
  const pills: { key: string; value: string; label: string }[] = []

  for (const [key, labelFn] of Object.entries(PILL_LABEL_MAP)) {
    if (SINGLE_VALUE_KEYS.has(key)) {
      const val = searchParams.get(key)
      if (val) pills.push({ key, value: val, label: labelFn(val) })
    } else {
      const values = searchParams.getAll(key)
      values.forEach((v) => pills.push({ key, value: v, label: labelFn(v) }))
    }
  }

  // Include salary range if non-default
  const salaryMin = searchParams.get('salary_min')
  const salaryMax = searchParams.get('salary_max')
  if (salaryMin)
    pills.push({
      key: 'salary_min',
      value: salaryMin,
      label: `Min: $${(Number(salaryMin) / 1000).toFixed(0)}k`,
    })
  if (salaryMax)
    pills.push({
      key: 'salary_max',
      value: salaryMax,
      label: `Max: $${(Number(salaryMax) / 1000).toFixed(0)}k`,
    })

  if (pills.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {pills.map((pill, i) => (
        <button
          key={`${pill.key}-${pill.value}-${i}`}
          type="button"
          onClick={() =>
            onRemove(pill.key, SINGLE_VALUE_KEYS.has(pill.key) ? undefined : pill.value)
          }
          className="bg-brand/10 border-brand/30 text-brand hover:bg-brand/20 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors"
          aria-label={`Remove ${pill.label} filter`}
        >
          {pill.label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  )
}
