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
export type ShedType = 'rotary' | 'herringbone' | 'ams' | 'swing_over' | 'tiestall' | 'other'

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
  { value: 'ams',         label: 'AMS' },
  { value: 'swing_over',  label: 'Swing-Over' },
  { value: 'tiestall',    label: 'Tiestall' },
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
  // Phase 8 new fields
  licence_types?: string[]
  certifications?: string[]
  housing_sub_options?: string[]
  preferred_regions?: string[]
  notice_period_text?: string
  // Phase 11 — document upload
  /** @deprecated Replaced by `seeker_documents` table (migration 019, Phase 14 BFIX-03).
   *  New uploads write to `seeker_documents` only; this column is preserved for
   *  backfill traceability. Drop in a follow-up cleanup phase (target: post-Phase 15)
   *  once all readers are confirmed migrated. */
  document_urls?: string[]
}

// ============================================================
// Phase 14 BFIX-03 — Document categorization
// ============================================================

export type DocumentType = 'cv' | 'certificate' | 'reference' | 'identity' | 'other'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cv:          'CV',
  certificate: 'Certificate',
  reference:   'Reference',
  identity:    'Identity Document',
  other:       'Other',
}

/**
 * Document types that may be exposed to employers via the applicant dashboard.
 * Identity documents are NEVER in this list — defense-in-depth alongside the
 * server-side filter in get-applicant-document-url Edge Function (Phase 14 BFIX-02 / 14-03).
 * Mirrors the CHECK constraint on seeker_documents.document_type — if you add a
 * value here, also update migration 019 and 14-03's employer-side RLS policy.
 */
export const EMPLOYER_VISIBLE_DOCUMENT_TYPES: DocumentType[] = ['cv', 'certificate', 'reference']

export interface SeekerDocument {
  id: string
  seeker_id: string
  storage_path: string
  document_type: DocumentType
  filename: string
  uploaded_at: string
  file_size_bytes: number | null
}

/**
 * Phase 17 SRCH-13/14/15 — saved-search row shape.
 * Mirrors the saved_searches table from migration 024.
 * search_params is a URLSearchParams.toString() snapshot (see src/lib/savedSearch.ts).
 */
export interface SavedSearch {
  id: string
  user_id: string
  name: string
  search_params: string
  created_at: string
  updated_at: string
}

// ============================================================
// Phase 8 — Wizard Field Extension types
// ============================================================
export type FarmType = 'dairy' | 'sheep_beef' | 'cropping' | 'deer' | 'mixed' | 'other'
export type OwnershipType = 'owner_operator' | 'corporate' | 'sharemilker' | 'equity_partner'
export type CalvingSystem = 'spring' | 'autumn' | 'split' | 'year_round'
export type DistanceFromTown = '<5km' | '5-15km' | '15-30km' | '>30km' | '>50km'
export type HiringFrequency = 'rarely' | 'annually' | 'seasonally' | 'ongoing'
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly'
export type SeniorityLevel = 'entry' | 'mid' | 'senior' | 'management'
export type MinDairyExperience = 'none' | '1_year' | '2_years' | '3_years' | '5_plus'
export type WeekendRoster = 'every_weekend' | 'alternate' | 'one_in_three' | 'occasional' | 'none'

export const FARM_TYPE_OPTIONS: { value: FarmType; label: string }[] = [
  { value: 'dairy',      label: 'Dairy' },
  { value: 'sheep_beef', label: 'Sheep & Beef' },
  { value: 'cropping',   label: 'Cropping' },
  { value: 'deer',       label: 'Deer' },
  { value: 'mixed',      label: 'Mixed' },
  { value: 'other',      label: 'Other' },
]

export const OWNERSHIP_TYPE_OPTIONS: { value: OwnershipType; label: string }[] = [
  { value: 'owner_operator',  label: 'Owner Operator' },
  { value: 'corporate',       label: 'Corporate' },
  { value: 'sharemilker',     label: 'Sharemilker' },
  { value: 'equity_partner',  label: 'Equity Partner' },
]

export const CALVING_SYSTEM_OPTIONS: { value: CalvingSystem; label: string }[] = [
  { value: 'spring',     label: 'Spring' },
  { value: 'autumn',     label: 'Autumn' },
  { value: 'split',      label: 'Split' },
  { value: 'year_round', label: 'Year Round' },
]

export const DISTANCE_OPTIONS: { value: DistanceFromTown; label: string }[] = [
  { value: '<5km',   label: 'Less than 5km' },
  { value: '5-15km', label: '5 - 15km' },
  { value: '15-30km', label: '15 - 30km' },
  { value: '>30km',  label: 'More than 30km' },
  { value: '>50km',  label: 'More than 50km' },
]

export const HIRING_FREQUENCY_OPTIONS: { value: HiringFrequency; label: string }[] = [
  { value: 'rarely',     label: 'Rarely' },
  { value: 'annually',   label: 'Annually' },
  { value: 'seasonally', label: 'Seasonally' },
  { value: 'ongoing',    label: 'Ongoing' },
]

export const PAY_FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
  { value: 'weekly',      label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly',     label: 'Monthly' },
]

export const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: 'entry',      label: 'Entry Level' },
  { value: 'mid',        label: 'Mid Level' },
  { value: 'senior',     label: 'Senior' },
  { value: 'management', label: 'Management' },
]

export const MIN_DAIRY_EXPERIENCE_OPTIONS: { value: MinDairyExperience; label: string }[] = [
  { value: 'none',    label: 'No minimum' },
  { value: '1_year',  label: '1+ year' },
  { value: '2_years', label: '2+ years' },
  { value: '3_years', label: '3+ years' },
  { value: '5_plus',  label: '5+ years' },
]

export const WEEKEND_ROSTER_OPTIONS: { value: WeekendRoster; label: string }[] = [
  { value: 'every_weekend', label: 'Every weekend' },
  { value: 'alternate',     label: 'Alternate weekends' },
  { value: 'one_in_three',  label: '1 in 3 weekends' },
  { value: 'occasional',    label: 'Occasional' },
  { value: 'none',          label: 'No weekends' },
]

export const CAREER_DEV_OPTIONS: { value: string; label: string }[] = [
  { value: 'dairynz_pathway',      label: 'DairyNZ Pathway' },
  { value: 'mentoring',            label: 'Mentoring' },
  { value: 'training_courses',     label: 'Training courses' },
  { value: 'conference_attendance', label: 'Conference attendance' },
  { value: 'progression_plan',     label: 'Progression plan' },
  { value: 'study_support',        label: 'Study support' },
]

export const ACCOMMODATION_EXTRAS_OPTIONS: { value: string; label: string }[] = [
  { value: 'Pets allowed',        label: 'Pets allowed' },
  { value: 'Couples welcome',     label: 'Couples welcome' },
  { value: 'Family welcome',      label: 'Family welcome' },
  { value: 'Utilities included',  label: 'Utilities included' },
  { value: 'Furnished',           label: 'Furnished' },
  { value: 'Garden',              label: 'Garden' },
  { value: 'Garage',              label: 'Garage' },
  { value: 'Internet included',   label: 'Internet included' },
]

export const QUALIFICATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'dairynz_level_1', label: 'DairyNZ Level 1' },
  { value: 'dairynz_level_2', label: 'DairyNZ Level 2' },
  { value: 'dairynz_level_3', label: 'DairyNZ Level 3' },
  { value: 'dairynz_level_4', label: 'DairyNZ Level 4' },
  { value: 'trade_cert',      label: 'Trade Certificate' },
  { value: 'diploma',         label: 'Diploma in Agriculture' },
  { value: 'degree',          label: 'Degree in Agriculture' },
]

export const VISA_CHIP_OPTIONS: { value: string; label: string }[] = [
  { value: 'nz_citizen',           label: 'NZ Citizen' },
  { value: 'permanent_resident',   label: 'Permanent Resident' },
  { value: 'working_holiday',      label: 'Working Holiday' },
  { value: 'student',              label: 'Student Visa' },
  { value: 'accredited_employer',  label: 'Accredited Employer Work Visa' },
  { value: 'open_work',            label: 'Open Work Visa' },
]

export const LICENCE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'class_1', label: 'Class 1 (Car)' },
  { value: 'class_2', label: 'Class 2 (Medium rigid)' },
  { value: 'class_4', label: 'Class 4 (Heavy rigid)' },
  { value: 'class_5', label: 'Class 5 (Heavy combination)' },
]

export const CERTIFICATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'atv',       label: 'ATV' },
  { value: 'tractor',   label: 'Tractor' },
  { value: '4wd',       label: '4WD' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'growsafe',  label: 'Growsafe' },
  { value: 'chainsaw',  label: 'Chainsaw' },
]

export const HOUSING_SUB_OPTIONS: { value: string; label: string }[] = [
  { value: 'single',               label: 'Single' },
  { value: 'couple_working',       label: 'Couple (both working)' },
  { value: 'couple_not_working',   label: 'Couple (one working)' },
  { value: 'family',               label: 'Family' },
  { value: 'working_dogs',         label: 'Working dogs' },
  { value: 'pets',                 label: 'Pets' },
]

export const PREFERRED_REGION_OPTIONS: { value: string; label: string }[] = [
  { value: 'Waikato',             label: 'Waikato' },
  { value: 'Canterbury',          label: 'Canterbury' },
  { value: 'Southland',           label: 'Southland' },
  { value: 'Taranaki',            label: 'Taranaki' },
  { value: 'Manawatu-Whanganui',  label: 'Manawatu-Whanganui' },
  { value: 'Otago',               label: 'Otago' },
  { value: 'Bay of Plenty',       label: 'Bay of Plenty' },
  { value: 'Northland',           label: 'Northland' },
]

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
  explanation?: string | null
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

// ============================================================
// Phase 5 — Revenue Protection types
// ============================================================

export type PlacementFeeTier = 'entry' | 'experienced' | 'senior'

export const PLACEMENT_FEE_TIERS: Record<PlacementFeeTier, { label: string; amount: number; displayAmount: string }> = {
  entry:       { label: 'Entry Level',         amount: 20000, displayAmount: '$200' },
  experienced: { label: 'Experienced',         amount: 40000, displayAmount: '$400' },
  senior:      { label: 'Senior / Management', amount: 80000, displayAmount: '$800' },
} as const

export interface PlacementFeeRecord {
  id: string
  job_id: string
  application_id: string
  employer_id: string
  seeker_id: string
  acknowledged_at: string | null
  confirmed_at: string | null
  amount_nzd: number | null
  fee_tier: PlacementFeeTier | null
  stripe_invoice_id: string | null
  rating: number | null
}

export interface SeekerContact {
  phone: string | null
  email: string
}

/**
 * Calculate placement fee tier from job salary range + title keywords.
 * Salary-based primary: <$55k = entry ($200), $55k-$80k = experienced ($400), $80k+ = senior ($800).
 * Title keywords ('manager', 'head', 'senior', 'supervisor') bump UP but never down.
 */
export function calculatePlacementFee(
  salaryMin: number | null,
  salaryMax: number | null,
  jobTitle: string,
): { tier: PlacementFeeTier; amount: number; displayAmount: string } {
  const avgSalary = ((salaryMin ?? 0) + (salaryMax ?? 0)) / 2
  let tier: PlacementFeeTier =
    avgSalary >= 80000 ? 'senior' : avgSalary >= 55000 ? 'experienced' : 'entry'

  // Title keyword can bump UP but never down
  const lowerTitle = jobTitle.toLowerCase()
  const seniorKeywords = ['manager', 'head', 'senior', 'supervisor']
  if (seniorKeywords.some((kw) => lowerTitle.includes(kw))) {
    if (tier === 'entry') tier = 'experienced'
    else if (tier === 'experienced') tier = 'senior'
  }

  const tierInfo = PLACEMENT_FEE_TIERS[tier]
  return { tier, amount: tierInfo.amount, displayAmount: tierInfo.displayAmount }
}
