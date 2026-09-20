import type { StudentProfile } from '../context/StudentContext'

export const TEST_PROGRESS_KEY = 'checkjai_test_progress'

export interface TestProgressData {
  student: StudentProfile | null
  stage: 'eq' | 'dass'
  currentStep: number
  eqAnswers: (number | null)[]
  dassAnswers: (number | null)[]
  answers?: (number | null)[]
  updatedAt: number
}

/**
 * SSR/Hydration safe check for window.localStorage
 */
export function isLocalStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * Get current saved test progress from localStorage
 */
export function getTestProgress(): TestProgressData | null {
  if (!isLocalStorageAvailable()) return null
  try {
    const raw = window.localStorage.getItem(TEST_PROGRESS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TestProgressData
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (err) {
    console.warn('Failed to parse test progress from localStorage:', err)
  }
  return null
}

/**
 * Save test progress to localStorage (key: checkjai_test_progress)
 */
export function saveTestProgress(update: Partial<TestProgressData>): void {
  if (!isLocalStorageAvailable()) return
  try {
    const existing = getTestProgress()
    const activeStage = update.stage ?? existing?.stage ?? 'eq'
    const eqAnswers = update.eqAnswers ?? existing?.eqAnswers ?? []
    const dassAnswers = update.dassAnswers ?? existing?.dassAnswers ?? []

    const payload: TestProgressData = {
      student: update.student ?? existing?.student ?? null,
      stage: activeStage,
      currentStep: update.currentStep ?? existing?.currentStep ?? 0,
      eqAnswers,
      dassAnswers,
      answers: activeStage === 'dass' ? dassAnswers : eqAnswers,
      updatedAt: Date.now(),
    }

    window.localStorage.setItem(TEST_PROGRESS_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('Failed to save test progress to localStorage:', err)
  }
}

/**
 * Remove test progress from localStorage upon successful submission
 */
export function clearTestProgress(): void {
  if (!isLocalStorageAvailable()) return
  try {
    window.localStorage.removeItem(TEST_PROGRESS_KEY)
  } catch (err) {
    console.warn('Failed to clear test progress from localStorage:', err)
  }
}
