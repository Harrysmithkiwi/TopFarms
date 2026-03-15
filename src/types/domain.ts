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
