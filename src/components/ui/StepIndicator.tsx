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
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  'w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-body font-bold flex-shrink-0 transition-colors duration-200',
                  'text-[10px] sm:text-[13px]',
                  i < currentStep && 'bg-brand text-white',
                  i === currentStep && 'bg-brand-hover text-white',
                  i > currentStep && 'bg-surface-2 text-text-subtle',
                )}
              >
                {i < currentStep ? (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                ) : (
                  i + 1
                )}
              </div>
              {/* Label — hidden on mobile */}
              {labels?.[i] && (
                <span
                  className={cn(
                    'hidden sm:block mt-1.5 text-[10px] font-body text-center max-w-[60px] leading-tight',
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
                  'flex-1 h-0.5 transition-colors duration-200',
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
