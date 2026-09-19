import type { StudentProfile } from '../context/StudentContext'

export const STORAGE_KEY = 'checkjai_student_profile'

export function getStudentProfile(): StudentProfile | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StudentProfile
  } catch {
    // Ignore error
  }
  return null
}

export function getStudentId(): string | null {
  const profile = getStudentProfile()
  return profile?.student_id ?? null
}

export function setStudentId(id: string) {
  const current = getStudentProfile() || {
    student_id: id,
    full_name: '',
    faculty: '',
    major: '',
    year_level: '',
  }
  current.student_id = id
  setStudentProfile(current)
}

export function getStudentFullName(): string | null {
  const profile = getStudentProfile()
  return profile?.full_name ?? null
}

export function setStudentFullName(fullName: string) {
  const current = getStudentProfile()
  if (current) {
    current.full_name = fullName
    setStudentProfile(current)
  }
}

export function setStudentProfile(profile: StudentProfile) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function clearStudentAuth() {
  sessionStorage.removeItem(STORAGE_KEY)
}
