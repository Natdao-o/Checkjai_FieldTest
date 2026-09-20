import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getTestProgress, saveTestProgress } from '../lib/testProgress'

export interface StudentProfile {
  student_id: string
  full_name: string
  faculty: string
  major: string
  year_level: string
}

const STORAGE_KEY = 'checkjai_student_profile'

interface StudentContextType {
  student: StudentProfile | null
  setStudent: (profile: StudentProfile) => void
  clearStudent: () => void
  isIdentified: boolean
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [student, setStudentState] = useState<StudentProfile | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw) as StudentProfile
      }
      const progress = getTestProgress()
      if (progress?.student?.student_id) {
        return progress.student
      }
    } catch {
      // Ignore parse error
    }
    return null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (student) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(student))
      saveTestProgress({ student })
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [student])

  const setStudent = (profile: StudentProfile) => {
    setStudentState(profile)
    saveTestProgress({ student: profile })
  }

  const clearStudent = () => {
    setStudentState(null)
  }

  return (
    <StudentContext.Provider
      value={{
        student,
        setStudent,
        clearStudent,
        isIdentified: Boolean(student?.student_id?.trim()),
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const context = useContext(StudentContext)
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider')
  }
  return context
}
