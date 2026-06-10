import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  /** 0-indexed current step */
  currentStep: number
  totalSteps: number
  /** Optional label strings shown below each step circle */
  labels?: string[]
  className?: string
}

/**
 * Numbered step indicator with circles (1-N).
 * - Completed steps (i < currentStep): moss background, white check icon
 * - Active step (i === currentStep): fern background, white number
 * - Future steps (i > currentStep): fog background, light text number
 * - Connector lines: moss for completed segments, fog for future
 * - On mobile (< sm), labels are hidden and circles shrink to w-6 h-6
 */
export function StepIndicator({ currentStep, totalSteps, labels, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={i}>
            {/* Step circle */}
            <div className="flex flex-shrink-0 flex-col items-center">
              <div
                className={cn(
                  'font-body flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-bold transition-colors duration-200 sm:h-8 sm:w-8',
                  'text-[10px] sm:text-[13px]',
                  i < currentStep && 'bg-brand text-white',
                  i === currentStep && 'bg-brand-hover text-white',
                  i > currentStep && 'bg-surface-2 text-text-subtle',
                )}
              >
                {i < currentStep ? (
                  <Check className="h-3 w-3 stroke-[2.5] sm:h-3.5 sm:w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {/* Label — hidden on mobile */}
              {labels?.[i] && (
                <span
                  className={cn(
                    'font-body mt-1.5 hidden max-w-[60px] text-center text-[10px] leading-tight sm:block',
                    i < currentStep && 'text-brand font-medium',
                    i === currentStep && 'text-brand-hover font-semibold',
                    i > currentStep && 'text-text-subtle',
                  )}
                >
                  {labels[i]}
                </span>
              )}
            </div>

            {/* Connector line between circles */}
            {i < totalSteps - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 transition-colors duration-200',
                  i < currentStep ? 'bg-brand' : 'bg-surface-2',
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
