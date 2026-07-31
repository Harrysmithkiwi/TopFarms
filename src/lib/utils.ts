import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * tailwind-merge must be told about custom font-size utilities, or it guesses.
 *
 * Phase 5.2 added `text-micro` (11px) and `text-label` (13px) — the two steps
 * Tailwind has no built-in for. tailwind-merge classifies `text-*` against a
 * fixed list: it knows `text-sm` is a size and `text-white` is a colour, but an
 * unrecognised `text-label` is assumed to be a COLOUR. It then treats colour and
 * size as one conflict group and drops the earlier class:
 *
 *     twMerge('text-white', 'text-label')  ->  'text-label'        // colour GONE
 *     twMerge('text-white', 'text-sm')     ->  'text-white text-sm'
 *
 * So every `cn('… text-white …', 'text-label')` silently lost its text colour.
 * Caught 2026-07-31 by the axe gate on /dashboard/seeker: a "Browse jobs" CTA
 * rendered #0b1f10 on #15803d — 3.43:1 — because `text-white` had been stripped,
 * though the source plainly says `text-white`. 44 call sites combine these tokens
 * with a colour, so this was a live, silent, product-wide defect.
 *
 * Registering them as font sizes fixes it once at the shared helper rather than
 * at 44 call sites. Any future custom size token MUST be added here too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['micro', 'label'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
