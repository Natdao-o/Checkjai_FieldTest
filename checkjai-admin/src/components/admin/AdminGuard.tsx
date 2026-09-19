import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CHECKJAI_TEACHER_TOKEN_KEY } from '../../lib/teacherSession'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const hasLocalToken = Boolean(sessionStorage.getItem(CHECKJAI_TEACHER_TOKEN_KEY))

    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session) || hasLocalToken)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session) || Boolean(sessionStorage.getItem(CHECKJAI_TEACHER_TOKEN_KEY)))
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1139',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 600,
        }}
      >
        กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
