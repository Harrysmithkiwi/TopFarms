// Server-side pricing — Phase 2 Task 2.1. Single source of truth for both fee lines.
//
// WHY THIS EXISTS
// Until Phase 2, calculatePlacementFee ran only in the browser
// (src/types/domain.ts) and acknowledge-placement-fee / create-placement-invoice
// inserted the client's fee_tier/amount_nzd verbatim. An employer could acknowledge
// their own placement at amount_nzd: 0 — and because the seeker_contacts policy keys
// on acknowledged_at IS NOT NULL, that released the seeker's phone and email free.
//
// The client keeps its copy of this algorithm for DISPLAY ONLY. If the two drift,
// tests/pricing-parity.test.ts fails; if a client posts a value that disagrees with
// the server's, the server logs both and uses its own (earliest tamper signal).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type PlacementFeeTier = 'entry' | 'experienced' | 'senior'

// Amounts in NZD cents. Must stay in lockstep with PLACEMENT_FEE_TIERS in
// src/types/domain.ts (display copy).
export const PLACEMENT_FEE_AMOUNTS: Record<PlacementFeeTier, number> = {
  entry: 20000,
  experienced: 40000,
  senior: 80000,
}

// Listing tier prices in NZD cents. Must stay in lockstep with the /pricing page.
export const TIER_PRICES: Record<number, number> = {
  1: 10000, // $100
  2: 15000, // $150
  3: 20000, // $200
}

/**
 * Same algorithm as src/types/domain.ts calculatePlacementFee.
 * Salary-primary: <$55k entry · $55k–80k experienced · $80k+ senior.
 * Title keywords bump UP only, never down.
 */
export function calculatePlacementFee(
  salaryMin: number | null,
  salaryMax: number | null,
  jobTitle: string,
): { tier: PlacementFeeTier; amount: number } {
  const avgSalary = ((salaryMin ?? 0) + (salaryMax ?? 0)) / 2
  let tier: PlacementFeeTier =
    avgSalary >= 80000 ? 'senior' : avgSalary >= 55000 ? 'experienced' : 'entry'

  const lowerTitle = jobTitle.toLowerCase()
  const seniorKeywords = ['manager', 'head', 'senior', 'supervisor']
  if (seniorKeywords.some((kw) => lowerTitle.includes(kw))) {
    if (tier === 'entry') tier = 'experienced'
    else if (tier === 'experienced') tier = 'senior'
  }

  return { tier, amount: PLACEMENT_FEE_AMOUNTS[tier] }
}

/**
 * Derive the placement fee from the JOB ROW — never from the request body.
 * Throws on a missing job so callers fail closed.
 */
export async function derivePlacementFeeFromJob(
  admin: SupabaseClient,
  jobId: string,
): Promise<{ tier: PlacementFeeTier; amount: number; jobTitle: string }> {
  const { data, error } = await admin
    .from('jobs')
    .select('id, title, salary_min, salary_max')
    .eq('id', jobId)
    .maybeSingle()
  if (error || !data) {
    console.error('pricing: jobs lookup failed', { jobId, error })
    throw new Error('Job not found for fee derivation')
  }
  const { tier, amount } = calculatePlacementFee(data.salary_min, data.salary_max, data.title)
  return { tier, amount, jobTitle: data.title }
}

/**
 * Log when a client-supplied money value disagrees with the server derivation.
 * The mismatch is the earliest tamper signal we get — always log both sides.
 */
export function warnOnClientMismatch(
  fn: string,
  server: { tier: string; amount: number },
  client: { tier?: unknown; amount?: unknown },
): void {
  if (client.tier == null && client.amount == null) return
  if (client.tier !== server.tier || Number(client.amount) !== server.amount) {
    console.warn(`${fn}: client fee mismatch — possible tampering`, {
      server_tier: server.tier,
      server_amount: server.amount,
      client_tier: client.tier,
      client_amount: client.amount,
    })
  }
}
