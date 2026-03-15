import { useState } from 'react'

interface UseWizardOptions {
  totalSteps: number
  initialStep?: number
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
 */
export function useWizard({ totalSteps, initialStep = 0 }: UseWizardOptions): UseWizardReturn {
  const [currentStep, setCurrentStep] = useState(
    Math.max(0, Math.min(initialStep, totalSteps - 1)),
  )

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
