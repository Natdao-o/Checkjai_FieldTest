import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useStudent } from '../context/StudentContext'

export default function StudentGuard({ children }: { children: ReactNode }) {
  const { isIdentified } = useStudent()
  const location = useLocation()

  if (!isIdentified) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
