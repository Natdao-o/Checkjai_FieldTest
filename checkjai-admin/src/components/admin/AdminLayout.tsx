import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  CHECKJAI_TEACHER_STORAGE_KEY,
  clearTeacherSession,
} from '../../lib/teacherSession'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem(CHECKJAI_TEACHER_STORAGE_KEY) ?? ''
  )
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        const username = data.user.email.split('@')[0]
        setDisplayName(username)
        sessionStorage.setItem(CHECKJAI_TEACHER_STORAGE_KEY, username)
      }
    })
  }, [])

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch {
      /* ignore */
    }
    clearTeacherSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="aj-dash relative">
      {/* Mobile Header (Visible only on small screens) */}
      <div className="md:hidden flex items-center justify-between bg-[#0b1139] text-white px-4 py-3 sticky top-0 z-[60] shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#0b1139] font-bold">CJ</span>
          </div>
          <span className="font-bold text-lg">Admin</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[50] md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`aj-dashSidebar fixed md:relative inset-y-0 left-0 z-[55] md:z-auto transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out w-[280px] md:w-auto h-full overflow-y-auto`}
        aria-label="เมนูผู้ดูแล"
      >
        <nav className="aj-dashNav">
          <NavLink
            to="/admin/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `aj-dashNavLink ${isActive ? 'is-active' : ''}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/search"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `aj-dashNavLink ${isActive ? 'is-active' : ''}`}
          >
            Search / Directory
          </NavLink>
          <NavLink
            to="/admin/semester-settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `aj-dashNavLink ${isActive ? 'is-active' : ''}`}
          >
            Semester Settings
          </NavLink>
        </nav>
        <div className="aj-dashSidebarFoot">
          <p className="aj-dashUser">{displayName || 'อาจารย์ / ผู้ดูแล'}</p>
          <button type="button" className="aj-dashLogout" onClick={logout}>
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="aj-dashMain min-w-0 p-4 sm:p-6 md:p-10">
        <Outlet />
      </div>
    </div>
  )
}
