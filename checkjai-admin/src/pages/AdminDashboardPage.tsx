import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { calculateOverallRiskStatus, getStatusBadgeStyle } from '../lib/dass21Score'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts'
import '../../src/style.css'

type DashboardStats = {
  totalSubmissions: number
  avgScores: { d: number; a: number; s: number; eq: number }
  distribution: { name: string; value: number }[]
  trends: { name: string; Depression: number; Anxiety: number; Stress: number }[]
  topFaculty: string
  facultyAverages?: { name: string; Depression: number; Anxiety: number; Stress: number }[]
  riskStudents?: {
    student_id: string
    full_name: string
    faculty: string
    status: string
    d_score: number
    a_score: number
    s_score: number
  }[]
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#b91c1c', '#7f1d1d']

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [faculties, setFaculties] = useState<string[]>([])
  const [majors, setMajors] = useState<string[]>([])
  const [facultyMajorMap, setFacultyMajorMap] = useState<Record<string, string[]>>({})

  const [loading, setLoading] = useState(false)
  const [faculty, setFaculty] = useState('')
  const [major, setMajor] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      // Query test_results joined with students directly via Supabase Client
      let { data, error } = await supabase
        .from('test_results')
        .select(`
          id,
          student_id,
          stress_level,
          dass_score,
          eq_score,
          raw_answers,
          created_at,
          students (
            full_name,
            faculty,
            major,
            year_level
          )
        `)
        .order('created_at', { ascending: false })

      // Fallback to supabaseAdmin if unauthenticated RLS returns empty array []
      if ((!data || data.length === 0) && !error) {
        const adminRes = await supabaseAdmin
          .from('test_results')
          .select(`
            id,
            student_id,
            stress_level,
            dass_score,
            eq_score,
            raw_answers,
            created_at,
            students (
              full_name,
              faculty,
              major,
              year_level
            )
          `)
          .order('created_at', { ascending: false })

        if (adminRes.data && adminRes.data.length > 0) {
          data = adminRes.data
          error = adminRes.error
        }
      }

      if (error) {
        console.error('Error fetching dashboard data:', error.message)
        setLoading(false)
        return
      }

      const rows = (data || []).map((row: any) => {
        const studentInfo = Array.isArray(row.students) ? row.students[0] : row.students
        const dass = row.dass_score || {}
        const eq = row.eq_score || {}

        return {
          id: row.id,
          student_id: row.student_id || '-',
          full_name: studentInfo?.full_name || row.student_id || '-',
          faculty: studentInfo?.faculty || 'ไม่ระบุคณะ',
          major: studentInfo?.major || 'ไม่ระบุสาขา',
          year_level: studentInfo?.year_level || '-',
          stress_level: row.stress_level || 'ปกติ',
          d_score: Number(dass.depression ?? 0),
          a_score: Number(dass.anxiety ?? 0),
          s_score: Number(dass.stress ?? 0),
          eq_total: Number(eq.total ?? 0),
          created_at: row.created_at,
        }
      })

      // Build Faculty and Major options
      const facSet = new Set<string>()
      const majSet = new Set<string>()
      const facMajMap: Record<string, string[]> = {}

      rows.forEach((r) => {
        if (r.faculty && r.faculty !== 'ไม่ระบุคณะ') {
          facSet.add(r.faculty)
          if (!facMajMap[r.faculty]) facMajMap[r.faculty] = []
          if (r.major && r.major !== 'ไม่ระบุสาขา' && !facMajMap[r.faculty].includes(r.major)) {
            facMajMap[r.faculty].push(r.major)
          }
        }
        if (r.major && r.major !== 'ไม่ระบุสาขา') majSet.add(r.major)
      })

      setFaculties(Array.from(facSet).sort())
      setMajors(Array.from(majSet).sort())
      setFacultyMajorMap(facMajMap)

      // Filter rows by user selections
      const filtered = rows.filter((r) => {
        if (faculty && r.faculty !== faculty) return false
        if (major && r.major !== major) return false
        return true
      })

      const totalSubmissions = filtered.length

      // Average Scores
      const sumD = filtered.reduce((acc, r) => acc + r.d_score, 0)
      const sumA = filtered.reduce((acc, r) => acc + r.a_score, 0)
      const sumS = filtered.reduce((acc, r) => acc + r.s_score, 0)
      const sumEQ = filtered.reduce((acc, r) => acc + r.eq_total, 0)

      const avgScores = {
        d: totalSubmissions ? sumD / totalSubmissions : 0,
        a: totalSubmissions ? sumA / totalSubmissions : 0,
        s: totalSubmissions ? sumS / totalSubmissions : 0,
        eq: totalSubmissions ? sumEQ / totalSubmissions : 0,
      }

      // Risk Distribution
      const distMap: Record<string, number> = {
        'ปกติ (Normal)': 0,
        'เล็กน้อย (Mild)': 0,
        'ปานกลาง (Moderate)': 0,
        'รุนแรง (Severe)': 0,
        'รุนแรงมาก (Extremely Severe)': 0,
      }

      filtered.forEach((r) => {
        const lvl = r.stress_level
        if (lvl.includes('รุนแรงมาก') || r.s_score >= 34) {
          distMap['รุนแรงมาก (Extremely Severe)']++
        } else if (lvl.includes('รุนแรง') || r.s_score >= 26) {
          distMap['รุนแรง (Severe)']++
        } else if (lvl.includes('ปานกลาง') || r.s_score >= 15) {
          distMap['ปานกลาง (Moderate)']++
        } else if (lvl.includes('เล็กน้อย') || r.s_score >= 10) {
          distMap['เล็กน้อย (Mild)']++
        } else {
          distMap['ปกติ (Normal)']++
        }
      })

      const distribution = Object.entries(distMap).map(([name, value]) => ({ name, value }))

      // Faculty Averages
      const facStatsMap: Record<string, { d: number; a: number; s: number; count: number }> = {}
      filtered.forEach((r) => {
        if (!facStatsMap[r.faculty]) {
          facStatsMap[r.faculty] = { d: 0, a: 0, s: 0, count: 0 }
        }
        facStatsMap[r.faculty].d += r.d_score
        facStatsMap[r.faculty].a += r.a_score
        facStatsMap[r.faculty].s += r.s_score
        facStatsMap[r.faculty].count += 1
      })

      const facultyAverages = Object.entries(facStatsMap).map(([facName, fStats]) => ({
        name: facName,
        Depression: Number((fStats.d / fStats.count).toFixed(1)),
        Anxiety: Number((fStats.a / fStats.count).toFixed(1)),
        Stress: Number((fStats.s / fStats.count).toFixed(1)),
      }))

      // Top Highest Risk Faculty
      let topFaculty = '-'
      let maxStressAvg = -1
      facultyAverages.forEach((fa) => {
        if (fa.Stress > maxStressAvg) {
          maxStressAvg = fa.Stress
          topFaculty = fa.name
        }
      })

      // Historical Trends (Grouped by Month/Week)
      const trendMap: Record<string, { d: number; a: number; s: number; count: number }> = {}
      filtered.forEach((r) => {
        const dObj = new Date(r.created_at)
        const dateKey = `${dObj.getMonth() + 1}/${dObj.getFullYear()}`
        if (!trendMap[dateKey]) {
          trendMap[dateKey] = { d: 0, a: 0, s: 0, count: 0 }
        }
        trendMap[dateKey].d += r.d_score
        trendMap[dateKey].a += r.a_score
        trendMap[dateKey].s += r.s_score
        trendMap[dateKey].count += 1
      })

      const trends = Object.entries(trendMap).map(([key, value]) => ({
        name: key,
        Depression: Number((value.d / value.count).toFixed(1)),
        Anxiety: Number((value.a / value.count).toFixed(1)),
        Stress: Number((value.s / value.count).toFixed(1)),
      }))

      // Risk Students
      const riskStudents = filtered
        .filter((r) => r.d_score >= 10 || r.a_score >= 8 || r.s_score >= 15 || (r.stress_level && !r.stress_level.includes('ปกติ')))
        .map((r) => {
          const riskInfo = calculateOverallRiskStatus(r.d_score, r.a_score, r.s_score, r.stress_level)
          return {
            student_id: r.student_id,
            full_name: r.full_name,
            faculty: r.faculty,
            status: riskInfo.status,
            d_score: r.d_score,
            a_score: r.a_score,
            s_score: r.s_score,
          }
        })

      setStats({
        totalSubmissions,
        avgScores,
        distribution,
        trends: trends.length ? trends : [{ name: 'ปัจจุบัน', Depression: avgScores.d, Anxiety: avgScores.a, Stress: avgScores.s }],
        topFaculty,
        facultyAverages,
        riskStudents,
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [faculty, major])

  return (
    <div className="aj-searchPage aj-admin-theme">
      <header className="aj-searchHeader">
        <h1 className="aj-searchTitle">Dashboard สถิติสุขภาพจิตนักศึกษา</h1>
      </header>

      {/* Filters Bar */}
      <section className="aj-searchPanel" style={{ marginBottom: '24px' }}>
        <div className="aj-searchGrid">
          <label className="aj-searchField">
            <span>คณะ</span>
            <select
              value={faculty}
              onChange={(e) => {
                setFaculty(e.target.value)
                setMajor('')
              }}
              className="aj-searchSelect"
            >
              <option value="">ทั้งหมดทุกคณะ</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="aj-searchField">
            <span>สาขาวิชา</span>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="aj-searchSelect"
            >
              <option value="">ทั้งหมดทุกสาขาวิชา</option>
              {(faculty ? facultyMajorMap[faculty] || [] : majors).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Metric Cards */}
      <div
        className="aj-dashGrid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        <div className="aj-searchPanel" style={{ margin: 0, padding: '30px', borderLeft: '6px solid #334155' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            จำนวนประเมินทั้งหมด
          </p>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', marginTop: '10px' }}>
            {stats?.totalSubmissions ?? 0} <small style={{ fontSize: '18px', fontWeight: 400 }}>รายการ</small>
          </h2>
        </div>

        <div className="aj-searchPanel" style={{ margin: 0, padding: '30px', borderLeft: '6px solid #10b981' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ระดับความเครียดเฉลี่ย (Stress)
          </p>
          <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', marginTop: '10px' }}>
            {stats?.avgScores?.s.toFixed(1) ?? '0.0'}
          </h2>
        </div>

        <div className="aj-searchPanel" style={{ margin: 0, padding: '30px', borderLeft: '6px solid #ef4444' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            คณะที่มีระดับความเสี่ยงสูงที่สุด
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#991b1b', marginTop: '10px' }}>
            {stats?.topFaculty ?? '-'}
          </h2>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Trend Chart */}
        <section className="aj-searchPanel" style={{ margin: 0, height: '480px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#1e293b' }}>
            แนวโน้มระดับสุขภาพจิต (Historical Trend)
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={stats?.trends ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickMargin={12} />
              <YAxis fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={40} iconType="circle" />
              <Line type="monotone" dataKey="Depression" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Anxiety" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Stress" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Risk Level Distribution (Pie Chart) */}
        <section className="aj-searchPanel" style={{ margin: 0, height: '480px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#1e293b' }}>
            สัดส่วนกลุ่มเสี่ยง (Risk Distribution)
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={stats?.distribution ?? []}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={8}
                dataKey="value"
                label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
              >
                {stats?.distribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={40} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </section>

        {/* Faculty Comparison (Bar Chart) */}
        <section className="aj-searchPanel" style={{ margin: 0, height: '480px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#1e293b' }}>
            เปรียบเทียบคะแนนเฉลี่ยแยกตามคณะ (Faculty Comparison)
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={stats?.facultyAverages ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Legend verticalAlign="top" height={40} />
              <Bar dataKey="Depression" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Anxiety" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Stress" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Risk Students Table */}
      <section className="aj-searchPanel" style={{ margin: 0, marginTop: '24px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: '#1e293b' }}>
          รายชื่อนักศึกษากลุ่มเสี่ยง (Risk Students)
        </h3>

        {!stats?.riskStudents || stats.riskStudents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            ไม่พบนักศึกษาในกลุ่มเสี่ยงในฟิลเตอร์ที่เลือก
          </div>
        ) : (
          <table className="aj-searchTable">
            <thead>
              <tr>
                <th>รหัสนักศึกษา</th>
                <th>ชื่อ-นามสกุล</th>
                <th>คณะ</th>
                <th>คะแนน D/A/S</th>
                <th>สถานะความเสี่ยง</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {stats.riskStudents.map((student, idx) => (
                <tr key={`${student.student_id}-${idx}`}>
                  <td>{student.student_id}</td>
                  <td>{student.full_name}</td>
                  <td>{student.faculty}</td>
                  <td style={{ color: '#64748b' }}>
                    D:{student.d_score} / A:{student.a_score} / S:{student.s_score}
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: getStatusBadgeStyle(student.status).backgroundColor,
                        color: getStatusBadgeStyle(student.status).color,
                      }}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/search/${encodeURIComponent(student.student_id)}/history`)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              padding: '20px 40px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            กำลังดึงข้อมูล Analytics...
          </div>
        </div>
      )}
    </div>
  )
}
