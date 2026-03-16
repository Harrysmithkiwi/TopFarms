export type UserRole = 'employer' | 'seeker' | 'admin'

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

// Phase 2 types
export type JobStatus = 'draft' | 'active' | 'paused' | 'filled' | 'expired' | 'archived'
export type ContractType = 'permanent' | 'contract' | 'casual'
export type VerificationMethod = 'email' | 'phone' | 'nzbn' | 'document' | 'farm_photo'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
export type TrustLevel = 'unverified' | 'basic' | 'verified' | 'fully_verified'
export type ListingTier = 1 | 2 | 3
export type SkillProficiency = 'basic' | 'intermediate' | 'advanced'

export interface EmployerVerification {
  id: string
  employer_id: string
  method: VerificationMethod
  status: VerificationStatus
  nzbn_number?: string
  document_url?: string
  verified_at?: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  category: string
  sector: 'dairy' | 'sheep_beef' | 'both'
}

export interface SelectedSkill {
  skill_id: string
  proficiency: SkillProficiency
}

export interface JobListing {
  id: string
  employer_id: string
  title: string
  sector: string
  role_type: string
  region: string
  status: JobStatus
  listing_tier: ListingTier
  salary_min?: number
  salary_max?: number
  contract_type: ContractType
  start_date?: string
  accommodation?: Record<string, unknown>
  visa_sponsorship: boolean
  couples_welcome: boolean
  description_overview?: string
  description_daytoday?: string
  description_offer?: string
  description_ideal?: string
  benefits?: string[]
  views_count: number
  created_at: string
  expires_at?: string
}

export const LISTING_TIERS = {
  1: { name: 'Standard', price: 10000, displayPrice: '$100' },
  2: { name: 'Featured', price: 15000, displayPrice: '$150' },
  3: { name: 'Premium', price: 20000, displayPrice: '$200' },
} as const

// ============================================================
// Phase 3 — Seeker Demand Side types
// ============================================================

// Application pipeline — 8-stage status
export type ApplicationStatus =
  | 'applied'
  | 'review'
  | 'interview'
  | 'shortlisted'
  | 'offered'
  | 'hired'
  | 'declined'
  | 'withdrawn'

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied:     ['review', 'declined'],
  review:      ['interview', 'shortlisted', 'declined'],
  interview:   ['shortlisted', 'declined'],
  shortlisted: ['offered', 'declined'],
  offered:     ['hired', 'declined'],
  hired:       [],
  declined:    [],
  withdrawn:   [],
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied:     'Applied',
  review:      'Under Review',
  interview:   'Interview',
  shortlisted: 'Shortlisted',
  offered:     'Offered',
  hired:       'Hired',
  declined:    'Declined',
  withdrawn:   'Withdrawn',
}

// Active = still in pipeline, Completed = terminal state
export const ACTIVE_STATUSES: ApplicationStatus[] = ['applied', 'review', 'interview', 'shortlisted', 'offered']
export const COMPLETED_STATUSES: ApplicationStatus[] = ['hired', 'declined', 'withdrawn']

// Seeker profile enums
export type DairyNZLevel = 'none' | 'level_1' | 'level_2' | 'level_3' | 'level_4'
export type VisaStatus = 'nz_citizen' | 'permanent_resident' | 'working_holiday' | 'student' | 'needs_sponsorship'
export type HerdSizeBucket = '<200' | '200-500' | '500-1000' | '1000+'
export type ShedType = 'rotary' | 'herringbone' | 'other'

export const DAIRYNZ_LEVELS: { value: DairyNZLevel; label: string; description: string }[] = [
  { value: 'none',    label: 'None',    description: 'No DairyNZ qualification' },
  { value: 'level_1', label: 'Level 1', description: 'Introductory dairy farming' },
  { value: 'level_2', label: 'Level 2', description: 'Dairy farming skills' },
  { value: 'level_3', label: 'Level 3', description: 'Advanced dairy farming' },
  { value: 'level_4', label: 'Level 4', description: 'Dairy farm management' },
]

export const VISA_OPTIONS: { value: VisaStatus; label: string }[] = [
  { value: 'nz_citizen',          label: 'NZ Citizen' },
  { value: 'permanent_resident',  label: 'Permanent Resident' },
  { value: 'working_holiday',     label: 'Working Holiday Visa' },
  { value: 'student',             label: 'Student Visa' },
  { value: 'needs_sponsorship',   label: 'Needs Visa Sponsorship' },
]

export const HERD_SIZE_BUCKETS: { value: HerdSizeBucket; label: string }[] = [
  { value: '<200',     label: 'Under 200' },
  { value: '200-500',  label: '200 - 500' },
  { value: '500-1000', label: '500 - 1,000' },
  { value: '1000+',    label: '1,000+' },
]

export const SHED_TYPES: { value: ShedType; label: string }[] = [
  { value: 'rotary',      label: 'Rotary' },
  { value: 'herringbone', label: 'Herringbone' },
  { value: 'other',       label: 'Other' },
]

// Seeker profile data shape (mirrors wizard steps)
export interface SeekerProfileData {
  sector_pref?: string[]
  years_experience?: number
  shed_types_experienced?: ShedType[]
  herd_sizes_worked?: HerdSizeBucket[]
  dairynz_level?: DairyNZLevel
  region?: string
  open_to_relocate?: boolean
  accommodation_needed?: boolean
  housing_type_pref?: string
  pets?: { dogs?: boolean; cats?: boolean; other?: string }
  couples_seeking?: boolean
  family?: { has_children?: boolean; ages?: number[] }
  visa_status?: VisaStatus
  min_salary?: number
  availability_date?: string
}

// Match scoring types
export interface MatchBreakdown {
  shed_type: number
  location: number
  accommodation: number
  skills: number
  salary: number
  visa: number
  couples: number
}

export interface MatchScore {
  total_score: number
  breakdown: MatchBreakdown
}

// Application record type
export interface Application {
  id: string
  job_id: string
  seeker_id: string
  status: ApplicationStatus
  cover_note?: string
  created_at: string
  jobs?: JobListing & { employer_profiles?: { farm_name: string; region: string } }
}
