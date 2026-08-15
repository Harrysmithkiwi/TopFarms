import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWizard } from '@/hooks/useWizard'

// Test intent — the P1 draft-resume defect found by the impeccable critique, 2026-08-15.
//
// useWizard used to take an `initialStep` option, read only inside useState's initialiser.
// Every caller resolves its resume step from an async fetch — i.e. always AFTER first
// render — so the option silently did nothing for the one job it existed to do. Two of the
// three callers had independently worked around it by also calling goToStep; PostJob had
// not, so every employer resuming a job draft was dropped back to step 1.
//
// The option is gone. goToStep is the single resume path, and it must work when called
// after mount, which is the only time any caller actually calls it.

describe('useWizard — resume after mount', () => {
  it('starts at 0 and moves when goToStep is called after render', () => {
    const { result } = renderHook(() => useWizard({ totalSteps: 8 }))

    expect(result.current.currentStep).toBe(0)
    expect(result.current.isFirstStep).toBe(true)

    // The async-fetch case: resume resolved well after the first render.
    act(() => result.current.goToStep(1))

    expect(result.current.currentStep).toBe(1)
    expect(result.current.isFirstStep).toBe(false)
  })

  it('clamps out-of-range resume targets instead of stranding the wizard', () => {
    const { result } = renderHook(() => useWizard({ totalSteps: 8 }))

    act(() => result.current.goToStep(99))
    expect(result.current.currentStep).toBe(7)
    expect(result.current.isLastStep).toBe(true)

    act(() => result.current.goToStep(-5))
    expect(result.current.currentStep).toBe(0)
  })

  it('keeps the resumed position across an unrelated re-render', () => {
    const { result, rerender } = renderHook(() => useWizard({ totalSteps: 8 }))

    act(() => result.current.goToStep(3))
    rerender()

    // The old bug's shape in reverse: a re-render must not snap back to a captured value.
    expect(result.current.currentStep).toBe(3)
  })

  it('advances and retreats from the resumed position', () => {
    const { result } = renderHook(() => useWizard({ totalSteps: 8 }))

    act(() => result.current.goToStep(4))
    act(() => result.current.nextStep())
    expect(result.current.currentStep).toBe(5)

    act(() => result.current.prevStep())
    expect(result.current.currentStep).toBe(4)
  })
})
