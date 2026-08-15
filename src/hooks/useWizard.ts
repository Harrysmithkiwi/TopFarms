import { useState } from 'react'

interface UseWizardOptions {
  totalSteps: number
}

interface UseWizardReturn {
  currentStep: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  progress: number
}

/**
 * Generic hook for multi-step wizard navigation.
 * currentStep is 0-indexed.
 * progress is a 0-100 percentage based on position through all steps.
 * No database logic — the wizard shell component owns persistence.
 *
 * There is deliberately no `initialStep` option. It used to exist, and it was a trap: the
 * value was read only inside `useState`'s initialiser, so it was captured on first render
 * and every later change was ignored. Every caller here resolves its resume step from an
 * async fetch, i.e. always after that first render — so the option silently did nothing for
 * the one job it existed to do. Two of the three callers had independently worked around it
 * by also calling `goToStep`; the third had not, and every employer resuming a job draft was
 * dropped back to step 1 (found by the impeccable critique, 2026-08-15).
 *
 * To resume: call `goToStep(n)` once the fetch resolves. One path, no shadow state.
 */
export function useWizard({ totalSteps }: UseWizardOptions): UseWizardReturn {
  const [currentStep, setCurrentStep] = useState(0)

  function goToStep(step: number) {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)))
  }

  function nextStep() {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const progress = totalSteps <= 1 ? 100 : (currentStep / (totalSteps - 1)) * 100

  return {
    currentStep,
    totalSteps,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    goToStep,
    nextStep,
    prevStep,
    progress,
  }
}
